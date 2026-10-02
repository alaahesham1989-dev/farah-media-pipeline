// تنضيف مخزن الموقع (R2 farah-media) من النسخ اللي مابقاش ليها لازمة — قرار المالك 2/10.
//   - ريلز المنتجات (videos/reels/<code>/<sig>.*) ومحتوى الدعاية (promo/.../<sig>.*):
//     بيفضل بس: النسخة اللي في الفهرس دلوقتي + أي نسخة طابور النشر لسه محتاجها (مستنية مراجعة أو متجدولة ومااتنشرتش).
//     النسخ القديمة والعروض اللي خلصت بتتمسح لو آخر تعديل عليها عدّى من 3 أيام (ميتا تكون خلصت سحب الفيديو).
//   - مابيلمسش أي حاجة تانية: صور المنتجات والمكتبة (catalog/) واللقطات (stock/) والملفات الخاصة (private/) والفهارس.
//   MEDIA_BUCKET=farah-media node scripts/storage-cleanup.mjs           ← عرض بس (مفيش مسح)
//   MEDIA_BUCKET=farah-media node scripts/storage-cleanup.mjs --apply   ← تنفيذ
import { ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { s3 } from './storage.mjs';

const Bucket = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const APPLY = process.argv.includes('--apply');
const KEEP_DAYS = 3;
process.on('unhandledRejection', e => { console.log('::error::' + String(e && e.message || e).slice(0, 300)); process.exit(1); });

async function json(Key) {
  try { const r = await s3().send(new GetObjectCommand({ Bucket, Key })); return JSON.parse(await r.Body.transformToString()); }
  catch (e) { if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey') return null; throw e; }
}
async function list(Prefix) {
  const out = []; let token;
  do {
    const r = await s3().send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of r.Contents || []) out.push({ k: o.Key, s: o.Size || 0, t: +new Date(o.LastModified) });
    token = r.IsTruncated ? r.NextContinuationToken : null;
  } while (token);
  return out;
}
const sigOf = key => key.split('/').pop().split(/[-.]/)[0];
const dirOf = key => key.split('/').slice(0, -1).join('/');

// 1) اللي لازم يفضل
const keep = new Set();   // "dir|sig"
const reels = await json('videos/reels/index.json');
const promo = await json('promo/index.json');
const queue = await json('private/social/queue.json');
if (!reels || !promo || !queue) { console.log('::error::فهرس ناقص (ريلز/دعاية/طابور) — مفيش تنضيف عشان مانمسحش حاجة لسه مستخدمة'); process.exit(1); }
const mark = url => { const m = String(url || '').match(/\/media\/(.+)$/); if (m) keep.add(dirOf(m[1]) + '|' + sigOf(m[1])); };
for (const it of Object.values(reels.items || {})) { mark(it.url); mark(it.poster); mark(it.sheet); }
for (const it of Object.values(promo.items || {})) { mark(it.url); mark(it.poster); mark(it.sheet); }
const FINAL = ['done', 'error', 'skipped', 'expired', 'cancelled'];
let pending = 0;
for (const it of Object.values(queue.items || {})) {
  const chans = Object.values(it.parts || {}).flatMap(p => Object.values(p));
  const open = it.status === 'review' || (it.status === 'approved' && (!chans.length || chans.some(c => !FINAL.includes(c.state))));
  if (!open) continue;
  pending++;
  for (const u of [it.url, it.video, it.image, it.poster, it.sheet]) mark(u);
}

// 2) المرشحين للمسح
const now = Date.now();
const all = [...await list('videos/reels/'), ...await list('promo/')].filter(o => /\.(mp4|jpe?g|png|webp)$/i.test(o.k));
const del = all.filter(o => !keep.has(dirOf(o.k) + '|' + sigOf(o.k)) && now - o.t > KEEP_DAYS * 86400000);
const sum = a => a.reduce((x, o) => x + o.s, 0);
const mb = n => (n / 1024 ** 2).toFixed(0) + ' MB';
const lines = [
  `ملفات الريلز والدعاية: ${all.length} (${mb(sum(all))}) · محفوظ للنسخ الحالية والطابور (${pending} عنصر مفتوح): ${all.length - del.length}`,
  `${APPLY ? 'اتمسح' : 'هيتمسح'}: ${del.length} ملف · ${mb(sum(del))}`,
];
if (APPLY) {
  for (let i = 0; i < del.length; i += 1000) {
    const chunk = del.slice(i, i + 1000);
    await s3().send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: chunk.map(o => ({ Key: o.k })), Quiet: true } }));
  }
}
console.log(lines.join('\n'));
for (const l of lines) console.log(`::notice::${l}`);
