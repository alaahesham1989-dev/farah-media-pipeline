// catalog/safka-catalog.tsv (اتجمع من لوحة صفقة) → catalog/safka-catalog.json
import fs from 'node:fs';
const [head, ...rows] = fs.readFileSync('catalog/safka-catalog.tsv', 'utf8').trim().split(/\r?\n/);
const products = rows.map(l => {
  const [id, name, code, cost, suggested, folder] = l.split('\t');
  return { id, name, code, cost: cost ? Number(cost) : null, suggested: suggested ? Number(suggested) : null, media: folder ? [`https://drive.google.com/drive/folders/${folder}`] : [] };
});
fs.writeFileSync('catalog/safka-catalog.json', JSON.stringify({ source: 'aff.safka-eg.com', collectedAt: '2026-09-24', count: products.length, products }, null, 1));
console.log(`✅ ${products.length} منتج — من غير لينك ميديا: ${products.filter(p => !p.media.length).length}`);
