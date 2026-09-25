// خطة نقل ميديا المكتبة: لكل كود فرح → صور (8 بالكتير) + فيديو "ع الطبيعة" + كليبين قصيرين
//   node scripts/media-plan.mjs   → catalog/media-plan.json (أرقام ملفات درايف بس — مفيهاش أسماء ولا أسعار، ينفع تترفع)
// محتاج catalog/files.json و catalog/farah-ids.json و catalog/matches.json (محلي — مش في المشروع العام)
import fs from 'node:fs';

const files = JSON.parse(fs.readFileSync('catalog/files.json', 'utf8'));
const ids = JSON.parse(fs.readFileSync('catalog/farah-ids.json', 'utf8'));          // safkaId → codeXXXX (مسودات)
const matches = JSON.parse(fs.readFileSync('catalog/matches.json', 'utf8'));
const same = Object.fromEntries(Object.entries(matches.same).map(([code, m]) => [m.safka, code])); // منتجاتنا المتطابقة

const MAX_IMAGES = 8, MAX_CLIPS = 2;
const amazon = n => /_AC_/.test(n);
const tiktok = n => /ssstik|snaptik|tiktok|musicaldown/i.test(n);
const heic = n => /\.heic$/i.test(n);
const phone = n => /^(VID|IMG)[_-]/i.test(n);
// "IMG_1234 (1).jpg" و "IMG_1234.jpg" نفس الملف
const baseKey = n => n.toLowerCase().replace(/\s*\(\d+\)(?=\.[^.]+$)/, '');

function uniq(list) {
  const seen = new Set();
  return list.filter(f => { const k = baseKey(f.name); if (seen.has(k)) return false; seen.add(k); return true; });
}

const plan = {};
let nImg = 0, nMain = 0, nClip = 0, noReal = 0;
for (const [sid, entry] of Object.entries(files)) {
  const code = ids[sid] || same[sid];
  if (!code) continue;
  const all = entry.files || [];
  const isOurs = !!same[sid];

  // الصور: الطبيعة الأول، من غير أمازون ولا تكرار — لمنتجاتنا المتطابقة صورنا موجودة، فمش محتاجين صور
  const imgs = isOurs ? [] : uniq(all.filter(f => f.kind === 'image' && !amazon(f.name)))
    .sort((a, b) => (b.real - a.real) || (heic(a.name) - heic(b.name)))
    .slice(0, MAX_IMAGES);

  // الفيديو: "ع الطبيعة" رقم واحد، بعدين موبايل، بعدين فيديوهات صفقة — من غير تيك توك/أمازون/تكرار
  const vids = uniq(all.filter(f => f.kind === 'video' && !amazon(f.name) && !tiktok(f.name)))
    .sort((a, b) => (b.real - a.real) || (phone(b.name) - phone(a.name)));
  const real = vids.filter(f => f.real);
  const main = real[0] || null;
  if (!main && vids.length) noReal++;
  const clips = vids.filter(f => f !== main).slice(0, MAX_CLIPS);

  if (!imgs.length && !main && !clips.length) continue;
  plan[code] = { img: imgs.map(f => f.id), main: main ? main.id : null, clips: clips.map(f => f.id) };
  nImg += imgs.length; nMain += main ? 1 : 0; nClip += clips.length;
}

// منتجات فولدرها فاضي: صور صفحة المنتج (من غير أمازون)
const pageImages = JSON.parse(fs.readFileSync('catalog/safka-page-images.json', 'utf8'));
for (const [sid, urls] of Object.entries(pageImages)) {
  const code = ids[sid];
  const list = urls.filter(u => !amazon(u));
  if (!code || !list.length) continue;
  plan[code] = { ...(plan[code] || { img: [], main: null, clips: [] }) };
  if (!plan[code].img.length) { plan[code].imgUrl = list; nImg += list.length; }
}

fs.writeFileSync('catalog/media-plan.json', JSON.stringify(plan));
console.log(`منتجات: ${Object.keys(plan).length} · صور: ${nImg} · فيديو ع الطبيعة: ${nMain} · كليبات: ${nClip} · منتجات من غير فيديو طبيعة: ${noReal}`);
