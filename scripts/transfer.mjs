// الخطوة 2: نقل الملفات من الدرايف للمخزن الخام (R2) مباشرةً — من غير ما حاجة تتخزن على الجهاز
//   raw/<safkaId>/<المسار في الدرايف>
// سجل اللي اتنقل: state/transferred.json جوه المخزن نفسه (علشان التشغيلات تكمّل من مكان ما وقفت)
//
// خيارات (متغيرات بيئة من الـ workflow):
//   KINDS=image,video      أنواع الملفات
//   ONLY_REAL=1            فيديو/صور "ع الطبيعة" بس
//   MAX_MB=500             تخطي الملفات الأكبر من كده
//   PRODUCTS=id1,id2       منتجات معينة بس
//   TIME_BUDGET_MIN=300    يقف قبل ما وقت التشغيل يخلص
import fs from 'node:fs';
import { download } from './drive.mjs';
import { putStream, getJson, putJson } from './storage.mjs';

const files = JSON.parse(fs.readFileSync('catalog/files.json', 'utf8'));
const KINDS = (process.env.KINDS || 'image,video').split(',').map(s => s.trim()).filter(Boolean);
const ONLY_REAL = process.env.ONLY_REAL === '1';
const MAX_MB = Number(process.env.MAX_MB || 600);
const ONLY = (process.env.PRODUCTS || '').split(',').map(s => s.trim()).filter(Boolean);
const deadline = Date.now() + Number(process.env.TIME_BUDGET_MIN || 300) * 60000;

const STATE = 'state/transferred.json';
const done = await getJson(STATE, {});
const safe = s => s.replace(/[\\?#%*:|"<>]/g, '_');
let moved = 0, bytes = 0, skipped = 0, failed = 0;

outer:
for (const [pid, entry] of Object.entries(files)) {
  if (ONLY.length && !ONLY.includes(pid)) continue;
  for (const f of entry.files || []) {
    if (!KINDS.includes(f.kind) || (ONLY_REAL && !f.real)) continue;
    if (done[f.id]) continue;
    if (Date.now() > deadline) { console.log('⏱️ الوقت خلص — التشغيل الجاي هيكمّل'); break outer; }
    const key = `raw/${pid}/${safe(f.path)}`;
    try {
      const d = await download(f.id);
      if (d.size && d.size > MAX_MB * 1048576) { await d.body.cancel(); skipped++; done[f.id] = { skipped: 'too-big', size: d.size }; continue; }
      await putStream(key, d.body, d.type);
      done[f.id] = { key, size: d.size, kind: f.kind, at: new Date().toISOString() };
      moved++; bytes += d.size || 0;
      console.log(`✓ ${key} (${d.size ? Math.round(d.size / 1048576) + 'MB' : '?'})`);
    } catch (e) {
      failed++;
      console.log(`✗ ${key}: ${e.message}`);
    }
    if (moved % 20 === 0) await putJson(STATE, done);
  }
}
await putJson(STATE, done);
console.log(`✅ اتنقل ${moved} ملف (${Math.round(bytes / 1048576)}MB) · اتخطى ${skipped} · فشل ${failed} · الإجمالي في المخزن ${Object.values(done).filter(x => x.key).length}`);
