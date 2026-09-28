// الصوت: 3 مصادر، وكل جملة بتتحفظ مرة واحدة (نفس الجملة بنفس الصوت مابتتدفعش مرتين).
//   edge        مجاني (صوت مايكروسوفت المصري: سلمى/شاكر) — للتجربة. الرخصة التجارية مش مضمونة.
//   gemini      من Google AI Studio (مفتاح GEMINI_API_KEY) — الموديل من GEMINI_TTS_MODEL
//   elevenlabs  أحسن جودة (مفتاح ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID) — الخطة المدفوعة بس فيها رخصة تجارية
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from './paths.mjs';

const CACHE = path.join(ROOT, 'cache', 'tts2');

export function voiceProvider(voice) {
  if (!voice) return null;
  if (voice.provider) return voice.provider;
  if (/^ar-|Neural$/.test(voice.name || '')) return 'edge';
  return process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : process.env.GEMINI_API_KEY ? 'gemini' : 'edge';
}

export async function speak(text, voice, onLog = () => {}) {
  const provider = voiceProvider(voice);
  const name = voice.name || (provider === 'edge' ? 'ar-EG-SalmaNeural' : provider === 'gemini' ? (process.env.GEMINI_TTS_VOICE || 'Kore') : process.env.ELEVENLABS_VOICE_ID);
  if (provider === 'elevenlabs' && !(process.env.ELEVENLABS_API_KEY && name)) throw new Error('حط ELEVENLABS_API_KEY و ELEVENLABS_VOICE_ID في ملف .env الأول');
  if (provider === 'gemini' && !process.env.GEMINI_API_KEY) throw new Error('حط GEMINI_API_KEY في ملف .env الأول');
  fs.mkdirSync(CACHE, { recursive: true });
  const key = crypto.createHash('sha1').update([provider, name, voice.rate || '', text].join('|')).digest('hex').slice(0, 16);
  const file = path.join(CACHE, key + '.mp3');
  const wordsFile = file.replace(/\.mp3$/, '.words.json');
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return file;

  if (provider === 'edge') {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(name, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const dir = path.join(CACHE, 'tmp-' + key);
    fs.mkdirSync(dir, { recursive: true });
    const r = await tts.toFile(dir, text, { rate: voice.rate || '+0%' });
    fs.copyFileSync(r.audioFilePath, file);
    // توقيت كل كلمة (بوحدات 100 نانوثانية) — بنحفظه جنب الصوت للكلام اللي بيظهر كلمة كلمة
    try {
      const meta = JSON.parse(fs.readFileSync(r.metadataFilePath, 'utf8')).Metadata || [];
      const words = meta.filter(m => m.Type === 'WordBoundary').map(m => ({ w: m.Data.text.Text, t0: m.Data.Offset / 1e7 + 0.1, t1: (m.Data.Offset + m.Data.Duration) / 1e7 + 0.1 }));
      fs.writeFileSync(wordsFile, JSON.stringify(words));
    } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
    tts.close?.();
  } else if (provider === 'gemini') {
    const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `اقرأ الجملة دي بلهجة مصرية طبيعية ودافية: ${text}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } } } }),
    });
    const j = await r.json();
    const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) throw new Error('جيميناي مارجّعش صوت: ' + JSON.stringify(j).slice(0, 300));
    const pcm = file + '.pcm';
    fs.writeFileSync(pcm, Buffer.from(b64, 'base64'));
    execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcm, '-b:a', '128k', file]);
    fs.rmSync(pcm);
  } else if (provider === 'elevenlabs') {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${name}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' }),
    });
    if (!r.ok) throw new Error('ElevenLabs: ' + r.status + ' ' + (await r.text()).slice(0, 200));
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  } else throw new Error('مصدر صوت مش معروف: ' + provider);

  trimSilence(file);
  onLog(`🔊 ${provider}: ${text.slice(0, 50)}`);
  return file;
}

// السكوت في آخر الجملة بيطوّل المشهد على الفاضي — بنشيله (الأول بنسيبه عشان توقيت الكلمات يفضل مظبوط)
function trimSilence(file) {
  const t = file + '.trim.mp3';
  const f = 'areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.12,areverse';
  try { execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', file, '-af', f, '-b:a', '128k', t]); fs.renameSync(t, file); } catch { fs.rmSync(t, { force: true }); }
}

// الصوت + توقيت كل كلمة. لو المصدر مابيدّيش توقيت (جيميناي/ElevenLabs العادي) بنقسّم المدة على الكلمات بطولها.
export async function speakWords(text, voice, onLog, duration) {
  const file = await speak(text, voice, onLog);
  const wf = file.replace(/\.mp3$/, '.words.json');
  let words = [];
  try { words = JSON.parse(fs.readFileSync(wf, 'utf8')); } catch {}
  if (!words.length && duration) words = alignWords(text, file, duration);
  return { file, words };
}

// توقيت الكلمات لصوت متسجل من غير توقيت (زي ملف ElevenLabs من الموقع):
// بنقسم الجملة عند الوقفات (… ، .) ونلاقي أماكن الكلام في الصوت نفسه (بين فترات السكوت)، ولو العدد اتطابق كل جزء بياخد مكانه،
// ولو ماتطابقش بنقسم المدة كلها على الكلمات بطولها.
export function alignWords(text, file, duration) {
  const phrases = String(text).split(/(?<=[…،,.؟?!:])\s+/).map(p => p.trim()).filter(Boolean);
  const spread = (ws, t0, t1) => {
    const total = ws.reduce((a, w) => a + w.length + 1, 0);
    let t = t0;
    return ws.map(w => { const d = (t1 - t0) * (w.length + 1) / total; const o = { w: w.replace(/[،,.؟?!:…]/g, ''), t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }; t += d; return o; });
  };
  const regions = speechRegions(file, duration);
  if (regions.length === phrases.length) return phrases.flatMap((p, i) => spread(p.split(/\s+/).filter(Boolean), regions[i][0], regions[i][1]));
  const first = regions[0]?.[0] ?? 0.1, last = regions.at(-1)?.[1] ?? Math.max(0.5, duration - 0.2);
  return spread(String(text).split(/\s+/).filter(Boolean), first, last);
}

// أماكن الكلام في الملف (بين فترات السكوت اللي أطول من ربع ثانية)
export function speechRegions(file, duration) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-38dB:d=0.22', '-f', 'null', '-'], { encoding: 'utf8' });
  const log = r.stderr || '';
  const sil = [];
  for (const m of log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push([Number(m[1]), Number(m[2])]);
  const out = [];
  let t = 0;
  for (const [s, e] of sil) { if (s - t > 0.12) out.push([t, s]); t = e; }
  if (duration - t > 0.12) out.push([t, duration]);
  return out;
}
