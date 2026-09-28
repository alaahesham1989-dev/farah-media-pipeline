// اختبار شامل للاستوديو: كل قالب × كل مقاس، كل المواسم، الكلام مايخرجش برا الصورة، الواجهات، الذكاء الاصطناعي، الصوت، والفيديو.
//   node tools/selftest.mjs            (كامل — حوالي 3 دقايق)
//   node tools/selftest.mjs --quick    (من غير فيديو)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffprobe from 'ffprobe-static';
import { startServer } from '../server.mjs';
import { load } from '../lib/data.mjs';
import { resolveJob } from '../lib/resolve.mjs';
import { openStage, mountOn } from '../lib/browser.mjs';
import { TEMPLATES } from '../engine/templates/index.js';
import { SKINS } from '../engine/skins.js';
import { FORMATS } from '../engine/formats.js';
import { ROOT, OUT } from '../lib/paths.mjs';

const quick = process.argv.includes('--quick');
const R = [];
const ok = (name, pass, info = '') => { R.push({ name, pass }); console.log(`${pass ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); };
const pngSize = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// النصوص لازم تفضل جوه الصورة (إلا الطبقات اللي معمولة تطلع زي الشريط المايل والزخرفة)
const OVERFLOW_CHECK = () => {
  const cv = document.querySelector('.cv');
  const W = cv.offsetWidth, H = cv.offsetHeight, c = cv.getBoundingClientRect();
  const bad = [];
  for (const el of cv.querySelectorAll('*')) {
    if (el.closest('.decor, .t-sribbon .ribbon, .t-cstamp .post')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.left - c.left < -2 || r.top - c.top < -2 || r.right - c.left > W + 2 || r.bottom - c.top > H + 2) bad.push(el.textContent.trim().slice(0, 30));
    if (el.matches('[data-fit]') && (el.scrollWidth > el.clientWidth + 2)) bad.push('يتقص: ' + el.textContent.trim().slice(0, 30));
  }
  return bad;
};

const srv = await startServer(0);
const base = srv.url;
try {
  // 1) الواجهات
  const meta = await (await fetch(base + '/api/meta')).json();
  ok('واجهة meta', meta.templates.length === TEMPLATES.length && meta.skins.length === SKINS.length, `${meta.templates.length} قالب، ${meta.skins.length} موسم`);
  ok('العنوان في هوية المتجر = farahegypt.com', meta.brand.site === 'farahegypt.com', meta.brand.site);
  const store = await load();
  ok('بيانات المتجر (قراية بس)', store.products.length > 10, `${store.products.length} منتج`);
  ok('مفيش تكلفة أو سعر مورد في بيانات الاستوديو', !JSON.stringify(store).match(/wholesale|priceWholesale|supplier|cost"/i));
  for (const p of ['/web/', '/engine/stage.html', '/api/outputs', '/api/qr?text=https://farahegypt.com', '/api/doc?name=RULES', '/api/doc?name=PROMPTS', '/favicon.ico']) {
    const r = await fetch(base + p);
    ok(`لوحة: ${p}`, r.status === 200, String(r.status));
  }
  const outside = await fetch(base + '/lib/data.mjs');
  ok('ملفات السيرفر مش مكشوفة للمتصفح', outside.status === 404, String(outside.status));

  // 2) كل قالب × كل مقاس + فحص إن الكلام جوه الصورة
  const p = store.products.find(x => x.oldPrice && x.images.length > 1) || store.products[0];
  const coupon = { code: 'FARAH50', type: 'amount', value: 50, minSubtotal: 400, endsAt: '2026-12-01' };
  const dataFor = t => t.type === 'coupon' ? coupon
    : t.id === 'brand-season' ? { startsAt: '2026-11-20', endsAt: '2026-11-30', headline: 'خصومات لحد **40%**' }
    : t.id === 'brand-caption' ? { text: 'تنشيف وتصفيف في **خطوة واحدة**' }
    : t.id === 'brand-cta' ? { qr: true } : { endsAt: '2026-11-30' };
  const page = await openStage(base);
  const dir = path.join(OUT, 'selftest');
  fs.mkdirSync(dir, { recursive: true });
  let n = 0, fails = 0;
  for (const t of TEMPLATES) for (const fmt of Object.keys(FORMATS)) {
    const job = resolveJob({ template: t.id, skin: 'farah', format: fmt, product: t.type === 'coupon' ? undefined : p.id, data: dataFor(t) }, store);
    const errs = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', e => errs.push(e.message));
    const { W, H } = await mountOn(page, job, 'static');
    const bad = await page.evaluate(OVERFLOW_CHECK);
    const file = path.join(dir, `${t.id}-${fmt}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H }, omitBackground: !!job.transparent });
    const [w, h] = pngSize(file);
    const good = !errs.length && !bad.length && w === W && h === H && fs.statSync(file).size > 8000;
    n++; if (!good) fails++;
    if (!good) ok(`${t.id} ${fmt}`, false, [...errs, ...bad].join(' | ') || `${w}x${h}`);
  }
  ok(`كل القوالب بكل المقاسات (${n} صورة)`, fails === 0, fails ? `${fails} فيهم مشكلة (فوق)` : 'مفيش كلام خارج الصورة ولا أخطاء');

  // 3) كل المواسم على قالبين
  let sf = 0;
  for (const s of SKINS) for (const tid of ['sale-ribbon', 'coupon-ticket']) {
    const t = TEMPLATES.find(x => x.id === tid);
    const job = resolveJob({ template: tid, skin: s.id, format: 'portrait', product: t.type === 'coupon' ? undefined : p.id, data: dataFor(t) }, store);
    await mountOn(page, job, 'static');
    const bad = await page.evaluate(OVERFLOW_CHECK);
    if (bad.length) { sf++; ok(`${tid} ${s.id}`, false, bad.join(' | ')); }
  }
  ok(`كل المواسم (${SKINS.length}) على قالب الخصم والكوبون`, sf === 0);

  // 4) الحركة: أول فريم مخفي وآخر فريم كامل
  await mountOn(page, resolveJob({ template: 'sale-ribbon', skin: 'farah', format: 'story', product: p.id, data: {} }, store), 'anim');
  const a0 = await page.evaluate(() => { window.STAGE.seek(0); return getComputedStyle(document.querySelector('.t-sribbon .name')).opacity; });
  const a1 = await page.evaluate(() => { window.STAGE.seek(3); return getComputedStyle(document.querySelector('.t-sribbon .name')).opacity; });
  ok('الحركة: الاسم بيظهر تدريجي', Number(a0) < 0.1 && Number(a1) > 0.99, `${a0} → ${a1}`);
  await page.close();

  // 5) الرسم من الواجهة نفسها (زي زرار صدّر في اللوحة)
  const rr = await (await fetch(base + '/api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job: resolveJob({ template: 'product-bar', skin: 'white-friday', product: p.id }, store), formats: ['square', 'portrait', 'story'] }) })).json();
  ok('تصدير 3 مقاسات من اللوحة', rr.files?.length === 3 && rr.files.every(f => fs.existsSync(path.join(ROOT, f))));

  // 6) الذكاء الاصطناعي (من غير مفاتيح = بنك الجمل) + رفض الكلام الممنوع
  const { writeCopy, check } = await import('../lib/ai.mjs');
  const bank = await writeCopy(store.products.slice(0, 3), { headline: 30, sub: 40 });
  ok('جمل من بنك الجمل (صفر توكن)', Object.values(bank).every(x => x.headline && x.headline.replace(/\*\*/g, '').length <= 30));
  ok('الكلام الممنوع بيترفض', !!check('مضمون 100% والأفضل', 60) && !check('تنشيف وتصفيف في خطوة', 40));

  // 7) الصوت
  const { speak } = await import('../lib/tts.mjs');
  const au = await speak('تجربة الصوت من متجر فرح.', { name: 'ar-EG-SalmaNeural', rate: '+10%' });
  const ad = Number(execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', au]).toString());
  ok('الصوت المصري المجاني', ad > 0.8 && ad < 6, ad.toFixed(1) + ' ث');

  // 8) الفيديو
  if (!quick) {
    const { makeVideo } = await import('../lib/video.mjs');
    const { preset } = await import('../lib/presets.mjs');
    const sb = await preset('catalog-flash', { store, skin: 'eid', voice: { name: 'ar-EG-ShakirNeural', rate: '+10%' }, params: { count: 2 } });
    const rel = await makeVideo(base, sb, { store, onLog: () => {} });
    const info = execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height', '-show_entries', 'format=duration', '-of', 'json', path.join(ROOT, rel)]).toString();
    const j = JSON.parse(info);
    const v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
    ok('فيديو كامل بصوت', v?.width === 1080 && v?.height === 1920 && a?.codec_name === 'aac' && Number(j.format.duration) > 5, `${Number(j.format.duration).toFixed(1)} ث · ${rel}`);
  }
} finally {
  await srv.close();
}
const passed = R.filter(r => r.pass).length;
console.log(`\nالنتيجة: ${passed}/${R.length} نجحوا`);
process.exit(passed === R.length ? 0 : 1);
