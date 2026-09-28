// محرك الفيديو — من غير توليد فيديو بالذكاء الاصطناعي:
//   كل مشهد = كارت من القوالب (بيتحرك بالـCSS ونصوّره فريم بفريم) أو لقطة حقيقية من فيديو المنتج وعليها كلام.
//   وبعدين: انتقالات ناعمة + صوت لكل مشهد + مزيكا (اختياري) → mp4 طولي جاهز للريلز/تيك توك.
//
// الـstoryboard:
// { name, format: 'story', skin, fps: 30, voice: { name: 'ar-EG-SalmaNeural', rate: '+4%' } | null, music: 'assets/music/x.mp3' | null,
//   transition: 'fade' | 'slideleft' | ..., scenes: [
//     { template: 'brand-hook', data: {...}, dur: 2.5, say: 'الجملة اللي بتتقال' },
//     { clip: 'https://…/real.mp4', from: 2, dur: 3, caption: 'كلام فوق اللقطة', say: '…' } ] }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { ROOT, OUT, TMP } from './paths.mjs';
import { openStage, mountOn } from './browser.mjs';
import { FORMATS } from '../engine/formats.js';
import { speakWords, alignWords } from './tts.mjs';
import { resolveJob } from './resolve.mjs';

const X264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p'];
const ff = args => execFileSync(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
export const durationOf = f => Number(execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) || 0;

async function fetchTo(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return file;
  if (!/^https?:/.test(url)) { fs.copyFileSync(path.resolve(ROOT, url), file); return file; }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`مقدرناش ننزل ${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

// كارت متحرك → mp4 (بنصوّر كل فريم بالظبط، فمفيش تقطيع ولا فرق بين جهاز وجهاز)
async function renderCard(page, job, d, fps, file) {
  const { W, H } = await mountOn(page, { ...job, dur: d }, 'anim');
  const n = Math.round(d * fps);
  const proc = spawn(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...X264, '-r', String(fps), file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr.on('data', b => (err += b));
  const done = new Promise((ok, bad) => proc.on('close', c => (c === 0 ? ok() : bad(new Error('ffmpeg: ' + err)))));
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.STAGE.seek(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: W, height: H } });
    if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
  }
  proc.stdin.end();
  await done;
}

// لقطة حقيقية + (كلام فوقها كطبقة شفافة من قالب brand-caption)
//   speed: 1.4 → أسرع (speed ramp) · zoom: [1, 1.25] → زووم بطيء لجوه خلال المشهد · ox/oy (0-100): مركز الزووم
//   overlay: 'v-overlay' → طبقة متحركة (العنوان بيطلع، الشارة، الكلمات، والكلام مع الصوت) بنصوّرها فريم بفريم فوق اللقطة
async function renderClip(page, sc, sb, fps, file, tmp) {
  const fmt = sb.format || 'story';
  const { W, H } = FORMATS[fmt];
  fs.mkdirSync(path.join(ROOT, 'cache', 'clips'), { recursive: true });
  const src = await fetchTo(sc.clip, path.join(ROOT, 'cache', 'clips', 'src-' + crypto.createHash('sha1').update(sc.clip).digest('hex').slice(0, 10) + path.extname(new URL(sc.clip, 'http://x').pathname || '.mp4')));
  const srcDur = durationOf(src);
  const speed = Number(sc.speed) || 1;
  const need = sc.d * speed;
  const from = Math.max(0, Math.min(Number(sc.from) || 0, Math.max(0, srcDur - need - 0.05)));
  const n = Math.round(sc.d * fps);
  const [z0, z1] = Array.isArray(sc.zoom) ? sc.zoom.map(Number) : [Number(sc.zoom) || 1, Number(sc.zoom) || 1];
  // لو اللقطة أقصر من المطلوب، آخر فريم بيفضل واقف بدل ما المشهد يقصر
  let base = `[0:v]setpts=(PTS-STARTPTS)/${speed},fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,tpad=stop_mode=clone:stop_duration=${sc.d.toFixed(2)}`;
  // blur: [[x,y,w,h], …] بنسب الكادر — بيغبّش كلام مكتوب على اللقطة الأصلية (قبل الزووم)
  (sc.blur || []).forEach(([x, y, w, h], i) => {
    const p = v => Number(v).toFixed(4);
    base += `[pre${i}];[pre${i}]split[m${i}][s${i}];[s${i}]crop=iw*${p(w)}:ih*${p(h)}:iw*${p(x)}:ih*${p(y)},boxblur=luma_radius='min(20,min(w,h)/2-1)':luma_power=5:chroma_radius='min(10,min(cw,ch)/2-1)':chroma_power=5[b${i}];[m${i}][b${i}]overlay=W*${p(x)}:H*${p(y)}`;
  });
  // حركة الكاميرا: zoom [من، لحد] + مركز ثابت (ox/oy) أو متحرك: pan [ox من، لحد] / panY [oy من، لحد] (يمين/شمال/درون)
  const [px0, px1] = Array.isArray(sc.pan) ? sc.pan.map(Number) : [Number(sc.ox ?? 50), Number(sc.ox ?? 50)];
  const [py0, py1] = Array.isArray(sc.panY) ? sc.panY.map(Number) : [Number(sc.oy ?? 50), Number(sc.oy ?? 50)];
  if (z0 !== 1 || z1 !== 1) {
    const k = `min(on/${n}\\,1)`;
    const ease = `(${k}*${k}*(3-2*${k}))`; // smoothstep: بتبدأ وتقف بنعومة زي كاميرا حقيقية
    const lin = (a, b) => `(${(a / 100).toFixed(4)}+${((b - a) / 100).toFixed(4)}*${ease})`;
    base += `,scale=${W * 2}:${H * 2}:flags=bicubic,zoompan=z='${z0}+${(z1 - z0).toFixed(4)}*${ease}':x='(iw-iw/zoom)*${lin(px0, px1)}':y='(ih-ih/zoom)*${lin(py0, py1)}':d=1:s=${W}x${H}:fps=${fps}`;
  }
  base += `,eq=saturation=1.06:contrast=1.03[v]`;
  const inputs = ['-ss', from.toFixed(3), '-t', need.toFixed(3), '-i', src];

  if (sc.overlay) {
    const job = { template: sc.overlay, skin: sb.skin, format: fmt, transparent: true, dur: sc.d, data: { ...(sc.data || {}), headline: sc.caption ?? sc.data?.headline ?? '' } };
    await mountOn(page, job, 'anim');
    const proc = spawn(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-filter_complex', base + `;[1:v]format=rgba[c];[v][c]overlay=0:0:eof_action=repeat[o]`, '-map', '[o]', '-an', ...X264, '-r', String(fps), '-frames:v', String(n), file], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', b => (err += b));
    const done = new Promise((ok, bad) => proc.on('close', c => (c === 0 ? ok() : bad(new Error('ffmpeg: ' + err)))));
    proc.stdin.on('error', () => {});
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => window.STAGE.seek(t), i / fps);
      const buf = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
      if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
    }
    proc.stdin.end();
    await done;
    return;
  }

  let filter = base;
  let last = 'v';
  if (sc.caption || sc.brandTag !== false) {
    const png = path.join(tmp, path.basename(file, '.mp4') + '-cap.png');
    await mountOn(page, sc.overlay
      ? { template: sc.overlay, skin: sb.skin, format: sb.format || 'story', transparent: true, data: { headline: sc.caption || '' } }
      : { template: 'brand-caption', skin: sb.skin, format: sb.format || 'story', transparent: true, data: { text: sc.caption || '', pos: sc.pos || 'bottom', brandTag: sc.brandTag } }, 'static');
    await page.screenshot({ path: png, type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    inputs.push('-loop', '1', '-t', String(sc.d), '-i', png);
    filter += `;[1:v]format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1[c];[v][c]overlay=0:0:shortest=1[o]`;
    last = 'o';
  }
  ff([...inputs, '-filter_complex', filter, '-map', `[${last}]`, '-an', ...X264, '-r', String(fps), '-frames:v', String(n), file]);
}

// الكلمات اللي بتطلع واحدة واحدة (labels): كل واحدة بتطلع مع الكلمة اللي بتتقال في الصوت، ومعاها «بوب» خفيف.
// الكلمة الأولى من كل label بتتدور عليها في الصوت؛ اللي مالقيناهاش بتطلع بعد اللي قبلها بنص ثانية.
function labelize(sc) {
  const ls = sc.data?.labels;
  if (!ls?.length || sc.data.labelsAt || !sc.data.words?.length) return sc;
  const bare = x => String(x).replace(/[^ء-ي\w]/g, '');
  const found = ls.map(l => sc.data.words.find(w => bare(w.w).includes(bare(String(l).split(/\s+/)[0])))?.t0 ?? null);
  if (!found.some(x => x != null)) return sc;
  const at = [];
  found.forEach((t, i) => at.push(t ?? (i ? at[i - 1] + 0.5 : 0.4)));
  sc.data = { ...sc.data, labelsAt: at.map(t => +Math.max(0.05, t - 0.05).toFixed(2)) };
  sc.sfx = [...(sc.sfx || []), ...at.map(t => ({ s: 'pop', at: t, v: 0.3 }))];
  return sc;
}

export async function makeVideo(baseUrl, sb, { store, onLog = console.log, onStoryboard } = {}) {
  const fps = sb.fps || 30;
  const fmt = sb.format || 'story';
  const T = sb.transition === 'none' ? 0 : (sb.transitionDur ?? 0.35);
  const name = (sb.name || 'video') + '-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const tmp = path.join(TMP, 'video', name);
  fs.mkdirSync(tmp, { recursive: true });
  const outDir = path.join(OUT, 'videos');
  fs.mkdirSync(outDir, { recursive: true });
  onStoryboard?.(sb);

  // 1) الصوت (بيحدد طول كل مشهد) + توقيت الكلمات للكلام اللي بيظهر مع الصوت
  // voiceTrack = تسجيل واحد متصل للإعلان كله (زي ElevenLabs) + توقيت كلماته، وكل مشهد عليه vt = ثانية بداية جملته في التسجيل.
  // الصوت مابيتقطعش: المشاهد هي اللي بتتقص على توقيته (كل مشهد طوله = المسافة لحد الجملة اللي بعدها).
  const track = sb.voiceTrack ? { file: path.resolve(ROOT, sb.voiceTrack.file), words: JSON.parse(fs.readFileSync(path.resolve(ROOT, sb.voiceTrack.words), 'utf8')) } : null;
  if (track) track.dur = durationOf(track.file);
  const L = 0.2 + T; // الصوت بيبدأ بعد ما الانتقال يخلص
  const vt0 = track ? sb.scenes.find(s => s.vt != null)?.vt ?? 0 : 0;
  const B = t => Math.round((t - vt0) * fps) / fps;
  const scenes = [];
  for (const [i, s] of sb.scenes.entries()) {
    let audio = null, ad = 0, words = [];
    if (track && s.vt != null) {
      const next = sb.scenes.slice(i + 1).find(x => x.vt != null)?.vt;
      const end = next ?? track.dur;
      words = track.words.filter(w => w.t0 >= s.vt - 0.05 && w.t0 < end - 0.05).map(w => ({ w: w.w, t0: w.t0 - s.vt, t1: w.t1 - s.vt }));
      const d = next != null ? B(next) - B(s.vt) + T : (end - s.vt) + (Number(s.tail) || 1.2);
      const sc = { ...s, i, audio: null, ad: end - s.vt, d: Math.round(d * fps) / fps, lead: L, fromTrack: true };
      if (words.length) sc.data = { ...(s.data || {}), words: words.map(w => ({ w: w.w, t0: +(w.t0 + L).toFixed(3), t1: +(w.t1 + L).toFixed(3) })) };
      scenes.push(labelize(sc));
      continue;
    }
    if (s.voiceFile) {
      // صوت متسجل جاهز (زي تسجيل ElevenLabs من الموقع، مقطّع جملة جملة) — التوقيت بنطلعه من الصوت نفسه
      audio = path.resolve(ROOT, s.voiceFile); ad = durationOf(audio);
      words = s.say ? alignWords(s.say, audio, ad) : [];
    } else if (s.say && sb.voice) {
      const r = await speakWords(s.say, sb.voice, onLog);
      audio = r.file; ad = durationOf(audio);
      words = r.words.length ? r.words : (await speakWords(s.say, sb.voice, onLog, ad)).words;
    }
    const d = Math.max(Number(s.dur) || 2.5, ad ? ad + 0.55 + T : 0);
    const lead = 0.2 + (i ? T : 0);
    const sc = { ...s, i, audio, ad, d: Math.round(d * fps) / fps, lead };
    if (words.length && (String(s.template || '').startsWith('v-') || String(s.overlay || '').startsWith('v-') || s.captions)) sc.data = { ...(s.data || {}), words: words.map(w => ({ w: w.w, t0: w.t0 + lead, t1: w.t1 + lead })) };
    scenes.push(labelize(sc));
  }

  // 2) المشاهد
  const page = await openStage(baseUrl, fmt);
  try {
    for (const sc of scenes) {
      sc.file = path.join(tmp, `s${String(sc.i).padStart(2, '0')}.mp4`);
      const t0 = Date.now();
      if (sc.clip) await renderClip(page, sc, sb, fps, sc.file, tmp);
      else await renderCard(page, resolveJob({ template: sc.template, skin: sc.skin || sb.skin, format: fmt, product: sc.product, offer: sc.offer, imageIndex: sc.imageIndex, data: sc.data }, store), sc.d, fps, sc.file);
      onLog(`🎞️ مشهد ${sc.i + 1}/${scenes.length} (${sc.template || 'لقطة حقيقية'}) — ${sc.d.toFixed(1)} ث في ${((Date.now() - t0) / 1000).toFixed(0)} ث`);
    }
  } finally { await page.close(); }

  // 3) تركيب المشاهد بانتقالات + الصوت على نفس التوقيت
  const starts = [];
  let acc = 0;
  for (const sc of scenes) { starts.push(acc); acc += sc.d - T; }
  const total = acc + T;
  const inputs = scenes.flatMap(sc => ['-i', sc.file]);
  let vf = '';
  if (scenes.length === 1) vf = '[0:v]null[vout]';
  else {
    let prev = '[0:v]';
    for (let k = 1; k < scenes.length; k++) {
      const cycle = sb.transitions || null;
      const tr = scenes[k].transition || (cycle ? cycle[(k - 1) % cycle.length] : sb.transition || 'fade');
      const out = k === scenes.length - 1 ? '[vout]' : `[x${k}]`;
      vf += `${vf ? ';' : ''}${prev}[${k}:v]xfade=transition=${T ? tr : 'fade'}:duration=${T || 0.01}:offset=${(starts[k]).toFixed(3)}${out}`;
      prev = out;
    }
  }
  const voiced = scenes.filter(s => s.audio);
  let n = scenes.length;
  const ain = [];
  for (const s of voiced) { inputs.push('-i', s.audio); ain.push(`[${n}:a]adelay=${Math.round((starts[s.i] + s.lead) * 1000)}:all=1,volume=1.0[a${n}]`); n++; }
  const first = scenes.find(s => s.fromTrack);
  if (track && first) {
    // التسجيل كله مرة واحدة، متظبط بحيث كل جملة تبدأ مع مشهدها
    const at = starts[first.i] + L - first.vt;
    inputs.push('-i', track.file);
    ain.push(`[${n}:a]${at >= 0 ? `adelay=${Math.round(at * 1000)}:all=1` : `atrim=start=${(-at).toFixed(3)},asetpts=PTS-STARTPTS`},volume=1.0[a${n}]`);
    voiced.push(first);
    n++;
  }
  // المؤثرات: ووش مع كل انتقال + اللي المشهد طالبه (hit/pop/ding/riser) — ملفات متولّدة بالكود في assets/sfx
  const sfx = [];
  if (sb.sfx !== false) {
    for (const sc of scenes) {
      if (sc.i > 0 && sb.autoWhoosh !== false) sfx.push({ s: 'whoosh', at: Math.max(0, starts[sc.i] - 0.12), v: 0.32 });
      for (const e of sc.sfx || []) sfx.push({ s: e.s, at: starts[sc.i] + (e.at || 0), v: e.v ?? 0.5 });
    }
  }
  for (const e of sfx) {
    const f = path.join(ROOT, 'assets', 'sfx', e.s + '.wav');
    if (!fs.existsSync(f)) continue;
    inputs.push('-i', f);
    ain.push(`[${n}:a]adelay=${Math.round(e.at * 1000)}:all=1,volume=${e.v}[a${n}]`);
    n++;
  }
  let music = null;
  if (sb.music) {
    const mf = path.resolve(ROOT, sb.music);
    if (fs.existsSync(mf)) { inputs.push(...(sb.musicStart ? ['-ss', String(sb.musicStart)] : []), '-stream_loop', '-1', '-i', mf); music = n++; }
  }
  let af = ain.join(';');
  const mixIn = ain.map(x => x.slice(x.lastIndexOf('[')));
  if (music !== null) { af += `${af ? ';' : ''}[${music}:a]volume=${sb.musicVolume ?? (voiced.length ? 0.16 : 0.5)},afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2[m]`; mixIn.push('[m]'); }
  const hasAudio = mixIn.length > 0;
  if (hasAudio) af += `;${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)},loudnorm=I=-15:TP=-1.5[aout]`;
  if (sb.grade !== false) vf += `;[vout]eq=contrast=1.06:saturation=1.1:gamma=0.97,noise=alls=4:allf=t+u,vignette=angle=PI/5[vgr]`;
  const vmap = sb.grade !== false ? '[vgr]' : '[vout]';
  const final = path.join(outDir, name + '.mp4');
  ff([...inputs, '-filter_complex', vf + (hasAudio ? ';' + af : ''), '-map', vmap, ...(hasAudio ? ['-map', '[aout]', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000'] : []),
    ...X264, '-r', String(fps), '-t', total.toFixed(3), '-movflags', '+faststart', final]);
  ff(['-ss', String(Math.min(1.2, total / 3)), '-i', final, '-frames:v', '1', '-q:v', '3', final.replace(/\.mp4$/, '.jpg')]);
  fs.writeFileSync(final.replace(/\.mp4$/, '.json'), JSON.stringify(sb, null, 1));
  onLog(`✅ الفيديو جاهز — ${total.toFixed(1)} ثانية، ${(fs.statSync(final).size / 1048576).toFixed(1)}MB`);
  if (!process.env.KEEP_TMP) fs.rmSync(tmp, { recursive: true, force: true });
  return path.relative(ROOT, final).replace(/\\/g, '/');
}
