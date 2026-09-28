// لوحة مجمّعة: كل الصور اللي اترسمت جنب بعض في صورة واحدة (للمراجعة السريعة على التليجرام أو الموبايل)
import path from 'node:path';
import { getBrowser } from './browser.mjs';
import { ROOT } from './paths.mjs';

export async function makeSheet(baseUrl, files, outFile, { cols = 4, width = 1800 } = {}) {
  const b = await getBrowser();
  const page = await b.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const cells = files.map(f => `<figure><img src="${baseUrl}${f.url}"><figcaption>${f.job.template} · ${f.job.skin || ''}</figcaption></figure>`).join('');
  await page.setContent(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
    body{margin:0;background:#E9E5DC;font:500 18px system-ui;padding:24px}
    .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px;align-items:start}
    figure{margin:0;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.08)}
    img{width:100%;display:block} figcaption{padding:10px 14px;color:#333;direction:ltr;text-align:left}
  </style></head><body><div class="g">${cells}</div></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  const file = path.resolve(ROOT, outFile);
  await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 86 });
  await page.close();
  return path.relative(ROOT, file);
}
