// مكنة فيديوهات وصور فرح — بتشتغل على الكمبيوتر السحابي (GitHub Actions) كل ساعة وتحفظ على R2 (farah-media).
//   node tools/factory.mjs [--only code0013,<offerId>,<couponId>] [--limit 5] [--shard 1/4] [--force] [--dry] [--upload]
//                          [--skip-reels] [--skip-promo] [--types product-image,offer-reel,offer-image,coupon-reel,coupon-image]
//   node tools/factory.mjs --plan [--only …] [--force]   ← بيحسب بس فيه شغل ولا لأ (بيكتب render=yes|no و index=yes|no لـ GitHub)
//   node tools/factory.mjs --merge <dir> [--upload]       ← بيدمج نتايج الأجهزة في الفهرسين
// 1) ريل لكل منتج منشور (≈17 ث طولي، من غير صوت، الكلام على الإيقاع) — lib/reel.mjs
//    الفهرس videos/reels/index.json (اللوحة وطابور النشر بيقروه) — شكله ماتغيرش. الملفات: videos/reels/<code>/<sig>.mp4|.jpg|-sheet.jpg
// 2) محتوى النشر المجدول — lib/promo.mjs، والفهرس العام promo/index.json. الملفات: promo/<type>/<id>/<sig>.jpg|.mp4
//    - product-image: صورة إعلان 4:5 لكل منتج بسعره الحالي (قالب الخصم لو عليه خصم، وإلا قالب المنتج)
//    - offer-reel + offer-image: لكل منتج (6 بالكتير) في عرض سعر شغّال أو هيبدأ خلال يومين
//    - coupon-reel + coupon-image: لكل كوبون دعائي (promoCoupons في /api/store-data، لو موجودة)
//    العروض والكوبونات اللي خلصت أو اتشالت بتتشال من الفهرس في الدمج.
// - البيانات من /api/store-data (نسخة المتجر المحفوظة — مفيش قراية من Firestore).
// - الكلام من copy/reels.json (بنك Antigravity) لو موجود، وإلا من صفحة المنتج.
// - لقطات الاستخدام من مكتبة Pexels اللي على R2 (stock/<group>/…) حسب مجموعة المنتج؛ اللقطات الحساسة مابتدخلش.
// - بصمة (sig) لكل فيديو وصورة (السعر + العرض + الكلام + الصور): اللي ماتغيرش مابيتعملش تاني، وتغيير السعر بيطلع صورة وريل جداد لوحدهم.
// - الأجهزة (--shard): الريلز بالترتيب، ومحتوى النشر بالمفتاح — مفيش حاجة بتتعمل مرتين.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.mjs';
import { refresh } from '../lib/data.mjs';
import { buildReel, reelSig, priceOf, TRACKS } from '../lib/reel.mjs';
import { planPromo, inShard, promoEntry, mergePromoIndex, PROMO_INDEX, PROMO_TYPES } from '../lib/promo.mjs';

const SITE = 'https://farahegypt.com';
// أي خطأ بيطلع كملاحظة في GitHub (annotation) عشان يتقري من غير صلاحيات
const oneLine = (e, n = 900) => String((e && (e.stack || e.message)) || e).split('\n').join(' | ').slice(0, n);
const annotate = e => console.log(`::error title=factory::${oneLine(e)}`);
process.on('uncaughtException', e => { annotate(e); process.exit(1); });
process.on('unhandledRejection', e => { annotate(e); process.exit(1); });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const list = k => String(arg(k, '') || '').split(',').map(s => s.trim()).filter(Boolean);
const ONLY = list('only');
const TYPES = list('types').filter(t => PROMO_TYPES.includes(t));
const LIMIT = Number(arg('limit', 0)) || 0;
const [SH, SN] = String(arg('shard', '1/1')).split('/').map(Number);
const FORCE = !!arg('force', false), DRY = !!arg('dry', false), UPLOAD = !!arg('upload', false), PLAN = !!arg('plan', false);
const SKIP_REELS = !!arg('skip-reels', false), SKIP_PROMO = !!arg('skip-promo', false);
const OUT = path.join(ROOT, 'out', 'factory');
const INDEX_KEY = 'videos/reels/index.json'; // عام (بيتقري بـ ?t= عشان الكاش) — فيه لينكات الفيديوهات وكلام البوست بس
const BUCKET = process.env.MEDIA_BUCKET || 'farah-media';

