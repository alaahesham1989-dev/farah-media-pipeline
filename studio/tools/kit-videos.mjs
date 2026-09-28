// فيديوهات منتجاتنا من ملفات التسويق — على دفعتين:
//   node tools/kit-videos.mjs --plan                       ← بيجهّز السيناريوهات بس (مابيرسمش): storyboards/kits/*.json + قايمة التصوير
//   node tools/kit-videos.mjs --render [--only code0009,code0005] [--limit 3] [--shard 1/4]   ← بيرسم الفيديوهات من السيناريوهات الجاهزة
// كل منتج بياخد 3 فيديوهات (15 و30 و60 ثانية)، وكل واحد على زاوية تسويق مختلفة (الزاوية 1 و2 و3 من ملف التسويق).
// --angles all  → كمان الـ15 ثانية بكل الزوايا الخمسة (لاختبار الزوايا في الإعلانات)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT } from '../lib/paths.mjs';
import { load } from '../lib/data.mjs';
import { readKit, KITS_DIR, buildKitStoryboard } from '../lib/kit-video.mjs';

const args = process.argv.slice(2);
const flag = k => args.includes('--' + k);
const val = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const only = val('only') ? val('only').split(',').map(s => s.trim()) : null;
const SB_DIR = path.join(ROOT, 'storyboards', 'kits');

if (flag('plan') || !flag('render')) {
  const store = await load();
  fs.mkdirSync(SB_DIR, { recursive: true });
  const codes = fs.readdirSync(KITS_DIR).map(f => f.replace('.json', '')).filter(c => !only || only.includes(c)).sort();
  const shotList = [];
  let n = 0, skipped = [];
  for (const code of codes) {
    const p = store.products.find(x => x.id === code);
    const kit = readKit(code);
    if (!p || !kit?.videoScripts?.length) { skipped.push(code); continue; }
    const plans = [[15, 0], [30, 1], [60, 2]];
    if (val('angles') === 'all') for (let a = 1; a < (kit.angles?.length || 1); a++) plans.push([15, a]);
    const productShots = new Map();
    for (const [length, angle] of plans) {
      const { storyboard, shots } = await buildKitStoryboard(p, kit, { length, angle });
      fs.writeFileSync(path.join(SB_DIR, storyboard.name + '.json'), JSON.stringify(storyboard, null, 1));
      for (const s of shots) productShots.set(s.what, s);
      n++;
    }
    if (productShots.size) shotList.push({ code, name: p.name, image: p.images?.[0] || '', shots: [...productShots.values()] });
  }
  // قايمة التصوير لمحمود (ملف بس — مابيتبعتش لحد)
  const dir = path.join(OUT, 'shotlist');
  fs.mkdirSync(dir, { recursive: true });
  const total = shotList.reduce((a, x) => a + x.shots.length, 0);
  const md = [`# قايمة تصوير — ${shotList.length} منتج، ${total} لقطة`, '',
    'كل لقطة 3 لـ5 ثواني، والموبايل **واقف (طولي)**، في نور النهار، وخلفية نضيفة. من غير كلام ولا مزيكا — الصوت بيتركب بعدين.', '',
    ...shotList.flatMap(x => [`## ${x.name} (${x.code})`, ...x.shots.map((s, i) => `${i + 1}. ${s.what}`), ''])].join('\n');
  fs.writeFileSync(path.join(dir, 'shotlist.md'), md);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  fs.writeFileSync(path.join(dir, 'shotlist.html'), `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>قايمة تصوير فرح مصر</title>
<style>body{font-family:system-ui,Segoe UI,Tahoma;background:#F7F3EA;margin:0;padding:16px;color:#0B1929}h1{font-size:22px}.p{background:#fff;border-radius:14px;padding:12px;margin:12px 0;display:flex;gap:12px;align-items:flex-start}
.p img{width:84px;height:84px;object-fit:cover;border-radius:10px;flex:none}.p h2{font-size:17px;margin:0 0 6px}.p ol{margin:0;padding-inline-start:20px;line-height:1.7}.note{background:#0B1929;color:#F0D78C;border-radius:12px;padding:10px 14px}</style></head><body>
<h1>قايمة تصوير — ${shotList.length} منتج · ${total} لقطة</h1><p class="note">كل لقطة 3–5 ثواني · الموبايل واقف (طولي) · نور نهار · خلفية نضيفة · من غير كلام ولا مزيكا</p>
${shotList.map(x => `<div class="p">${x.image ? `<img src="${esc(x.image)}" alt="">` : ''}<div><h2>${esc(x.name)} <small>(${x.code})</small></h2><ol>${x.shots.map(s => `<li>${esc(s.what)}</li>`).join('')}</ol></div></div>`).join('')}
</body></html>`);
  console.log(`✅ ${n} سيناريو في storyboards/kits · قايمة تصوير: ${shotList.length} منتج / ${total} لقطة (out/shotlist)`);
  if (skipped.length) console.log('اتخطوا (مش منشورين أو مالهمش سكريبت):', skipped.join(' '));
}

if (flag('render')) {
  const { startServer } = await import('../server.mjs');
  const { makeVideo } = await import('../lib/video.mjs');
  const store = await load();
  let files = fs.readdirSync(SB_DIR).filter(f => f.endsWith('.json')).sort();
  if (only) files = files.filter(f => only.some(c => f.startsWith(c)));
  if (val('limit')) files = files.slice(0, Number(val('limit')));
  // --shard 2/4 → الجهاز رقم 2 من 4 بياخد ربع الفيديوهات (للكمبيوتر السحابي)
  if (val('shard')) { const [k, n] = val('shard').split('/').map(Number); files = files.filter((_, i) => i % n === k - 1); }
  const srv = await startServer(0);
  try {
    for (const f of files) {
      const sb = JSON.parse(fs.readFileSync(path.join(SB_DIR, f), 'utf8'));
      if (val('voice')) sb.voice = { ...(sb.voice || {}), name: val('voice') };
      const t0 = Date.now();
      const rel = await makeVideo(srv.url, sb, { store, onLog: () => {} });
      console.log(`🎬 ${f} → ${rel} (${((Date.now() - t0) / 1000).toFixed(0)} ث)`);
    }
  } finally { await srv.close(); }
}
