// تحليل مزيكا للمونتاج على الإيقاع: السرعة (BPM)، ومكان كل ضربة، وأقوى مقطع طاقة بالطول المطلوب
//   node tools/beats.mjs <file.mp3> [طول المقطع بالثواني=20]  → بيطبع JSON
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const [file, lenArg] = process.argv.slice(2);
const LEN = Number(lenArg) || 20;
const SR = 11025, HOP = 256; // ~23ms
const raw = execFileSync(ffmpegPath, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const n = Math.floor(x.length / HOP);
const env = new Float32Array(n), rms = new Float32Array(n);
let prev = 0;
for (let i = 0; i < n; i++) {
  let s = 0, lo = 0;
  for (let j = i * HOP; j < (i + 1) * HOP; j++) { s += x[j] * x[j]; }
  const e = Math.sqrt(s / HOP);
  rms[i] = e;
  env[i] = Math.max(0, e - prev); // الطاقة اللي زادت فجأة = ضربة
  prev = e * 0.9 + prev * 0.1;
}
const fps = SR / HOP;
// السرعة: autocorrelation للضربات بين 85 و 170 BPM
let best = { bpm: 0, score: -1 };
for (let bpm = 85; bpm <= 170; bpm += 0.5) {
  const lag = fps * 60 / bpm;
  let sc = 0;
  for (let i = Math.ceil(lag * 2); i < n; i++) sc += env[i] * (0.5 * env[Math.round(i - lag)] + 0.3 * env[Math.round(i - 2 * lag)]);
  if (sc > best.score) best = { bpm, score: sc };
}
// الضربات 90–110 غالباً بتبقى نص سرعة ضربات 180–220؛ وإحنا عايزين نبض الرقص (100–140)
let bpm = best.bpm;
if (bpm < 95) bpm *= 2;
const period = 60 / bpm;
// مكان أول ضربة (phase): أكتر إزاحة بتجمع طاقة ضربات
let ph = { off: 0, sc: -1 };
for (let o = 0; o < period; o += 0.005) {
  let sc = 0;
  for (let t = o; t < n / fps; t += period) sc += env[Math.round(t * fps)] || 0;
  if (sc > ph.sc) ph = { off: o, sc };
}
// أقوى مقطع بالطول المطلوب (متوسط الطاقة) وبيبدأ على ضربة
const perSec = [];
for (let s = 0; s < Math.floor(n / fps); s++) { let a = 0; for (let i = Math.round(s * fps); i < Math.round((s + 1) * fps) && i < n; i++) a += rms[i]; perSec.push(a / fps); }
let win = { start: 0, e: -1 };
for (let s = 0; s + LEN <= perSec.length; s++) { const e = perSec.slice(s, s + LEN).reduce((a, b) => a + b, 0); if (e > win.e) win = { start: s, e }; }
const snap = t => ph.off + Math.round((t - ph.off) / period) * period;
const start = Math.max(0, snap(win.start));
const beats = [];
for (let t = start; t < start + LEN + 0.001; t += period) beats.push(+(t - start).toFixed(3));
const avg = perSec.reduce((a, b) => a + b, 0) / perSec.length;
console.log(JSON.stringify({ file, dur: +(x.length / SR).toFixed(1), bpm, period: +period.toFixed(4), start: +start.toFixed(3), winEnergy: +(win.e / LEN / avg).toFixed(2), loud: +avg.toFixed(4), beats }));