async function r2() { return import('../../scripts/storage.mjs'); }
async function put(key, file, type) { const { putFileTo } = await r2(); await putFileTo(BUCKET, key, fs.readFileSync(file), type); }

// الفهرس من R2 على السحابة؛ وعلى الجهاز: النسخة العامة من الموقع (قراية بس)، وإلا آخر نسخة محلية
async function readJson(key, local) {
  if (process.env.R2_ACCESS_KEY_ID) { const { getJsonFrom } = await r2(); return getJsonFrom(BUCKET, key, { items: {} }); }
  try { const r = await fetch(`${SITE}/media/${key}?t=${Date.now()}`); if (r.ok) return await r.json(); } catch {}
  try { return JSON.parse(fs.readFileSync(path.join(OUT, local), 'utf8')); } catch { return { items: {} }; }
}
const readIndex = () => readJson(INDEX_KEY, 'index.json');
const readPromoIndex = () => readJson(PROMO_INDEX, 'promo-index.json');

// مكتبة Pexels: خريطة الملفات اللي اترفعت (فرع media-fixes العام) + مجموعات المنتجات واللقطات الحساسة (catalog/media-fixes.json)
async function stockFor() {
  const plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, '..', 'catalog', 'media-fixes.json'), 'utf8'));
  let map = {};
  try { map = (await (await fetch('https://raw.githubusercontent.com/alaahesham1989-dev/farah-media-pipeline/media-fixes/media-fixes.json')).json()).stock || {}; } catch {}
  const flagged = new Set([...(plan.stockFlags?.ids || []), ...(plan.stockClinical?.ids || [])].map(String));
  const byCode = {};
  for (const [key, v] of Object.entries(map)) {
    for (const code of plan.stockGroups?.[v.group] || []) (byCode[code] = byCode[code] || []).push({ url: `${SITE}/media/${key}`, id: v.id, dur: v.dur, sensitive: flagged.has(String(v.id)) });
  }
  for (const k of Object.keys(byCode)) byCode[k].sort((a, b) => (b.dur || 0) - (a.dur || 0));
  return byCode;
}

function copyBank() {
  try { const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'copy', 'reels.json'), 'utf8')); return Object.fromEntries((Array.isArray(a) ? a : []).map(c => [c.code, c])); } catch { return {}; }
}

// صورة ملخص للفيديو: 8 لقطات في صورة واحدة (~80 كيلو) — المالك بيراجع منها من غير ما يصرف نت على تشغيل الفيديو
async function makeSheet(file, out) {
  const { execFileSync } = await import('node:child_process');
  const { durationOf } = await import('../lib/video.mjs');
  const { default: ff } = await import('ffmpeg-static');
  const d = Math.max(4, durationOf(file) || 16);
  execFileSync(ff, ['-v', 'error', '-y', '-ss', '0.4', '-i', file, '-vf', `fps=${(8 / (d - 0.4)).toFixed(4)},scale=180:-2,tile=4x2:padding=4:color=white`, '-frames:v', '1', '-q:v', '5', out]);
  return out;
}

