// فيديو إعلان طولي (1080×1920) على الكمبيوتر السحابي:
//   هوك + قطع سريع على الكلام + كلام بيظهر كلمة بكلمة + مزيكا وwhoosh + كارت نهاية
//   node scripts/make-video.mjs ads/blackhead.json
// الفيديوهات بتتحمل من درايف صفقة بالـ id اللي في "sources" — مفيش حاجة بتتخزن على جهاز حد.
// الناتج: previews/<name>.mp4 + previews/<name>-fN.jpg
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { download } from './drive.mjs';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = 1080, H = 1920, FPS = 30;
const TMP = path.resolve('tmp/video-' + cfg.name);
const OUT = path.resolve('previews');
fs.mkdirSync(path.join(TMP, 'src'), { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();
const ff = args => run(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const dur = f => Number(run(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
const x264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
// "b5" أو "b5.mp4" → الملف اللي اتحمل من درايف
const src = k => path.join(TMP, 'src', String(k).replace(/\.\w+$/, '') + '.media');

// ── الخط العربي: Noto Kufi على لينكس (fonts-noto-core)، Segoe UI على ويندوز ──
const FONT_FILE = process.env.AD_FONT || [
  '/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf',
  'C:/Windows/Fonts/segoeuib.ttf',
].find(f => fs.existsSync(f));
if (!FONT_FILE) throw new Error('مفيش خط عربي — سطّب fonts-noto-core');
GlobalFonts.registerFromPath(FONT_FILE, 'AdFont');
const FONT = 'AdFont';

// ── تحميل الفيديوهات من درايف ──
for (const [k, id] of Object.entries(cfg.sources || {})) {
  const f = src(k);
  if (fs.existsSync(f) && fs.statSync(f).size > 0) continue;
  const d = await download(id);
  await pipeline(Readable.fromWeb(d.body), fs.createWriteStream(f));
  console.log('downloaded', k, (fs.statSync(f).size / 1048576).toFixed(1) + 'MB');
}

// ── رسم الكلام ──
let pn = 0;
const png = c => { const f = path.join(TMP, `p${pn++}.png`); fs.writeFileSync(f, c.toBuffer('image/png')); return f; };

// كابشن: كلمات الجروب، والكلمة اللي بتتقال دلوقتي صفرا وأكبر شوية
function captionPng(words, active) {
  let size = 96;
  const c = createCanvas(W, 260), g = c.getContext('2d');
  const measure = () => { g.font = `${size}px ${FONT}`; return words.map(w => g.measureText(w).width); };
  let ws = measure(), gap = size * 0.3;
  while (ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1) > W - 90) { size -= 4; ws = measure(); gap = size * 0.3; }
  const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let xr = W / 2 + total / 2;
  g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  words.forEach((w, i) => {
    g.font = `${size}px ${FONT}`;
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.lineWidth = 16; g.strokeStyle = '#000'; g.strokeText(w, xr, 130);
    g.shadowColor = 'transparent';
    g.fillStyle = i === active ? '#FFD60A' : '#FFFFFF'; g.fillText(w, xr, 130);
    xr -= ws[i] + gap;
  });
  return png(c);
}
// عنوان فوق: كلام أسود على شريط أصفر
function titlePng(text, size = 84) {
  const c = createCanvas(W, 220), g = c.getContext('2d');
  g.font = `${size}px ${FONT}`; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(W - 60, g.measureText(text).width + 90), h = size * 1.55, x = (W - w) / 2, y = 110 - h / 2;
  g.save(); g.translate(W / 2, 110); g.rotate(-0.025); g.translate(-W / 2, -110);
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
  g.fillStyle = '#FFD60A'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill();
  g.shadowColor = 'transparent'; g.fillStyle = '#0B1929'; g.fillText(text, W / 2, 114);
  g.restore();
  return png(c);
}
function textPng(text, size, color, box) {
  const c = createCanvas(W, Math.round(size * 2.2)), g = c.getContext('2d');
  g.font = `${size}px ${FONT}`; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (box) {
    const w = g.measureText(text).width + 120, h = size * 1.7;
    g.fillStyle = box; g.beginPath(); g.roundRect((W - w) / 2, (c.height - h) / 2, w, h, h / 2); g.fill();
  }
  g.shadowColor = box ? 'transparent' : 'rgba(0,0,0,0.6)'; g.shadowBlur = 14;
  g.fillStyle = color; g.fillText(text, W / 2, c.height / 2 + size * 0.05);
  return png(c);
}

// ── 1) الصوت + توقيت كل كلمة ──
const tts = new MsEdgeTTS();
await tts.setMetadata(cfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
const lines = [...cfg.lines, { ...cfg.end, isEnd: true }];
for (const [i, l] of lines.entries()) {
  const dir = path.join(TMP, `tts${i}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const r = await tts.toFile(dir, l.say, { rate: cfg.rate, pitch: cfg.pitch || '+0Hz' });
  l.audio = r.audioFilePath;
  l.words = JSON.parse(fs.readFileSync(r.metadataFilePath, 'utf8')).Metadata
    .filter(m => m.Type === 'WordBoundary')
    .map(m => ({ w: m.Data.text.Text, s: m.Data.Offset / 1e7, e: (m.Data.Offset + m.Data.Duration) / 1e7 }))
    .filter(x => /[\p{L}\p{N}]/u.test(x.w));
  l.voice = dur(l.audio);
  l.d = l.isEnd ? Math.max(4.2, l.voice + 1.2) : l.voice + (l.gap ?? cfg.gap);
}
tts.close();

// ── 2) كل سطر = لقطات بتتقطع على الكلام + كابشن + عنوان ──
const logo = path.join(TMP, 'logo.png');
if (!fs.existsSync(logo)) fs.writeFileSync(logo, Buffer.from(await (await fetch('https://farah-store.pages.dev/icons/icon-512.png')).arrayBuffer()));
function cutFilter(i, c, len) {
  // تغطية 9:16 بـ 1.5x ثم زووم بطيء (أو زووم سريع للهوك)
  const z = c.punch ? 'min(1.0+0.012*on,1.35)' : 'min(1.0+0.0022*on,1.15)';
  const cx = c.x ?? 0.5;
  const W2 = W * 1.5, H2 = H * 1.5;
  // قص جزء من تحت (كلام مكتوب على الفيديو الأصلي)
  const pre = `[${i}:v]fps=${FPS}` + (c.cropBottom ? `,crop=iw:ih*${1 - c.cropBottom}:0:0` : '') + (c.speed ? `,setpts=PTS/${c.speed}` : '');
  const zoom = `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},` +
    `eq=saturation=1.15:contrast=1.06,trim=duration=${len.toFixed(3)},setpts=PTS-STARTPTS[c${i}]`;
  if (c.fit === 'blur') {
    // فيديو عرضي: كامل في النص وورا منه نفس اللقطة مغبشة
    const fw = Math.round(W2 * (c.fg || 1.25));
    return `${pre},split[a${i}][f${i}];` +
      `[a${i}]scale=${W2 / 4}:${H2 / 4}:force_original_aspect_ratio=increase,crop=${W2 / 4}:${H2 / 4},boxblur=12:2,eq=brightness=-0.12,scale=${W2}:${H2},setsar=1[bg${i}];` +
      `[f${i}]scale=${fw}:-2,crop='min(iw,${W2})':ih:(iw-min(iw\\,${W2}))*${cx}:0,setsar=1[fg${i}];` +
      `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2*0.92,${zoom}`;
  }
  return `${pre},scale=${W2}:${H2}:force_original_aspect_ratio=increase,` +
    `crop=${W2}:${H2}:(iw-${W2})*${cx}:(ih-${H2})/2,setsar=1,` + zoom;
}

const parts = [];
for (const [li, l] of lines.entries()) {
  if (l.isEnd) break;
  // حدود اللقطات: على كلمات معينة أو بالتساوي
  const n = l.cuts.length;
  let starts = l.cutWords ? l.cutWords.map((wi, k) => (k === 0 ? 0 : l.words[wi].s - 0.05))
    : l.cuts.map((_, k) => (l.d / n) * k);
  const lens = starts.map((s, k) => (k === n - 1 ? l.d : starts[k + 1]) - s);
  const inputs = [], filters = [];
  l.cuts.forEach((c, k) => { inputs.push('-ss', String(c.ss), '-t', String(lens[k] * (c.speed || 1) + 0.5), '-i', src(c.src)); filters.push(cutFilter(k, c, lens[k])); });
  let base = `${l.cuts.map((_, k) => `[c${k}]`).join('')}concat=n=${n}:v=1:a=0[b0]`;
  let cur = 'b0', idx = n, fchain = '';
  if (l.flash) { fchain += `;[${cur}]fade=in:st=0:d=0.22:color=white[bf]`; cur = 'bf'; }
  // لوجو صغير
  inputs.push('-i', logo);
  fchain += `;[${idx}:v]scale=130:130,format=rgba,colorchannelmixer=aa=0.92[lg];[${cur}][lg]overlay=W-w-36:60[bl]`; cur = 'bl'; idx++;
  // عنوان
  if (l.title) {
    inputs.push('-loop', '1', '-t', String(l.d), '-i', titlePng(l.title, l.titleSize));
    fchain += `;[${idx}:v]format=rgba,fade=in:st=0.05:d=0.15:alpha=1[tt];[${cur}][tt]overlay=0:H*0.1[bt]`; cur = 'bt'; idx++;
  }
  // كابشن كلمة بكلمة: جروبات 2-3 كلمات، تقطع لو فيه سكتة
  const groups = [];
  let g = [];
  l.words.forEach((w, k) => {
    const prev = l.words[k - 1];
    if (g.length && (g.length >= (l.groupSize || 3) || (prev && w.s - prev.e > 0.22))) { groups.push(g); g = []; }
    g.push(k);
  });
  if (g.length) groups.push(g);
  const capY = l.capY ?? 0.63;
  groups.forEach((gr, gi) => {
    gr.forEach((wk, j) => {
      const s = l.words[wk].s;
      const e = j < gr.length - 1 ? l.words[gr[j + 1]].s : (gi < groups.length - 1 ? l.words[groups[gi + 1][0]].s : l.d);
      inputs.push('-loop', '1', '-t', String(l.d), '-i', captionPng(gr.map(x => l.words[x].w), j));
      fchain += `;[${cur}][${idx}:v]overlay=0:H*${capY}:enable='between(t,${s.toFixed(3)},${(e - 0.001).toFixed(3)})'[v${idx}]`;
      cur = `v${idx}`; idx++;
    });
  });
  const out = path.join(TMP, `part${li}.mp4`);
  ff([...inputs, '-filter_complex', filters.join(';') + ';' + base + fchain, '-map', `[${cur}]`, '-t', l.d.toFixed(3), '-an', ...x264, out]);
  parts.push(out);
  console.log('line', li, l.d.toFixed(2) + 's', n, 'cuts');
}

// ── 3) كارت النهاية: المنتج بيلف ورا بلور + لوجو + اطلبه دلوقتي ──
{
  const l = lines[lines.length - 1];
  const e = cfg.endCard;
  const T = [
    { f: textPng('متجر فرح مصر', 70, '#F4D98C'), y: 0.40, t: 0.35 },
    { f: textPng(e.cta, 110, '#0B1929', '#FFD60A'), y: 0.47, t: 0.7 },
    { f: textPng(e.sub, 52, '#FFFFFF'), y: 0.60, t: 1.1 },
    ...(e.badge ? [{ f: textPng(e.badge, 56, '#FFFFFF', '#D62839'), y: 0.69, t: 1.5 }] : []),
  ];
  const inputs = ['-ss', String(e.bg.ss), '-t', String(l.d + 0.5), '-i', src(e.bg.src), '-loop', '1', '-t', String(l.d), '-i', logo, ...T.flatMap(x => ['-loop', '1', '-t', String(l.d), '-i', x.f])];
  let fc = `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,boxblur=18:2,eq=brightness=-0.28:saturation=1.1,trim=duration=${l.d.toFixed(3)},setpts=PTS-STARTPTS,fade=in:st=0:d=0.25:color=white[b0]`;
  fc += `;[1:v]scale=360:360,format=rgba,fade=in:st=0:d=0.3:alpha=1[lg];[b0][lg]overlay=(W-w)/2:H*0.17[b1]`;
  let cur = 'b1';
  T.forEach((x, k) => {
    fc += `;[${k + 2}:v]format=rgba,fade=in:st=${x.t}:d=0.25:alpha=1[t${k}];[${cur}][t${k}]overlay=0:H*${x.y}[e${k}]`;
    cur = `e${k}`;
  });
  const out = path.join(TMP, 'part-end.mp4');
  ff([...inputs, '-filter_complex', fc, '-map', `[${cur}]`, '-t', l.d.toFixed(3), '-an', ...x264, out]);
  parts.push(out);
}

// ── 4) الصوت: الكلام + مزيكا إلكترونية متولدة + whoosh على كل سطر ──
const starts = [];
let acc = 0;
for (const l of lines) { starts.push(acc); acc += l.d; }
const total = acc;
const B = 60 / cfg.bpm;
const f = `if(lt(mod(t,${8 * B}),${2 * B}),55,if(lt(mod(t,${8 * B}),${4 * B}),43.65,if(lt(mod(t,${8 * B}),${6 * B}),65.41,49)))`;
const kick = `0.9*sin(2*PI*52*mod(t,${B})*(1+2.2*exp(-mod(t,${B})*28)))*exp(-mod(t,${B})*7)`;
const hat = `0.22*(random(0)*2-1)*exp(-mod(t+${B / 2},${B})*55)`;
const bass = `0.35*sin(2*PI*${f}*t)*exp(-mod(t+${B / 2},${B})*5)`;
const pad = `0.06*(sin(2*PI*${f}*4*t)+sin(2*PI*${f}*5.04*t)+sin(2*PI*${f}*6*t))`;
const music = path.join(TMP, 'music.wav');
ff(['-f', 'lavfi', '-i', `aevalsrc='${kick}+${hat}+${bass}+${pad}':s=44100:d=${total.toFixed(2)}`,
  '-af', `lowpass=f=9000,volume=0.5,afade=in:d=0.3,afade=out:st=${(total - 1.2).toFixed(2)}:d=1.2`, music]);
const whoosh = path.join(TMP, 'whoosh.wav');
ff(['-f', 'lavfi', '-i', `aevalsrc='(random(0)*2-1)*pow(sin(PI*t/0.4),2)':s=44100:d=0.4`, '-af', 'highpass=f=900,lowpass=f=7000,volume=0.35', whoosh]);

const aIn = [], aF = [];
lines.forEach((l, i) => { aIn.push('-i', l.audio); aF.push(`[${i}:a]aresample=44100,adelay=${Math.round((starts[i] + (l.isEnd ? 0.35 : 0)) * 1000)}:all=1[v${i}]`); });
const mi = lines.length;
aIn.push('-i', music);
const wStarts = starts.slice(1);
wStarts.forEach(() => aIn.push('-i', whoosh));
wStarts.forEach((s, k) => aF.push(`[${mi + 1 + k}:a]adelay=${Math.max(0, Math.round((s - 0.2) * 1000))}:all=1[w${k}]`));
const voiceMix = `${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,volume=1.6[voice]`;
const wMix = wStarts.length ? `;${wStarts.map((_, k) => `[w${k}]`).join('')}amix=inputs=${wStarts.length}:normalize=0[wh]` : '';
// المزيكا بتوطى لوحدها تحت الكلام (sidechain)
const final = `;[voice]asplit=2[vo][sc];[${mi}:a][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[mus];[vo][mus]${wStarts.length ? '[wh]' : ''}amix=inputs=${wStarts.length ? 3 : 2}:normalize=0,loudnorm=I=-14:TP=-1.2[a]`;
const audio = path.join(TMP, 'mix.m4a');
ff([...aIn, '-filter_complex', aF.join(';') + ';' + voiceMix + wMix + final, '-map', '[a]', '-t', total.toFixed(3), '-c:a', 'aac', '-b:a', '192k', audio]);

// ── 5) تجميع ──
const list = path.join(TMP, 'list.txt');
fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const outFile = path.join(OUT, `${cfg.name}.mp4`);
ff(['-f', 'concat', '-safe', '0', '-i', list, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', outFile]);
const td = dur(outFile);
[0.03, 0.12, 0.25, 0.42, 0.58, 0.75, 0.97].forEach((p, i) => ff(['-ss', String(td * p), '-i', outFile, '-frames:v', '1', '-vf', 'scale=360:-1', path.join(OUT, `${cfg.name}-f${i + 1}.jpg`)]));
console.log(`done ${outFile} ${td.toFixed(1)}s ${(fs.statSync(outFile).size / 1048576).toFixed(1)}MB`);
