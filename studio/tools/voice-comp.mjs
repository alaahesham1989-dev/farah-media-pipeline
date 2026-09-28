// تركيب صوت واحد من أحسن جملة في كل تسجيل (نفس الصوت ونفس الإعدادات، والقطع في الوقفات الطبيعية بين الجمل)
//   node tools/voice-comp.mjs <plan.json>
// plan = { out, takes: { A: {file, starts:[بداية كل جملة بالثواني]} , ... }, pick: ["B","C",...] (لكل جملة التسجيل اللي هتتاخد منه) }
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { ROOT } from '../lib/paths.mjs';

const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dur = f => Number(execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const silences = f => {
  const log = spawnSync(ffmpegPath, ['-hide_banner', '-i', f, '-af', 'silencedetect=noise=-40dB:d=0.08', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return [...log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
};
// نقطة القطع: نص أقرب سكتة لبداية الجملة (Whisper بيحدد البداية بالتقريب)
const snap = (sil, t) => {
  let best = null;
  for (const [a, b] of sil) { const d = t < a ? a - t : t > b ? t - b : 0; if (d < 0.45 && (!best || d < best.d)) best = { d, at: (a + b) / 2 }; }
  return best ? best.at : t;
};
const meanDb = (f, a, b) => {
  const log = spawnSync(ffmpegPath, ['-hide_banner', '-ss', String(a), '-t', String(b - a), '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return Number((log.match(/mean_volume: ([-\d.]+) dB/) || [])[1] || -20);
};

const takes = {};
for (const [k, t] of Object.entries(plan.takes)) {
  const f = path.resolve(ROOT, t.file);
  const sil = silences(f);
  const d = dur(f);
  const cuts = t.starts.map((s, i) => (i === 0 ? 0 : snap(sil, s)));
  takes[k] = { f, bounds: cuts.map((c, i) => [c, i + 1 < cuts.length ? cuts[i + 1] : d]) };
}
const segs = plan.pick.map((k, i) => ({ k, i, f: takes[k].f, a: takes[k].bounds[i][0], b: takes[k].bounds[i][1] }));
segs.forEach(s => (s.db = meanDb(s.f, s.a, s.b)));
const target = segs.reduce((x, s) => x + s.db, 0) / segs.length;
const inputs = [], parts = [];
segs.forEach((s, n) => {
  inputs.push('-ss', s.a.toFixed(3), '-t', (s.b - s.a).toFixed(3), '-i', s.f);
  parts.push(`[${n}:a]aresample=44100,volume=${(target - s.db).toFixed(2)}dB,afade=t=in:d=0.015,afade=t=out:st=${(s.b - s.a - 0.02).toFixed(3)}:d=0.02[s${n}]`);
});
const out = path.resolve(ROOT, plan.out);
execFileSync(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';') + ';' + segs.map((_, n) => `[s${n}]`).join('') + `concat=n=${segs.length}:v=0:a=1[o]`, '-map', '[o]', '-b:a', '160k', out]);
let t = 0;
for (const s of segs) { console.log(`جملة ${s.i + 1}: تسجيل ${s.k} ${s.a.toFixed(2)}→${s.b.toFixed(2)} (${(s.db).toFixed(1)}dB) · في الناتج من ${t.toFixed(2)}`); t += s.b - s.a; }
console.log(`✅ ${plan.out} — ${dur(out).toFixed(2)} ث`);