if (arg('merge', false)) {
  // دمج نتايج الأجهزة (shards): results-*.json → فهرس الريلز، promo-*.json → فهرس النشر
  const dir = String(arg('merge'));
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const idx = await readIndex();
  for (const f of files.filter(f => f.startsWith('results-'))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const it of r.items || []) idx.items[it.code] = { ...(idx.items[it.code] || {}), ...it };
  }
  idx.at = new Date().toISOString();
  if (UPLOAD) { const { putFileTo } = await r2(); await putFileTo(BUCKET, INDEX_KEY, JSON.stringify(idx), 'application/json'); }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(idx, null, 1));
  console.log(`✅ فهرس الريلز فيه ${Object.keys(idx.items).length} فيديو`);

  // فهرس النشر: اللي المفروض يبقى موجود دلوقتي (من بيانات المتجر) وليه ملف ببصمته
  const fresh = files.filter(f => f.startsWith('promo-')).flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items || []);
  const pidx = await readPromoIndex();
  let wanted = null;
  try { wanted = planPromo(await refresh(), { bank: copyBank() }); } catch (e) { console.log(`⚠️ بيانات المتجر مش متاحة — هنشيل اللي خلص بس: ${e.message}`); }
  const { index, dropped } = mergePromoIndex(pidx, fresh, wanted);
  if (UPLOAD) { const { putJsonTo } = await r2(); await putJsonTo(BUCKET, PROMO_INDEX, index); }
  fs.writeFileSync(path.join(OUT, 'promo-index.json'), JSON.stringify(index, null, 1));
  console.log(`✅ فهرس النشر فيه ${Object.keys(index.items).length} (جديد ${fresh.length}، اتشال ${dropped.length}${dropped.length ? ': ' + dropped.slice(0, 12).join(' ') : ''})`);
  process.exit(0);
}

const store = await refresh();
const bank = copyBank();
fs.mkdirSync(path.join(OUT, 'promo'), { recursive: true });

// ─── 1) الريلز ───────────────────────────────────────────────────────────
const index = SKIP_REELS ? { items: {} } : await readIndex();
const stock = SKIP_REELS ? {} : await stockFor();
let todo = SKIP_REELS ? [] : store.products.filter(p => !ONLY.length || ONLY.includes(p.id)).sort((a, b) => a.id.localeCompare(b.id));
todo = todo.filter((p, i) => PLAN || (i % SN) === (SH - 1));
const plan = [];
for (const p of todo) {
  const copy = bank[p.id] || null;
  const st = stock[p.id] || [];
  const sig = reelSig(p, copy, priceOf(p, store.offers), st);
  if (!FORCE && index.items?.[p.id]?.sig === sig) continue;
  plan.push({ p, copy, st, sig, variant: Number(p.id.replace(/\D/g, '')) % TRACKS.length });
}
const run = LIMIT ? plan.slice(0, LIMIT) : plan;

// ─── 2) محتوى النشر ────────────────────────────────────────────────────────
const pidx = SKIP_PROMO ? { items: {} } : await readPromoIndex();
const wanted = SKIP_PROMO ? [] : planPromo(store, { bank });
const picked = w => (!ONLY.length || ONLY.some(x => x === w.code || x === w.offerId || x === w.couponId || x === w.key)) && (!TYPES.length || TYPES.includes(w.type));
let promoPlan = wanted.filter(w => picked(w) && (PLAN || inShard(w.key, SH, SN)) && (FORCE || pidx.items?.[w.key]?.sig !== w.sig));
const promoRun = LIMIT ? promoPlan.slice(0, LIMIT) : promoPlan;

