// قراية الكلام اللي على صور المنتجات المنشورة (عشان نعرف صور الإعلانات والكلام الكتير) — على الكمبيوتر السحابي
//   الخطة: <MEDIA_BUCKET>/private/ocr-plan.json  = { code: [روابط الصور] }  (بيعملها الموقع: POST /api/ocr-plan)
//   النتيجة: <MEDIA_BUCKET>/private/ocr-result.json = { code: [{ url, letters, arabic, text }] }
// الصور بتتقرا من الموقع العام، ومفيش أي داتا بتتحط في المشروع.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getJsonFrom, putJsonTo } from './storage.mjs';

const MEDIA_BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const SITE = 'https://farahegypt.com';
const TMP = path.resolve('tmp/ocr');
fs.mkdirSync(TMP, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();

const plan = await getJsonFrom(MEDIA_BUCKET, 'private/ocr-plan.json', {});
const out = {};
let n = 0;
for (const [code, urls] of Object.entries(plan)) {
  out[code] = [];
  for (const u of urls) {
    const url = /^https?:/.test(u) ? u : SITE + u;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const src = path.join(TMP, 'x'), png = path.join(TMP, 'x.png');
      fs.writeFileSync(src, Buffer.from(await r.arrayBuffer()));
      run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', "scale='min(1600,iw)':-2", '-frames:v', '1', png]);
      let text = '';
      try { text = run('tesseract', [png, 'stdout', '-l', 'ara+eng', '--psm', '11']).replace(/\s+/g, ' ').trim(); } catch { /* */ }
      const letters = (text.match(/\p{L}/gu) || []).length;
      const arabic = (text.match(/[؀-ۿ]/g) || []).length;
      out[code].push({ url: u, letters, arabic, text: text.slice(0, 200) });
    } catch (e) {
      out[code].push({ url: u, error: e.message });
    }
    n++;
  }
  console.log(`✓ ${code} ${out[code].map(x => x.error ? '✗' : x.letters).join(',')}`);
}
await putJsonTo(MEDIA_BUCKET, 'private/ocr-result.json', { at: new Date().toISOString(), result: out });
console.log(`✅ اتقرت ${n} صورة من ${Object.keys(plan).length} منتج`);
