// مكنة فيديوهات فرح: ريل لكل منتج منشور (طولي، من غير صوت، على الإيقاع) — بتشتغل على الكمبيوتر السحابي وتحفظ على R2.
//   node tools/factory.mjs [--only code0013,code0020] [--limit 5] [--shard 1/4] [--force] [--dry] [--upload] [--merge dir]
// - البيانات من /api/store-data (نسخة المتجر المحفوظة — مفيش قراية من Firestore).
// - الكلام من copy/reels.json (بنك Antigravity) لو موجود، وإلا من صفحة المنتج.
// - لقطات الاستخدام من مكتبة Pexels اللي على R2 (stock/<group>/…) حسب مجموعة المنتج؛ اللقطات الحساسة مابتدخلش.
// - بصمة لكل فيديو (السعر + الكلام + الصور): المنتج اللي ماتغيرش مابيتعملش تاني. المنتج الجديد بيتعمل لوحده في أول لفّة بعد نشره.
// - --upload: الفيديو والصورة → R2 farah-media videos/reels/<code>/<sig>.mp4، والفهرس → videos/reels/index.json (اللوحة وطابور النشر بيقروه).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.mjs';
import { refresh } from '../lib/data.mjs';
import { buildReel, reelSig, priceOf, TRACKS } from '../lib/reel.mjs';

const SITE = 'https://farahegypt.com';
// أي خطأ بيطلع كملاحظة في GitHub (annotation) عشان يتقري من غير صلاحيات
const oneLine = (e, n = 900) => String((e && (e.stack || e.message)) || e).split('\n').join(' | ').slice(0, n);
const annotate = e => console.log(`::error title=factory::${oneLine(e)}`);
process.on('uncaughtException', e => { annotate(e); process.exit(1); });
process.on('unhandledRejection', e => { annotate(e); process.exit(1); });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const ONLY = String(arg('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = Number(arg('limit', 0)) || 0;
const [SH, SN] = String(arg('shard', '1/1')).split('/').map(Number);
const FORCE = !!arg('force', false), DRY = !!arg('dry', false), UPLOAD = !!arg('upload', false);
const OUT = path.join(ROOT, 'out', 'factory');
const INDEX_KEY = 'videos/reels/index.json'; // عام (بيتقري بـ ?t= عشان الكاش) — فيه لينكات الفيديوهات وكلام البوست بس
const BUCKET = process.env.MEDIA_BUCKET || 'farah-media';

async function r2() { return import('../../scripts/storage.mjs'); }

async function readIndex() {
  if (!process.env.R2_ACCESS_KEY_ID) { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')); } catch { return { items: {} }; } }
  const { getJsonFrom } = await r2();
  return getJsonFrom(BUCKET, INDEX_KEY, { items: {} });
}

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
  // دمج نتايج الأجهزة (shards) في الفهرس
  const dir = String(arg('merge'));
  const idx = await readIndex();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const it of r.items || []) idx.items[it.code] = { ...(idx.items[it.code] || {}), ...it };
  }
  idx.at = new Date().toISOString();
  if (UPLOAD) { const { putFileTo } = await r2(); await putFileTo(BUCKET, INDEX_KEY, JSON.stringify(idx), 'application/json'); }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(idx, null, 1));
  console.log(`✅ الفهرس فيه ${Object.keys(idx.items).length} فيديو`);
  process.exit(0);
}

const store = await refresh();
const bank = copyBank();
const stock = await stockFor();
const index = await readIndex();
let todo = store.products.filter(p => !ONLY.length || ONLY.includes(p.id)).sort((a, b) => a.id.localeCompare(b.id));
todo = todo.filter((p, i) => (i % SN) === (SH - 1));
const plan = [];
for (const [i, p] of todo.entries()) {
  const copy = bank[p.id] || null;
  const st = stock[p.id] || [];
  const sig = reelSig(p, copy, priceOf(p, store.offers), st);
  if (!FORCE && index.items?.[p.id]?.sig === sig) continue;
  plan.push({ p, copy, st, sig, variant: Number(p.id.replace(/\D/g, '')) % TRACKS.length });
}
const run = LIMIT ? plan.slice(0, LIMIT) : plan;
console.log(`🎬 ${store.products.length} منتج منشور — ${todo.length} في الجهاز ده — ${plan.length} محتاجين فيديو جديد — هيتعمل ${run.length}`);
fs.mkdirSync(OUT, { recursive: true });

