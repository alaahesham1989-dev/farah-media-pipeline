// المؤثرات الصوتية بتتولد بالكود (FFmpeg) — ملكنا 100%، مفيش رخص ولا حقوق.
//   node tools/make-sfx.mjs
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../lib/paths.mjs';

const OUT = path.join(ROOT, 'assets', 'sfx');
const SFX = {
  // ووش: هوا سريع مع كل انتقال
  whoosh: ['-f', 'lavfi', '-i', 'anoisesrc=color=pink:duration=0.5:amplitude=0.9', '-af', 'bandpass=f=1800:width_type=o:w=2.2,afade=t=in:st=0:d=0.22:curve=qsin,afade=t=out:st=0.22:d=0.28:curve=exp,volume=1.4'],
  // طقة: ظهور كلمة أو كارت
  pop: ['-f', 'lavfi', '-i', 'sine=frequency=1150:duration=0.09', '-af', 'afade=t=out:st=0.01:d=0.08:curve=exp,volume=0.8'],
  // خبطة: الافتتاحية أو السعر
  hit: ['-f', 'lavfi', '-i', 'sine=frequency=55:duration=0.7', '-f', 'lavfi', '-i', 'anoisesrc=color=brown:duration=0.25:amplitude=0.8',
    '-filter_complex', '[0]afade=t=out:st=0.02:d=0.68:curve=exp,volume=2.2[a];[1]lowpass=f=900,afade=t=out:st=0.01:d=0.24:curve=exp[b];[a][b]amix=inputs=2:normalize=0,volume=1.3'],
  // كاش: السعر وصل
  ding: ['-f', 'lavfi', '-i', 'sine=frequency=1568:duration=0.5', '-f', 'lavfi', '-i', 'sine=frequency=2093:duration=0.5',
    '-filter_complex', '[0]afade=t=out:st=0.02:d=0.48:curve=exp[a];[1]adelay=70,afade=t=out:st=0.05:d=0.45:curve=exp[b];[a][b]amix=inputs=2:normalize=0,volume=0.55'],
  // صوت بيعلى قبل «اطلب دلوقتي»
  riser: ['-f', 'lavfi', '-i', 'anoisesrc=color=white:duration=1.3:amplitude=0.6', '-af', 'highpass=f=1200,afade=t=in:st=0:d=1.25:curve=exp,afade=t=out:st=1.22:d=0.08,volume=0.9'],
};
for (const [name, args] of Object.entries(SFX)) {
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args, '-ar', '44100', '-ac', '2', path.join(OUT, name + '.wav')]);
  console.log('🔊', name);
}
