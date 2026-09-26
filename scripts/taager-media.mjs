// نقل صور منتجات تاجر لمخزن الموقع (على الكمبيوتر السحابي) — من سيرفر تاجر لـ R2 مباشرة
//   الخطة: <MEDIA_BUCKET>/private/taager-media-plan.json  (بيعملها الموقع: POST /api/taager-plan)
//   كل صورة: تنزل → OCR (عربي + إنجليزي) → لو عليها اسم تاجر / رقم تليفون / لينك مابتتنقلش
//            → لو عليها كتابة إعلانية بتتنقل وبتتعلّم "text" → WebP عرض 1200 → <MEDIA_BUCKET>/catalog/<code>/iN.webp
//   الخريطة: <MEDIA_BUCKET>/private/taager-media-map.json (الموقع بيربطها بالمكتبة: POST /api/taager-link)
// سقف المساحة مشترك مع نقل صفقة (MAX_TOTAL_GB) — ولو الوقت خلص بيكمّل في التشغيل الجاي
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { putFileTo, getJson, putJson, getJsonFrom, putJsonTo } from './storage.mjs';

const MEDIA_BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const MAX_TOTAL = Number(process.env.MAX_TOTAL_GB || 5) * 1024 ** 3;
const deadline = Date.now() + Number(process.env.TIME_BUDGET_MIN || 320) * 60000;
const TMP = path.resolve('tmp/taager');
fs.mkdirSync(TMP, { recursive: true });

const plan = await getJsonFrom(MEDIA_BUCKET, 'private/taager-media-plan.json', {});
const STATE = 'state/taager-media.json';
const state = await getJson(STATE, { total: 0, done: {} });
const safka = await getJson('state/catalog-media.json', { total: 0 });   // اللي اتنقل من صفقة قبل كده
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();
const ff = args => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

// الكتابة اللي على الصورة
const BRAND = /taager|tager|تاجر|www\.|\.com|@[a-z0-9_]{3,}|(?:\+?20|0)1[0125][\s-]?\d{3}[\s-]?\d{4}/i;
function ocr(file) {
  try { return run('tesseract', [file, 'stdout', '-l', 'ara+eng', '--psm', '11']).replace(/\s+/g, ' ').trim(); }
  catch { return ''; }
}
const letters = s => (s.match(/[\p{L}]/gu) || []).length;

async function fetchTo(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(file));
}

let products = 0, stoppedFor = '';
const codes = Object.keys(plan);
for (const code of codes) {
  if (state.done[code] && !(state.done[code].errors || []).length) continue;
  if (Date.now() > deadline) { stoppedFor = 'الوقت'; break; }
  if (state.total + (safka.total || 0) > MAX_TOTAL) { stoppedFor = 'حد المساحة'; break; }
  const out = { images: [], skipped: [], errors: [] };
  const dir = path.join(TMP, code);
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const [i, url] of (plan[code].img || []).entries()) {
    try {
      const src = path.join(dir, `s${i}`), png = path.join(dir, `s${i}.png`), dst = path.join(dir, `i${n + 1}.webp`);
      await fetchTo(url, src);
      ff(['-i', src, '-vf', "scale='min(1600,iw)':-2", '-frames:v', '1', png]);
      const text = ocr(png);
      if (BRAND.test(text)) { out.skipped.push({ url, why: 'brand', text: text.slice(0, 120) }); continue; }
      ff(['-i', src, '-vf', "scale='min(1200,iw)':-2", '-c:v', 'libwebp', '-quality', '78', '-frames:v', '1', dst]);
      const body = fs.readFileSync(dst);
      await putFileTo(MEDIA_BUCKET, `catalog/${code}/i${n + 1}.webp`, body, 'image/webp');
      state.total += body.length;
      n++;
      out.images.push({ key: `catalog/${code}/i${n}.webp`, from: url, text: letters(text) >= 15 ? text.slice(0, 160) : '' });
    } catch (e) { out.errors.push(`img${i + 1}: ${e.message}`); }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  if (out.errors.some(e => /Access Denied|AccessDenied|Unauthorized/i.test(e))) {
    console.log(`⛔ مفتاح R2 مالوش صلاحية كتابة على ${MEDIA_BUCKET}`);
    process.exit(1);
  }
  state.done[code] = out;
  products++;
  console.log(`✓ ${code} اتنقل ${out.images.length} (عليها كتابة ${out.images.filter(x => x.text).length}) · اتشال ${out.skipped.length}${out.errors.length ? ' · ⚠️ ' + out.errors.join(' | ') : ''} · ${(state.total / 1048576).toFixed(0)}MB`);
  if (products % 10 === 0) { await putJson(STATE, state); await putJsonTo(MEDIA_BUCKET, 'private/taager-media-map.json', state.done); }
}
await putJson(STATE, state);
await putJsonTo(MEDIA_BUCKET, 'private/taager-media-map.json', state.done);
const left = codes.filter(c => !state.done[c]).length;
fs.mkdirSync('previews', { recursive: true });
fs.writeFileSync('previews/continue.txt', left > 0 && stoppedFor === 'الوقت' ? 'yes' : 'no');
console.log(`✅ ${products} منتج في التشغيل ده · صور تاجر في المخزن ${(state.total / 1048576).toFixed(0)}MB · فاضل ${left}${stoppedFor ? ' · وقف بسبب ' + stoppedFor : ''}`);