const results = [];
if (run.length && !DRY) {
  const { startServer } = await import('../server.mjs').catch(() => ({}));
  const { makeVideo, durationOf } = await import('../lib/video.mjs');
  const srv = startServer ? await startServer(0) : null;
  const baseUrl = srv?.url || process.env.STUDIO_URL || 'http://localhost:4455';
  for (const { p, copy, st, sig, variant } of run) {
    const track = TRACKS[variant];
    const { storyboard, meta } = buildReel(p, { copy, stock: st, offers: store.offers, track, variant });
    fs.writeFileSync(path.join(OUT, `${p.id}.storyboard.json`), JSON.stringify(storyboard, null, 1));
    try {
      const file = await makeVideo(baseUrl, storyboard, { store, onLog: () => {} });
      const poster = file.replace(/\.mp4$/, '.jpg');
      const item = { ...meta, sig, kind: 'reel', format: 'story', dur: +durationOf(file).toFixed(1), at: new Date().toISOString(), file: path.relative(ROOT, file) };
      if (UPLOAD) {
        const { putFileTo } = await r2();
        const key = `videos/reels/${p.id}/${sig}`;
        await putFileTo(BUCKET, key + '.mp4', fs.readFileSync(file), 'video/mp4');
        if (fs.existsSync(poster)) await putFileTo(BUCKET, key + '.jpg', fs.readFileSync(poster), 'image/jpeg');
        item.url = `/media/${key}.mp4`; item.poster = `/media/${key}.jpg`;
        try {
          const sheet = await makeSheet(file, file.replace(/\.mp4$/, '-sheet.jpg'));
          await putFileTo(BUCKET, key + '-sheet.jpg', fs.readFileSync(sheet), 'image/jpeg');
          item.sheet = `/media/${key}-sheet.jpg`;
        } catch (e) { console.log(`⚠️ صورة الملخص ${p.id}: ${e.message}`); }
      }
      results.push(item);
      console.log(`✅ ${p.id} ${p.name} — ${path.basename(file)}`);
    } catch (e) { console.log(`❌ ${p.id}: ${e.message}`); console.log(`::warning title=${p.id}::${oneLine(e, 600)}`); }
  }
  if (srv?.close) await srv.close();
} else if (DRY) {
  for (const { p, copy, st, variant } of run) {
    const { storyboard, meta } = buildReel(p, { copy, stock: st, offers: store.offers, track: TRACKS[variant], variant });
    fs.writeFileSync(path.join(OUT, `${p.id}.storyboard.json`), JSON.stringify(storyboard, null, 1));
    console.log(`📝 ${p.id} — ${storyboard.scenes.length} مشاهد، ${storyboard.scenes.reduce((a, s) => a + s.dur, 0).toFixed(1)} ث — ${meta.hook}`);
  }
}
// الفيديوهات القديمة اللي مالهاش صورة ملخص: بنسحب الفيديو من المخزن (على السحابة — مش من نت المالك) ونعملها
if (UPLOAD && !DRY) {
  const done = new Set(results.map(r => r.code));
  const { putFileTo } = await r2();
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
      await putFileTo(BUCKET, key, fs.readFileSync(sheet), 'image/jpeg');
      results.push({ code: p.id, sheet: `/media/${key}` });
      console.log(`🖼️ ${p.id} صورة ملخص`);
    } catch (e) { console.log(`⚠️ صورة الملخص ${p.id}: ${e.message}`); }
  }
}
fs.writeFileSync(path.join(OUT, `results-${SH}.json`), JSON.stringify({ at: new Date().toISOString(), items: results }, null, 1));
