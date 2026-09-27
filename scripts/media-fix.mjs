// تصليح وتكملة ميديا المكتبة على الكمبيوتر السحابي — من غير ما نمسح أي أصل:
//   fixes  فيديو بيوري المنتج بس فيه حتة وحشة (علامة مائية، بياع تاني، سعر، رقم تليفون):
//          keep = الأوقات اللي نسيبها [[من، لحد]] · blur = أماكن نغبّشها [x,y,w,h] كنسبة من الكادر (+ من/لحد اختياري)
//          crop = نقص الكادر [x,y,w,h] كنسبة · الناتج ملف جديد: catalog/<code>/<name>-fix.mp4 والأصل زي ما هو
//   big    فيديوهات «ع الطبيعة» اللي كانت أكبر من 400MB → من درايف لـ catalog/<code>/real.mp4 (720p، دقيقة بالكتير)
//   stock  فيديوهات مجانية من Pexels (رخصة Pexels: استخدام تجاري ببلاش) → stock/<group>/<id>.mp4 (1080×1920)
// الخطة: catalog/media-fixes.json (مفيهاش أي داتا موردين: أكواد ومسارات وأوقات بس)
// الناتج: previews/media-fixes-map.json → فرع media-map باسم media-fixes.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { download } from './drive.mjs';
import { putFileTo, getJsonFrom } from './storage.mjs';

const plan = JSON.parse(fs.readFileSync('catalog/media-fixes.json', 'utf8'));
const mediaPlan = JSON.parse(fs.readFileSync('catalog/media-plan.json', 'utf8'));
const MEDIA_BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const SITE = 'https://farahegypt.com/media/';
const ONLY = (process.env.PARTS || 'fixes,big,stock').split(',').map(s => s.trim());
const TMP = path.resolve('tmp/fix');
fs.mkdirSync(TMP, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();
const ff = args => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const probe = (f, what) => run('ffprobe', ['-v', 'error', ...what, '-of', 'csv=p=0', f]).trim();
const duration = f => Number(probe(f, ['-show_entries', 'format=duration'])) || 0;
const hasAudio = f => probe(f, ['-select_streams', 'a', '-show_entries', 'stream=index']).length > 0;

// اللي اتعمل قبل كده (عشان التشغيل التاني مايعيدش)
const MAP_KEY = 'private/media-fixes-map.json';
const done = await getJsonFrom(MEDIA_BUCKET, MAP_KEY, { fixes: {}, big: {}, stock: {}, bytes: 0 });

async function fetchTo(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(file));
}
async function upload(key, file, type = 'video/mp4') {
  const body = fs.readFileSync(file);
  await putFileTo(MEDIA_BUCKET, key, body, type);
  done.bytes += body.length;
  return body.length;
}
const pct = v => Number(v).toFixed(4);

