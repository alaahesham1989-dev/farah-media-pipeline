// نسخ صغيرة (480px WebP) من صور المنتجات للكروت والمصغرات في متجر فرح — أخف على باقة الموبايل.
// بيقرا المنتجات من https://farahegypt.com/api/store-data (عام)، وبيكتب في مخزن الموقع (farah-media): thumbs/<نفس المسار>.webp
// اللي معمول قبل كده مابيتعملش تاني (إلا بـ --force). المتجر بيرجع للصورة الأصلية لوحده لو النسخة الصغيرة مش موجودة.
// قاعدة اسم الملف لازم تفضل نفس thumbKey في farah-store/js/data.js.
//   node scripts/thumbs.mjs            ← يعمل الناقص
//   node scripts/thumbs.mjs --force    ← يعيد الكل
import sharp from 'sharp';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3, putFileTo } from './storage.mjs';

const SITE = 'https://farahegypt.com';
const BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const WIDTH = 480;
const FORCE = process.argv.includes('--force');

// نفس imgUrl في js/data.js
function imgUrl(src) {
  const s = String(src || '').trim();
  if (!s || s.startsWith('data:')) return null;
  if (/^(https?:)?\/\//i.test(s)) return s;
  if (/^[a-z]+:/i.test(s)) return null;
  return s.startsWith('/') ? s : '/' + s.replace(/^(\.{1,2}\/)+/, '');
}
// نفس thumbKey في js/data.js
function thumbKey(u) {
  let url;
  try { url = new URL(u, SITE + '/'); } catch { return null; }
  if (!/(^|\.)farahegypt\.com$|^farah-store\.pages\.dev$/.test(url.hostname)) return null;
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* زي ما هو */ }
  path = path.replace(/^\/+/, '').replace(/^media\//, '');
  if (path.startsWith('thumbs/') || !/\.(jpe?g|png|webp)$/i.test(path)) return null;
  return 'thumbs/' + path.replace(/\.(jpe?g|png|webp)$/i, '').replace(/[^A-Za-z0-9/_.-]/g, '_') + '.webp';
}
async function exists(key) {
  try { await s3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; }
  catch (e) { if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false; throw e; }
}

const sd = await (await fetch(`${SITE}/api/store-data`)).json();
const jobs = new Map();
for (const p of sd.products || []) {
  const meta = Array.isArray(p.imagesMeta) ? p.imagesMeta.filter(m => m && m.url).map(m => m.url) : [];
  const list = meta.length ? meta : (Array.isArray(p.images) ? p.images : p.mainImg ? [p.mainImg] : []);
  for (const raw of list) {
    const u = imgUrl(raw);
    const key = u && thumbKey(u);
    if (key && !jobs.has(key)) jobs.set(key, new URL(u, SITE + '/').href);
  }
}
console.log(`🖼️ ${jobs.size} صورة في ${sd.products?.length || 0} منتج`);

let made = 0, skipped = 0, failed = 0, before = 0, after = 0;
const queue = [...jobs.entries()];
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const [key, src] = job;
    try {
      if (!FORCE && await exists(key)) { skipped++; continue; }
      const r = await fetch(src);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const out = await sharp(buf).rotate().resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      await putFileTo(BUCKET, key, out, 'image/webp');
      made++; before += buf.length; after += out.length;
    } catch (e) {
      failed++;
      console.log(`⚠️ ${src} → ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const kb = n => `${Math.round(n / 1024)} KB`;
console.log(`✅ اتعمل ${made} · موجود قبل كده ${skipped} · فشل ${failed}${made ? ` · الحجم ${kb(before)} ← ${kb(after)}` : ''}`);
if (failed && !made && !skipped) process.exit(1);