if (PLAN) {
  // على السحابة: لو مفيش حاجة تتعمل ولا تتشال، الأجهزة والفهرس مابيقوموش أصلاً (الشغل كل ساعة يفضل رخيص)
  const keys = new Set(wanted.map(w => w.key));
  const stale = Object.keys(pidx.items || {}).filter(k => !keys.has(k));
  const text = wanted.filter(w => { const it = pidx.items?.[w.key]; return it && it.sig === w.sig && (it.caption !== w.caption || it.title !== w.title || JSON.stringify(it.window || null) !== JSON.stringify(w.window || null)); });
  const sheets = todo.filter(p => { const it = index.items?.[p.id]; return it?.url && !it.sheet; });
  const render = plan.length + promoPlan.length + sheets.length > 0;
  const needIndex = render || stale.length + text.length > 0;
  console.log(`🧮 ريلز: ${plan.length} — نشر: ${promoPlan.length} (${[...new Set(promoPlan.map(w => w.type))].join('، ') || 'مفيش'}) — صور ملخص: ${sheets.length} — تتشال: ${stale.length} — كلام اتغير: ${text.length}`);
  for (const w of promoPlan.slice(0, 20)) console.log(`   • ${w.key} — ${w.note}`);
  console.log(`▶ render=${render ? 'yes' : 'no'} index=${needIndex ? 'yes' : 'no'}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `render=${render ? 'yes' : 'no'}\nindex=${needIndex ? 'yes' : 'no'}\n`);
  process.exit(0);
}

console.log(`🎬 ${store.products.length} منتج منشور — ${todo.length} في الجهاز ده — ${plan.length} محتاجين فيديو جديد — هيتعمل ${run.length}`);
console.log(`🖼️ محتوى النشر: ${wanted.length} مطلوب — ${promoPlan.length} محتاجين يتعملوا في الجهاز ده — هيتعمل ${promoRun.length}`);

const results = [];
const promoResults = [];
if ((run.length || promoRun.length) && !DRY) {
  const { startServer, renderJobs } = await import('../server.mjs');
  const { makeVideo, durationOf } = await import('../lib/video.mjs');
  const srv = await startServer(0);
  const baseUrl = srv.url;
  for (const { p, copy, st, sig, variant } of run) {
    const track = TRACKS[variant];
    const { storyboard, meta } = buildReel(p, { copy, stock: st, offers: store.offers, track, variant });
    fs.writeFileSync(path.join(OUT, `${p.id}.storyboard.json`), JSON.stringify(storyboard, null, 1));
    try {
      const file = await makeVideo(baseUrl, storyboard, { store, onLog: () => {} });
      const poster = file.replace(/\.mp4$/, '.jpg');
      const item = { ...meta, sig, kind: 'reel', format: 'story', dur: +durationOf(file).toFixed(1), at: new Date().toISOString(), file: path.relative(ROOT, file) };
      if (UPLOAD) {
        const key = `videos/reels/${p.id}/${sig}`;
        await put(key + '.mp4', file, 'video/mp4');
        if (fs.existsSync(poster)) await put(key + '.jpg', poster, 'image/jpeg');
        item.url = `/media/${key}.mp4`; item.poster = `/media/${key}.jpg`;
        try {
          const sheet = await makeSheet(file, file.replace(/\.mp4$/, '-sheet.jpg'));
          await put(key + '-sheet.jpg', sheet, 'image/jpeg');
          item.sheet = `/media/${key}-sheet.jpg`;
        } catch (e) { console.log(`⚠️ صورة الملخص ${p.id}: ${e.message}`); }
      }
      results.push(item);
      console.log(`✅ ${p.id} ${p.name} — ${path.basename(file)}`);
    } catch (e) { console.log(`❌ ${p.id}: ${e.message}`); console.log(`::warning title=${p.id}::${oneLine(e, 600)}`); }
  }

  // محتوى النشر: الصور بالمسرح (JPEG 1080×1350)، والريلز بنفس محرك الفيديو
  for (const w of promoRun) {
    const key = `promo/${w.type}/${w.dir}/${w.sig}`;
    const media = { at: new Date().toISOString() };
    try {
      if (w.kind === 'image') {
        const [f] = await renderJobs(baseUrl, [{ ...w.job, name: `${w.type}-${w.dir}` }], { dir: 'promo', ext: 'jpg' });
        media.file = path.relative(ROOT, f.file);
        if (UPLOAD) { await put(key + '.jpg', f.file, 'image/jpeg'); media.url = `/media/${key}.jpg`; }
      } else {
        const file = path.resolve(ROOT, await makeVideo(baseUrl, w.storyboard, { store, onLog: () => {} }));
        media.file = path.relative(ROOT, file);
        const poster = file.replace(/\.mp4$/, '.jpg');
        let sheet = null;
        try { sheet = await makeSheet(file, file.replace(/\.mp4$/, '-sheet.jpg')); } catch (e) { console.log(`⚠️ صورة الملخص ${w.key}: ${e.message}`); }
        if (UPLOAD) {
          await put(key + '.mp4', file, 'video/mp4'); media.url = `/media/${key}.mp4`;
          if (fs.existsSync(poster)) { await put(key + '.jpg', poster, 'image/jpeg'); media.poster = `/media/${key}.jpg`; }
          if (sheet) { await put(key + '-sheet.jpg', sheet, 'image/jpeg'); media.sheet = `/media/${key}-sheet.jpg`; }
        }
      }
      promoResults.push({ ...promoEntry(w, media), ...(UPLOAD ? {} : { file: media.file }) });
      console.log(`✅ ${w.key} — ${w.title} — ${media.url || media.file}`);
    } catch (e) { console.log(`❌ ${w.key}: ${e.message}`); console.log(`::warning title=${w.key}::${oneLine(e, 600)}`); }
  }
  if (srv?.close) await srv.close();
} else if (DRY) {
  for (const { p, copy, st, variant } of run) {
    const { storyboard, meta } = buildReel(p, { copy, stock: st, offers: store.offers, track: TRACKS[variant], variant });
    fs.writeFileSync(path.join(OUT, `${p.id}.storyboard.json`), JSON.stringify(storyboard, null, 1));
    console.log(`📝 ${p.id} — ${storyboard.scenes.length} مشاهد، ${storyboard.scenes.reduce((a, s) => a + s.dur, 0).toFixed(1)} ث — ${meta.hook}`);
  }
  const shown = new Set();
  for (const w of promoRun) {
    const body = w.job || w.storyboard;
    fs.writeFileSync(path.join(OUT, 'promo', `${w.type}-${w.dir.replace(/\//g, '-')}.json`), JSON.stringify({ ...body, caption: w.caption }, null, 1));
    const what = w.kind === 'image' ? `${w.job.template} 4:5` : `${w.storyboard.scenes.length} مشاهد، ${w.storyboard.scenes.reduce((a, s) => a + s.dur, 0).toFixed(1)} ث، ${w.storyboard.music.split('/').pop()}`;
    console.log(`📝 ${w.key} — ${what} — ${w.note} — sig ${w.sig}${w.window ? ` — ${w.window.startsAt || '…'} → ${w.window.endsAt || '…'}` : ''}`);
    // كلام أول بوست من كل نوع (للمراجعة)
    if (!shown.has(w.type)) { shown.add(w.type); console.log(w.caption.split('\n').map(l => '      ' + l).join('\n')); }
  }
}
// الفيديوهات القديمة اللي مالهاش صورة ملخص: بنسحب الفيديو من المخزن (على السحابة — مش من نت المالك) ونعملها
if (UPLOAD && !DRY) {
  const done = new Set(results.map(r => r.code));
  for (const p of todo) {
    const it = index.items?.[p.id];
    if (!it?.url || it.sheet || done.has(p.id)) continue;
    try {
      const tmp = path.join(OUT, `${p.id}-old.mp4`);
      const r = await fetch(SITE + it.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
      const sheet = await makeSheet(tmp, tmp.replace(/\.mp4$/, '-sheet.jpg'));
      const key = it.url.replace(/^\/media\//, '').replace(/\.mp4$/, '-sheet.jpg');
      await put(key, sheet, 'image/jpeg');
      results.push({ code: p.id, sheet: `/media/${key}` });
      console.log(`🖼️ ${p.id} صورة ملخص`);
    } catch (e) { console.log(`⚠️ صورة الملخص ${p.id}: ${e.message}`); }
  }
}
const stamp = new Date().toISOString();
fs.writeFileSync(path.join(OUT, `results-${SH}.json`), JSON.stringify({ at: stamp, items: results }, null, 1));
fs.writeFileSync(path.join(OUT, `promo-${SH}.json`), JSON.stringify({ at: stamp, items: promoResults }, null, 1));
