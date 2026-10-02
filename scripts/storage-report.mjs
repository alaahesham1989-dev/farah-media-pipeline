// تقرير مساحة مخزن الموقع (R2 farah-media) — قراية بس، مفيش أي مسح.
// بيجمع الحجم حسب الفولدر (مستويين) ويطلّع أكبرهم، وعدد نسخ كل ريل/صورة دعاية (النسخ القديمة = اللي هيتنضف بعدين).
//   MEDIA_BUCKET=farah-media node scripts/storage-report.mjs
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3 } from './storage.mjs';

const Bucket = (process.env.MEDIA_BUCKET || 'farah-media').trim();
process.on('unhandledRejection', e => { console.log('::error::' + String(e && e.message || e).slice(0, 300)); process.exit(1); });
const objs = [];
let token;
do {
  const r = await s3().send(new ListObjectsV2Command({ Bucket, ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents || []) objs.push({ k: o.Key, s: o.Size || 0, t: o.LastModified });
  token = r.IsTruncated ? r.NextContinuationToken : null;
} while (token);

const gb = n => (n / 1024 ** 3).toFixed(2) + ' GB';
const mb = n => (n / 1024 ** 2).toFixed(0) + ' MB';
const total = objs.reduce((a, o) => a + o.s, 0);
const by = (depth) => {
  const m = new Map();
  for (const o of objs) { const p = o.k.split('/').slice(0, depth).join('/'); const x = m.get(p) || { n: 0, s: 0 }; x.n++; x.s += o.s; m.set(p, x); }
  return [...m.entries()].sort((a, b) => b[1].s - a[1].s);
};
const lines = [`المجموع: ${objs.length} ملف · ${gb(total)}`];
lines.push('— أكبر الفولدرات (مستوى 1):');
for (const [p, x] of by(1).slice(0, 12)) lines.push(`  ${p}: ${x.n} ملف · ${mb(x.s)}`);
lines.push('— أكبر الفولدرات (مستوى 2):');
for (const [p, x] of by(2).slice(0, 20)) lines.push(`  ${p}: ${x.n} ملف · ${mb(x.s)}`);
// نسخ الريلز والدعاية: الفولدر = منتج/عرض، والملفات = بصمات (sig)
const ver = (prefix, depth) => {
  const m = new Map();
  for (const o of objs.filter(o => o.k.startsWith(prefix) && /\.(mp4|jpg|png|webp)$/.test(o.k))) {
    const parts = o.k.split('/'); const dir = parts.slice(0, -1).join('/'); const sig = parts[parts.length - 1].split(/[-.]/)[0];
    const x = m.get(dir) || new Map(); x.set(sig, (x.get(sig) || 0) + o.s); m.set(dir, x);
  }
  let old = 0, oldN = 0;
  for (const sigs of m.values()) { const arr = [...sigs.values()]; if (arr.length > 1) { oldN += arr.length - 1; old += arr.reduce((a, b) => a + b, 0) - Math.max(...arr); } }
  return { dirs: m.size, oldN, old };
};
const reels = ver('videos/reels/', 3), promo = ver('promo/', 4);
lines.push(`— ريلز المنتجات: ${reels.dirs} منتج، نسخ قديمة تقريباً ${reels.oldN} (${mb(reels.old)})`);
lines.push(`— محتوى الدعاية: ${promo.dirs} عنصر، نسخ قديمة تقريباً ${promo.oldN} (${mb(promo.old)})`);
console.log(lines.join('\n'));
for (const l of lines) console.log(`::notice::${l.replace(/\n/g, ' ')}`);
if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + lines.join('\n') + '\n```\n');