// 1) تصليح فيديوهات
function fixFilter(job, audio, dur) {
  const keep = job.keep?.length ? job.keep.map(([a, b]) => [Math.max(0, a), Math.min(dur, b ?? dur)]).filter(([a, b]) => b - a > 0.3) : [[0, dur]];
  const parts = [];
  keep.forEach(([a, b], i) => {
    parts.push(`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`);
    if (audio) parts.push(`[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[a${i}]`);
  });
  parts.push(`${keep.map((_, i) => `[v${i}]${audio ? `[a${i}]` : ''}`).join('')}concat=n=${keep.length}:v=1:a=${audio ? 1 : 0}[vc]${audio ? '[ac]' : ''}`);
  let last = 'vc';
  (job.blur || []).forEach(([x, y, w, h, t0, t1], i) => {
    const en = t0 != null ? `:enable='between(t,${t0},${t1 ?? 9999})'` : '';
    parts.push(`[${last}]split[m${i}][s${i}]`, `[s${i}]crop=iw*${pct(w)}:ih*${pct(h)}:iw*${pct(x)}:ih*${pct(y)},boxblur=luma_radius='min(22,min(w,h)/2-1)':luma_power=6:chroma_radius='min(10,min(cw,ch)/2-1)':chroma_power=6[b${i}]`, `[m${i}][b${i}]overlay=W*${pct(x)}:H*${pct(y)}${en}[o${i}]`);
    last = `o${i}`;
  });
  if (job.crop) { const [x, y, w, h] = job.crop; parts.push(`[${last}]crop=iw*${pct(w)}:ih*${pct(h)}:iw*${pct(x)}:ih*${pct(y)},scale=trunc(iw/2)*2:trunc(ih/2)*2[cr]`); last = 'cr'; }
  parts.push(`[${last}]format=yuv420p[vout]`);
  return { filter: parts.join(';'), audio };
}
if (ONLY.includes('fixes')) {
  for (const job of plan.fixes || []) {
    if (done.fixes[job.out]) continue;
    try {
      const src = path.join(TMP, 'src.mp4'), out = path.join(TMP, 'out.mp4');
      await fetchTo(SITE + job.src, src);
      const audio = hasAudio(src);
      const { filter } = fixFilter(job, audio, duration(src));
      ff(['-i', src, '-filter_complex', filter, '-map', '[vout]', ...(audio ? ['-map', '[ac]', '-c:a', 'aac', '-b:a', '96k'] : []),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-movflags', '+faststart', out]);
      const d = duration(out);
      if (d < 2) throw new Error(`الناتج قصير (${d.toFixed(1)} ث)`);
      const size = await upload(job.out, out);
      done.fixes[job.out] = { src: job.src, dur: +d.toFixed(1), size };
      console.log(`✂️ ${job.out} ← ${job.src} · ${d.toFixed(1)} ث · ${(size / 1048576).toFixed(1)}MB`);
    } catch (e) { console.log(`⚠️ ${job.out}: ${e.message.slice(0, 200)}`); }
  }
}

// 2) فيديوهات «ع الطبيعة» الكبيرة من درايف (من غير حد للحجم — بنقص أول دقيقة 720p)
if (ONLY.includes('big')) {
  for (const code of plan.big || []) {
    if (done.big[code]) continue;
    const id = mediaPlan[code]?.main;
    if (!id) { console.log(`⚠️ ${code}: مالوش فيديو في الخطة`); continue; }
    try {
      const src = path.join(TMP, 'big.src'), out = path.join(TMP, 'real.mp4');
      const d0 = await download(id);
      console.log(`⬇️ ${code} ${d0.size ? (d0.size / 1048576).toFixed(0) + 'MB' : ''}`);
      await pipeline(Readable.fromWeb(d0.body), fs.createWriteStream(src));
      ff(['-i', src, '-t', String(Math.min(60, duration(src) || 60)), '-vf', "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)',fps=30",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', out]);
      fs.rmSync(src, { force: true });
      const key = `catalog/${code}/real.mp4`;
      const size = await upload(key, out);
      done.big[code] = { key, size };
      console.log(`🎬 ${key} · ${(size / 1048576).toFixed(1)}MB`);
    } catch (e) { console.log(`⚠️ ${code}: ${e.message.slice(0, 200)}`); }
  }
}

// 3) مكتبة الفيديوهات المجانية (Pexels) — 1080×1920 من غير صوت
if (ONLY.includes('stock')) {
  for (const s of plan.stock || []) {
    const key = `stock/${s.group}/${s.id}.mp4`;
    if (done.stock[key]) continue;
    try {
      const src = path.join(TMP, 'stock.src'), out = path.join(TMP, 'stock.mp4');
      await fetchTo(s.url, src);
      ff(['-i', src, '-t', '20', '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30', '-an',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      const size = await upload(key, out);
      done.stock[key] = { group: s.group, id: s.id, dur: +duration(out).toFixed(1), size, source: 'pexels', page: `https://www.pexels.com/video/${s.id}/` };
      console.log(`📦 ${key} · ${(size / 1048576).toFixed(1)}MB`);
    } catch (e) { console.log(`⚠️ ${key}: ${e.message.slice(0, 200)}`); }
  }
}

const { putJsonTo } = await import('./storage.mjs');
await putJsonTo(MEDIA_BUCKET, MAP_KEY, done);
fs.mkdirSync('previews', { recursive: true });
fs.writeFileSync('previews/media-fixes-map.json', JSON.stringify(done));
console.log(`✅ تصليح ${Object.keys(done.fixes).length} · كبار ${Object.keys(done.big).length} · مكتبة ${Object.keys(done.stock).length} · اتضاف ${(done.bytes / 1073741824).toFixed(2)}GB`);
