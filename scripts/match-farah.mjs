// مقارنة منتجات متجر فرح بكتالوج صفقة — قراءة بس (المنتجات في فرح عامة للقراية)، مفيش أي كتابة.
// الناتج: reports/match.md + reports/match.json (أقرب منتجات صفقة لكل منتج في فرح)
import fs from 'node:fs';

const FARAH = 'https://firestore.googleapis.com/v1/projects/farah-store-6bf78/databases/(default)/documents/products?pageSize=500';
const catalog = JSON.parse(fs.readFileSync('catalog/safka-catalog.json', 'utf8')).products;
const files = fs.existsSync('catalog/files.json') ? JSON.parse(fs.readFileSync('catalog/files.json', 'utf8')) : {};

const v = f => f?.stringValue ?? (f?.integerValue != null ? +f.integerValue : f?.doubleValue);
const j = await (await fetch(FARAH)).json();
const farah = (j.documents || []).map(d => ({ id: d.name.split('/').pop(), name: v(d.fields.name) || '', nameEn: v(d.fields.nameEn) || '', price: v(d.fields.price) }));

const STOP = new Set(['جهاز', 'ماكينة', 'مكنة', 'الجديد', 'الأصلي', 'الاصلي', 'من', 'مع', 'في', 'على', 'لل', 'و', 'the', 'for', 'and', 'with', '2026', '2025', 'الذكي', 'الذكية', 'متعدد', 'متعددة', 'الاستخدامات']);
const norm = s => String(s || '').toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ');
const tokens = s => new Set(norm(s).split(/\s+/).map(t => t.replace(/^ال/, '')).filter(t => t.length > 1 && !STOP.has(t)));
const score = (a, b) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let n = 0; for (const t of A) if (B.has(t)) n++; return n / Math.min(A.size, B.size); };

const amazonish = u => /_AC_|amazon|aliexpress|alicdn/i.test(u);
const out = farah.map(p => {
  const cands = catalog.map(c => ({ c, s: Math.max(score(p.name, c.name), score(p.nameEn, c.name)) }))
    .filter(x => x.s >= 0.5).sort((a, b) => b.s - a.s).slice(0, 3)
    .map(({ c, s }) => {
      const fl = (files[c.id] && files[c.id].files) || [];
      return {
        safkaId: c.id, name: c.name, code: c.code, cost: c.cost, suggested: c.suggested, score: Math.round(s * 100),
        media: (c.media || [])[0] || '', images: fl.filter(f => f.kind === 'image').length, videos: fl.filter(f => f.kind === 'video').length,
        realVideos: fl.filter(f => f.kind === 'video' && f.real).length, amazonImages: fl.filter(f => f.kind === 'image' && amazonish(f.name)).length,
      };
    });
  return { farah: p, candidates: cands };
});

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/match.json', JSON.stringify(out, null, 1));
const md = ['# مقارنة منتجات فرح بكتالوج صفقة', '', `اتعمل ${new Date().toISOString().slice(0, 10)} — ${farah.length} منتج في فرح · ${catalog.length} منتج في صفقة.`, '',
  '> التشابه بالاسم بس — لازم تتأكد بعينك إن الموديل هو هو قبل ما تستخدم الميديا.', '',
  '| منتج فرح | سعرنا | أقرب منتج في صفقة | التكلفة عندهم | التشابه | صور | فيديو (ع الطبيعة) |', '|---|---|---|---|---|---|---|',
  ...out.map(r => {
    const c = r.candidates[0];
    return c ? `| ${r.farah.name} | ${r.farah.price} | ${c.name} | ${c.cost ?? '—'} | ${c.score}% | ${c.images}${c.amazonImages ? ` (${c.amazonImages} أمازون)` : ''} | ${c.videos} (${c.realVideos}) |`
      : `| ${r.farah.name} | ${r.farah.price} | — مفيش شبيه | | | | |`;
  })];
fs.writeFileSync('reports/match.md', md.join('\n'));
console.log(`✅ ${out.filter(r => r.candidates.length).length} من ${farah.length} منتج ليهم شبيه في صفقة → reports/match.md`);
