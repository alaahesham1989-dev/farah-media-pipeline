// بيانات صفحة "مكتبة منتجات فرح": من catalog/products/*.json + صور منتجاتنا من مشروع المتجر
//   node scripts/catalog-page.mjs <outDir>
// الناتج: <outDir>/catalog-data.json (البيانات) + <outDir>/catalog-thumbs.json (صورة صغيرة لكل منتج data: URI)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const OUT = path.resolve(process.argv[2] || 'tmp/catalog-page');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const STORE = path.resolve('..', 'farah-store');
fs.mkdirSync(path.join(OUT, 'thumbs'), { recursive: true });

// منتجاتنا من js/data.js (الـ40 المعروضين)
const src = fs.readFileSync(path.join(STORE, 'js', 'data.js'), 'utf8');
const a = src.indexOf('const PRODUCTS = [');
const b = src.indexOf('\n];', a);
const ours = Object.fromEntries(JSON.parse(src.slice(a + 'const PRODUCTS = '.length, b + 2)).map(p => [p.id, p]));

// "✔️ x<br>✔️ y" أو "1. x<br>2. y" → ['x', 'y']
const brList = s => String(s || '').split(/<br\s*\/?>/i).map(x => x.replace(/^[\s✔️✅•\-\d.)]+/u, '').trim()).filter(Boolean);

const dir = path.resolve('catalog', 'products');
const items = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (d.source === 'farah') {
    const p = ours[d.id] || {};
    const s = p.specs || {};
    items.push({
      c: d.id, s: 'farah', st: 'active', n: p.name || d.name, en: p.nameEn || '', cat: p.category || d.category,
      p: p.price || null, po: p.priceOriginal || null, stk: p.stock ?? null,
      h: s.headline || '', i: s.intro || (p.description && p.description.overview) || '',
      f: s.features || brList((p.marketing || {}).problemsSolved), u: s.howToUse || brList((p.marketing || {}).howToUse),
      match: d.match, sup: d.supplier ? { code: d.supplier.code, cost: d.supplier.cost, sug: d.supplier.suggested, stk: d.supplier.stock, folder: d.supplier.folder, mc: d.supplier.mediaCounts } : null,
      sim: (d.similarSafka || []).map(x => x.code).filter(Boolean),
      img: (p.images || [])[0] ? path.join(STORE, p.images[0]) : null,
    });
  } else {
    const sp = d.specs || {};
    items.push({
      c: d.id, s: 'safka', st: d.status, n: d.name, en: d.nameEn, cat: d.category,
      p: d.price, stk: d.stock, pn: d.priceNote,
      h: sp.headline || '', i: sp.intro || '', f: sp.features || [], u: sp.howToUse || [], box: sp.inBox || [],
      fit: sp.suitableFor || '', saf: sp.safety || '', kw: sp.keywords || [], model: sp.modelNo || '',
      ads: d.ads || null, pol: d.adPolicy, notes: d.adNotes || [], rn: d.reviewNote || '', blocks: d.lintBlocks || [],
      sim: d.similarTo || [],
      sup: { code: d.supplier.code, cost: d.supplier.cost, sug: d.supplier.suggested, stk: d.supplier.stock, cat: d.supplier.category, folder: d.supplier.folder, mc: d.supplier.mediaCounts, v: d.supplier.variants },
      img: d.images[0] ? d.images[0].replace(/=w\d+$/, '=w220') : null,
    });
  }
}

// صورة صغيرة لكل منتج (160px) → data: URI
const thumbs = {};
let ok = 0, miss = 0;
for (const it of items) {
  const t = path.join(OUT, 'thumbs', it.c + '.jpg');
  try {
    if (!fs.existsSync(t) && it.img) {
      let input = it.img;
      if (/^https?:/.test(it.img)) {
        const r = await fetch(it.img, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        input = path.join(OUT, 'thumbs', it.c + '.src');
        fs.writeFileSync(input, Buffer.from(await r.arrayBuffer()));
      }
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', input, '-vf', 'scale=180:180:force_original_aspect_ratio=increase,crop=180:180', '-q:v', '6', '-frames:v', '1', t]);
    }
    if (fs.existsSync(t)) { thumbs[it.c] = 'data:image/jpeg;base64,' + fs.readFileSync(t).toString('base64'); ok++; } else miss++;
  } catch (e) { miss++; console.log('thumb failed', it.c, e.message); }
  delete it.img;
}
fs.writeFileSync(path.join(OUT, 'catalog-data.json'), JSON.stringify(items));
fs.writeFileSync(path.join(OUT, 'catalog-thumbs.json'), JSON.stringify(thumbs));
console.log(`items ${items.length} · thumbs ${ok} · missing ${miss} · data ${(fs.statSync(path.join(OUT, 'catalog-data.json')).size / 1024).toFixed(0)}KB · thumbs ${(fs.statSync(path.join(OUT, 'catalog-thumbs.json')).size / 1048576).toFixed(1)}MB`);
