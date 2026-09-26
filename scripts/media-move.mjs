// نقل ميديا المكتبة لمخزن الموقع (على الكمبيوتر السحابي) حسب catalog/media-plan.json
//   صور → WebP عرض 1200 · فيديو "ع الطبيعة" → MP4 720p (دقيقة بالكتير) · كليبات → 15 ثانية 720p
//   المكان: <MEDIA_BUCKET>/catalog/<code>/{i1.webp…, real.mp4, clip1.mp4…} → بيتعرض من farah-store.pages.dev/media/catalog/…
// بيقف لوحده لو الإجمالي وصل MAX_TOTAL_GB أو وقت التشغيل خلص — التشغيل الجاي بيكمّل (state في المخزن الخام)
// الناتج: previews/media-map.json (code → الملفات) بيتحفظ في فرع media-map
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { download } from './drive.mjs';
import { putFileTo, getJson, putJson } from './storage.mjs';

const plan = JSON.parse(fs.readFileSync('catalog/media-plan.json', 'utf8'));
const MEDIA_BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const MAX_TOTAL = Number(process.env.MAX_TOTAL_GB || 5) * 1024 ** 3;
const MAX_SOURCE_MB = Number(process.env.MAX_SOURCE_MB || 400);
const deadline = Date.now() + Number(process.env.TIME_BUDGET_MIN || 320) * 60000;
const ONLY = (process.env.CODES || '').split(',').map(s => s.trim()).filter(Boolean);
const TMP = path.resolve('tmp/media');
fs.mkdirSync(TMP, { recursive: true });

const STATE = 'state/catalog-media.json';
const state = await getJson(STATE, { total: 0, done: {} });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();
const ff = args => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const duration = f => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim()) || 0;

async function fetchTo(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(file));
}
async function driveTo(id, file) {
  const d = await download(id);
  if (d.size && d.size > MAX_SOURCE_MB * 1048576) { await d.body.cancel(); throw new Error(`أكبر من ${MAX_SOURCE_MB}MB`); }
  await pipeline(Readable.fromWeb(d.body), fs.createWriteStream(file));
}
async function upload(key, file, type) {
  const body = fs.readFileSync(file);
  await putFileTo(MEDIA_BUCKET, key, body, type);
  state.total += body.length;
  return body.length;
}
const video720 = (src, out, start, len) => ff([
  ...(start ? ['-ss', String(start)] : []), '-i', src, '-t', String(len),
  '-vf', "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)',fps=30", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', out]);

let products = 0, failed = 0, stoppedFor = '';
for (const [code, p] of Object.entries(plan)) {
  if (ONLY.length && !ONLY.includes(code)) continue;
  // بنعيد بس اللي فشل لسبب مؤقت (حد درايف / النت) — الأكبر من الحد أو الملف البايظ مالوش لازمة نعيده كل يوم
  if (state.done[code] && !(state.done[code].errors || []).some(e => !/أكبر من|ffprobe/.test(e))) continue;
  if (Date.now() > deadline) { stoppedFor = 'الوقت'; break; }
  if (state.total > MAX_TOTAL) { stoppedFor = 'حد المساحة'; break; }
  const out = { images: [], real: null, clips: [], errors: [] };
  const dir = path.join(TMP, code);
  fs.mkdirSync(dir, { recursive: true });

  // الصور: نسخة درايف مصغّرة (بتشتغل حتى مع HEIC) → WebP
  const imgSources = [...(p.img || []).map(id => `https://lh3.googleusercontent.com/d/${id}=w1200`), ...(p.imgUrl || [])];
  for (const [i, url] of imgSources.entries()) {
    try {
      const src = path.join(dir, `i${i}.src`), dst = path.join(dir, `i${i + 1}.webp`);
      await fetchTo(url, src);
      ff(['-i', src, '-vf', "scale='min(1200,iw)':-2", '-c:v', 'libwebp', '-quality', '78', '-frames:v', '1', dst]);
      await upload(`catalog/${code}/i${i + 1}.webp`, dst, 'image/webp');
      out.images.push(`catalog/${code}/i${i + 1}.webp`);
    } catch (e) { out.errors.push(`img${i + 1}: ${e.message}`); }
  }

  // فيديو "ع الطبيعة": دقيقة بالكتير
  if (p.main) {
    try {
      const src = path.join(dir, 'real.src'), dst = path.join(dir, 'real.mp4');
      await driveTo(p.main, src);
      video720(src, dst, 0, Math.min(60, duration(src) || 60));
      await upload(`catalog/${code}/real.mp4`, dst, 'video/mp4');
      out.real = `catalog/${code}/real.mp4`;
    } catch (e) { out.errors.push(`real: ${e.message}`); }
  }

  // كليبات المونتاج: 15 ثانية من بعد أول 20% من الفيديو
  for (const [i, id] of (p.clips || []).entries()) {
    try {
      const src = path.join(dir, `c${i}.src`), dst = path.join(dir, `clip${i + 1}.mp4`);
      await driveTo(id, src);
      const d = duration(src);
      video720(src, dst, d > 20 ? d * 0.2 : 0, Math.min(15, d || 15));
      await upload(`catalog/${code}/clip${i + 1}.mp4`, dst, 'video/mp4');
      out.clips.push(`catalog/${code}/clip${i + 1}.mp4`);
    } catch (e) { out.errors.push(`clip${i + 1}: ${e.message}`); }
  }

  fs.rmSync(dir, { recursive: true, force: true });
  // مفتاح R2 مالوش صلاحية على مخزن الموقع → نقف فوراً بدل ما نلف على كل المنتجات
  if (out.errors.some(e => /Access Denied|AccessDenied|Unauthorized/i.test(e))) {
    console.log(`⛔ مفتاح R2 مالوش صلاحية كتابة على ${MEDIA_BUCKET} — زوّد الـ bucket ده في صلاحيات المفتاح (Cloudflare ← R2 ← Manage API tokens) وشغّل تاني.`);
    process.exit(1);
  }
  state.done[code] = out;
  products++;
  if (out.errors.length) failed++;
  console.log(`✓ ${code} صور ${out.images.length} · طبيعة ${out.real ? 1 : 0} · كليبات ${out.clips.length}${out.errors.length ? ' · ⚠️ ' + out.errors.join(' | ') : ''} · الإجمالي ${(state.total / 1048576).toFixed(0)}MB`);
  if (products % 10 === 0) await putJson(STATE, state);
}
await putJson(STATE, state);
fs.mkdirSync('previews', { recursive: true });
fs.writeFileSync('previews/media-map.json', JSON.stringify({ total: state.total, done: state.done }));
const left = Object.keys(plan).filter(c => !state.done[c]).length;
// الـ workflow بيشغّل نفسه تاني لو فاضل منتجات ووقف بسبب الوقت بس
fs.writeFileSync('previews/continue.txt', !ONLY.length && left > 0 && stoppedFor === 'الوقت' ? 'yes' : 'no');
console.log(`✅ اتنقل ${products} منتج في التشغيل ده (فيهم مشاكل: ${failed}) · الإجمالي في المخزن ${(state.total / 1073741824).toFixed(2)}GB · فاضل ${left} منتج${stoppedFor ? ' · وقف بسبب ' + stoppedFor : ''}`);
