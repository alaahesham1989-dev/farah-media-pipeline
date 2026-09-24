// الخطوة 1: من كتالوج صفقة (catalog/safka-catalog.json) → قايمة بكل ملفات الدرايف لكل منتج
// الناتج: catalog/files.json (بيتحفظ في المشروع — مفيش فيه أسرار)
//   node scripts/list.mjs            → كل المنتجات اللي لسه ماتعملهاش قايمة
//   node scripts/list.mjs --refresh  → يعيد الكل
import fs from 'node:fs';
import { folderIdFromUrl, listTree, kindOf } from './drive.mjs';

const CAT = 'catalog/safka-catalog.json';
const OUT = 'catalog/files.json';
const refresh = process.argv.includes('--refresh');
const catalog = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const out = !refresh && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

let n = 0, files = 0, failed = 0;
for (const p of catalog.products) {
  if (out[p.id] && !refresh) continue;
  const folder = folderIdFromUrl((p.media || [])[0]);
  if (!folder) { out[p.id] = { error: 'no-media-link', files: [] }; continue; }
  try {
    const list = await listTree(folder);
    out[p.id] = {
      folder, listedAt: new Date().toISOString(),
      files: list.map(f => ({ ...f, kind: kindOf(f.name), real: /طبيع|real|حقيق/i.test(f.path) })),
    };
    files += list.length;
  } catch (e) {
    out[p.id] = { folder, error: String(e.message || e).slice(0, 200), files: [] };
    failed++;
  }
  if (++n % 10 === 0) { fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`… ${n} منتج، ${files} ملف`); }
  await sleep(500);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const all = Object.values(out);
const count = k => all.reduce((s, x) => s + x.files.filter(f => f.kind === k).length, 0);
console.log(`✅ ${all.length} منتج — صور ${count('image')} · فيديو ${count('video')} · تاني ${count('other')} · أخطاء ${all.filter(x => x.error).length}`);
