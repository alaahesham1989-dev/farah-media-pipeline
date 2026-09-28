// بينزّل خطوط القوالب من Google Fonts مرة واحدة ويحفظها جوه المشروع (assets/fonts)
// عشان الرسم يشتغل من غير نت ومايتأخرش. كل الخطوط رخصتها OFL (مسموح بيها تجارياً).
//   node tools/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DIR = path.join(ROOT, 'assets', 'fonts');
const FAMILIES = [
  'Alexandria:wght@300;400;500;600;700;800;900',   // العناوين والأسعار
  'Cairo:wght@400;500;600;700;800',                 // نفس خط الموقع
  'IBM+Plex+Sans+Arabic:wght@400;500;600;700',      // النصوص الصغيرة
  'El+Messiri:wght@400;500;600;700',                // لمسة فخمة (المواسم والإطار)
  'Lalezar',                                        // عناوين الأوكازيون التقيلة
  'Reem+Kufi:wght@400;500;600;700',                 // كوفي هندسي للأغلفة
  'JetBrains+Mono:wght@500;700',                    // أكواد الكوبونات
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

fs.mkdirSync(DIR, { recursive: true });
const url = 'https://fonts.googleapis.com/css2?' + FAMILIES.map(f => 'family=' + f).join('&') + '&display=block';
let css = await (await fetch(url, { headers: { 'user-agent': UA } })).text();
if (!css.includes('@font-face')) throw new Error('Google Fonts رجّع رد غريب:\n' + css.slice(0, 300));

const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))];
let n = 0;
for (const u of urls) {
  const name = u.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '_');
  const file = path.join(DIR, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(await (await fetch(u)).arrayBuffer()));
  css = css.split(u).join(name);
  n++;
}
fs.writeFileSync(path.join(DIR, 'fonts.css'), css);
console.log(`✅ ${n} ملف خط اتحفظوا في assets/fonts`);
