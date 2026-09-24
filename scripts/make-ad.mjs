// فيديو إعلان طولي (1080×1920) من فيديوهات "ع الطبيعة" + صوت ذكاء اصطناعي مصري (مجاني) + كلام مكتوب + لوجو + نهاية
//   node scripts/make-ad.mjs ads/steam-cleaner.json
// محتاج ffmpeg/ffprobe (موجودين في GitHub Actions) وخط عربي (FONT أو بيدور لوحده).
// الناتج: previews/<name>.mp4 + previews/<name>-frameN.jpg
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { download } from './drive.mjs';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = 1080, H = 1920, FPS = 30;
const TMP = path.resolve('tmp/ad-' + cfg.name);
const OUT = path.resolve('previews');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const ff = args => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const dur = f => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());

function findFont() {
  if (process.env.FONT && fs.existsSync(process.env.FONT)) return process.env.FONT;
  const list = run('fc-list', [':lang=ar', 'file']).split('\n').map(s => s.replace(/:\s*$/, '').trim()).filter(Boolean);
  return list.find(f => /KufiArabic-Bold/i.test(f)) || list.find(f => /SansArabic-Bold/i.test(f)) || list.find(f => /Bold/i.test(f)) || list[0];
}
const FONT = findFont();
console.log('font:', FONT);

// ── 1) الصوت: جملة جملة علشان الكلام المكتوب يبقى على نفس التوقيت ──
const tts = new MsEdgeTTS();
await tts.setMetadata(cfg.voice || 'ar-EG-SalmaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
async function say(text, file) {
  const dir = path.join(TMP, 'tts-' + path.basename(file, '.mp3'));
  fs.mkdirSync(dir, { recursive: true });
  const r = await tts.toFile(dir, text, { rate: cfg.rate || '+0%' });
  fs.copyFileSync(r.audioFilePath, file);
  return dur(file);
}
const scenes = [];
for (const [i, s] of cfg.scenes.entries()) {
  const a = path.join(TMP, `say${i}.mp3`);
  scenes.push({ ...s, audio: a, d: (await say(s.say, a)) + 0.35 });
}
const endAudio = path.join(TMP, 'say-end.mp3');
const endDur = Math.max(3.2, (await say(cfg.end.say, endAudio)) + 0.6);
tts.close();

// ── 2) الفيديوهات الحقيقية ──
const clips = [];
for (const [i, id] of cfg.clips.entries()) {
  const f = path.join(TMP, `clip${i}.mov`);
  if (!fs.existsSync(f)) { const d = await download(id); await pipeline(Readable.fromWeb(d.body), fs.createWriteStream(f)); }
  clips.push({ f, d: dur(f), pos: 0.5 });
}
const logo = path.join(TMP, 'logo.png');
if (!fs.existsSync(logo)) fs.writeFileSync(logo, Buffer.from(await (await fetch('https://farah-store.pages.dev/icons/icon-512.png')).arrayBuffer()));

// نص عربي → ملف (drawtext بيشكّل العربي من ملف من غير مشاكل escaping)
let tn = 0;
const textFile = t => { const f = path.join(TMP, `t${tn++}.txt`); fs.writeFileSync(f, t); return f.replace(/\\/g, '/').replace(/:/g, '\\:'); };
const wrap = (t, n) => { const words = t.split(/\s+/); const lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur); return lines; };
const fontArg = FONT.replace(/\\/g, '/').replace(/:/g, '\\:');
const draw = (file, size, y, box = true, color = 'white') =>
  `drawtext=fontfile='${fontArg}':textfile='${file}':text_shaping=1:fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}` +
  (box ? ':box=1:boxcolor=0x0B1929@0.78:boxborderw=26' : '');

// ── 3) كل مشهد: جزء من فيديو حقيقي + عنوان كبير + ترجمة الكلام + لوجو ──
const parts = [];
for (const [i, s] of scenes.entries()) {
  const c = clips[i % clips.length];
  if (c.pos + s.d > c.d - 0.2) c.pos = 0.3;          // لو الفيديو خلص نرجع من الأول
  const start = c.pos; c.pos += s.d + 0.4;
  const sub = wrap(s.say, 24);
  const filters = [
    `scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, `fps=${FPS}`, 'eq=saturation=1.08:contrast=1.04',
    draw(textFile(s.headline), 92, 'h*0.16', true, '0xF4D98C'),
    ...sub.map((l, k) => draw(textFile(l), 54, `h*0.74+${k * 86}`)),
  ];
  const out = path.join(TMP, `part${i}.mp4`);
  ff(['-ss', String(start), '-t', String(s.d), '-i', c.f, '-i', logo,
    '-filter_complex', `[0:v]${filters.join(',')}[v];[1:v]scale=150:150[l];[v][l]overlay=W-w-40:40[o]`,
    '-map', '[o]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out]);
  parts.push(out);
}

// ── 4) النهاية: كارت كحلي + لوجو + اطلب دلوقتي ──
const endOut = path.join(TMP, 'part-end.mp4');
ff(['-f', 'lavfi', '-t', String(endDur), '-i', `color=c=0x0B1929:s=${W}x${H}:r=${FPS}`, '-i', logo,
  '-filter_complex', [
    `[1:v]scale=420:420[l];[0:v][l]overlay=(W-w)/2:H*0.18[b]`,
    `[b]${draw(textFile('متجر فرح مصر'), 84, 'h*0.46', false, '0xF4D98C')},` +
    `${draw(textFile(cfg.end.lines[0]), 110, 'h*0.56', false)},` +
    `${draw(textFile(cfg.end.lines[1]), 50, 'h*0.66', false, '0xE6DCC8')}[o]`,
  ].join(';'),
  '-map', '[o]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', endOut]);
parts.push(endOut);

// ── 5) الصوت كله على نفس المشاهد ──
const audioParts = [...scenes.map(s => ({ f: s.audio, d: s.d })), { f: endAudio, d: endDur }];
const audio = path.join(TMP, 'voice.m4a');
ff([...audioParts.flatMap(a => ['-i', a.f]),
  '-filter_complex', audioParts.map((a, i) => `[${i}:a]apad,atrim=0:${a.d.toFixed(3)}[a${i}]`).join(';') + ';' + audioParts.map((_, i) => `[a${i}]`).join('') + `concat=n=${audioParts.length}:v=0:a=1,loudnorm=I=-15:TP=-1.5[a]`,
  '-map', '[a]', '-c:a', 'aac', '-b:a', '160k', audio]);

const list = path.join(TMP, 'list.txt');
fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const final = path.join(OUT, `${cfg.name}.mp4`);
ff(['-f', 'concat', '-safe', '0', '-i', list, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);

// صور من الفيديو للمراجعة
const total = dur(final);
[0.2, 0.45, 0.7, 0.97].forEach((p, i) => ff(['-ss', String(total * p), '-i', final, '-frames:v', '1', '-vf', 'scale=540:-1', path.join(OUT, `${cfg.name}-frame${i + 1}.jpg`)]));
console.log(`✅ ${final} — ${total.toFixed(1)} ثانية، ${(fs.statSync(final).size / 1048576).toFixed(1)}MB`);
