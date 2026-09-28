// محتوى النشر المجدول (غير ريل المنتج العادي) — كله من بيانات المتجر، من غير توكن:
//   product-image  صورة إعلان 4:5 لكل منتج منشور بسعره الحالي (قالب الخصم لو عليه خصم، وإلا قالب المنتج)
//   offer-reel     ريل ≈12–14 ث لكل منتج (6 بالكتير) في عرض شغّال أو هيبدأ خلال يومين
//   offer-image    صورة 4:5 للعرض: ختم الخصم + السعر قبل/بعد + «العرض لحد …»
//   coupon-reel    ريل للكوبون الدعائي: الكود كبير + القيمة + أقل طلب + آخر يوم
//   coupon-image   صورة الكوبون 4:5
// كل حاجة ليها بصمة (sig) من اللي بيظهر فيها بالظبط (أمر التصميم أو السيناريو): السعر أو العرض أو الصورة لو اتغيروا بتتعمل تاني لوحدها.
//   planPromo(store, { bank, now }) → [{ key, type, kind: 'image'|'reel', dir, sig, title, caption, …, job | storyboard }]
//   mergePromoIndex(prev, fresh, wanted) → الفهرس العام promo/index.json (اللي خلص أو اتشال من المتجر بيتشال منه)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';
import { cleanLine } from './kit-video.mjs';
import { shortName, benefitsOf, priceOf, offerPriceFor, TRACKS } from './reel.mjs';
import { dayMonth, couponTexts } from '../engine/parts.js';

export const SITE = 'https://farahegypt.com';
export const PROMO_INDEX = 'promo/index.json';
export const PROMO_TYPES = ['product-image', 'offer-reel', 'offer-image', 'coupon-reel', 'coupon-image'];
const DAY = 864e5;
const SOON = 2 * DAY; // العرض/الكوبون اللي هيبدأ خلال يومين بيتجهز من بدري
const MAX_PER_OFFER = 6;
const V = 'p1'; // نسخة التصميم: لو اتغيرت، كل المحتوى بيتعمل تاني
const SKIN = 'farah';
const SHIP = '🚚 شحن لكل المحافظات · استبدال خلال 14 يوم';
const TAGS = '#فرح_مصر #FarahEgypt';
const MOVES = ['orbit', 'punch', 'pan', 'dolly', 'float'];
const TRANS = ['fade', 'smoothleft', 'zoomin', 'fade', 'smoothright'];
const WOMEN = /بشرة|شعر|مكياج|تجميل|الأم|طفل|أظافر|حواجب|السيدات|للستات/;

// الكلمات الممنوعة (copy/phrases.json): أي سطر فيه واحدة منها مابيدخلش البوست
const FORBIDDEN = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'copy', 'phrases.json'), 'utf8')).forbidden || []; } catch { return []; } })();
const safe = s => { const t = cleanLine(s); return t && !FORBIDDEN.some(w => t.includes(w)) ? t : ''; };
const gold = s => { const w = String(s).split(/\s+/); if (w.length > 1) w[w.length - 1] = `**${w[w.length - 1]}**`; return w.join(' '); };
const hex = x => crypto.createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sigOf = x => hex([x, V]).slice(0, 10);
const safeId = s => String(s || '').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60) || 'x';
// توزيع الشغل على الأجهزة بالمفتاح نفسه (ثابت مهما القايمة اتغيرت) — مفيش حاجة بتتعمل مرتين
export const inShard = (key, sh = 1, sn = 1) => parseInt(hex(String(key)).slice(0, 8), 16) % sn === sh - 1;

// الصورة: صورة «هيرو» (AI) لو موجودة، وإلا الصورة الأولى (قاعدة المالك: الأولى = المنتج نفسه)
export function heroImage(p) {
  const imgs = (p.images || []).filter(Boolean);
  const m0 = (p.imagesMeta || [])[0];
  return imgs.find(u => /\/hero-/.test(u)) || (m0?.kind === 'ai' && m0.url) || imgs[0] || '';
}

const women = (p, copy) => WOMEN.test(p.category || '') || copy?.audience === 'women';
const ctaFor = (p, copy) => safe(copy?.cta) || (women(p, copy) ? 'اطلبي دلوقتي' : 'اطلب دلوقتي');
const benefitsFor = (p, copy) => (copy?.benefits?.length ? copy.benefits : benefitsOf(p)).map(safe).filter(Boolean).slice(0, 3);
const urlOf = p => `${SITE}/p/${p.slug || p.id}`;

// ─── العروض والكوبونات اللي تتعمل ─────────────────────────────────────────
// شغّال دلوقتي أو هيبدأ خلال يومين، ولسه ماخلصش. العروض لازم يكون ليها نهاية (زي المتجر)، الكوبون ممكن من غير نهاية.
function inWindow(x, now, needEnd) {
  const s = Date.parse(x.startsAt || ''), e = Date.parse(x.endsAt || '');
  if (Number.isFinite(e) ? e <= now : needEnd) return false;
  return !Number.isFinite(s) || s <= now + SOON;
}
const soonOf = (x, now) => Date.parse(x.startsAt || '') > now;

// عروض السعر بس (مش عروض السلة «اشتري 2» ولا عروض لحظة الدفع)
export const promoOffers = (offers = [], now = Date.now()) =>
  offers.filter(o => o && o.status === 'active' && o.kind !== 'cart' && o.kind !== 'bump' && Number(o.value) > 0 && inWindow(o, now, true));

// المنتجات اللي العرض بيخفّض سعرها فعلاً (نفس appliesTo في المتجر)، 6 بالكتير — ترتيب المالك، أو الأكبر خصم للأقسام/الكل
export function offerProducts(o, products = []) {
  const pool = o.scope === 'all' ? products
    : o.scope === 'category' ? products.filter(p => (o.categories || []).includes(p.category))
      : (o.productIds || []).map(id => products.find(p => p.id === id)).filter(Boolean);
  const rows = pool.map(p => ({ p, regular: p.price, price: offerPriceFor(o, p.price) })).filter(r => r.regular > 0 && r.price < r.regular && heroImage(r.p));
  if (o.scope === 'all' || o.scope === 'category') rows.sort((a, b) => (a.price / a.regular) - (b.price / b.regular) || a.p.id.localeCompare(b.p.id));
  return rows.slice(0, MAX_PER_OFFER);
}

// عرض اليوم (settings/daily_deals) كعرض سعر — نفس dailyDealOffer في المتجر (js/offers.js)، بيخلص نص الليل بتوقيت القاهرة
const cairoDate = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
function cairoOffset(t) {
  const m = new Date(t).toLocaleString('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/);
  const h = m ? Number(m[1]) : 2;
  return (h >= 0 ? '+' : '-') + String(Math.abs(h)).padStart(2, '0') + ':00';
}
export function dailyDealOffer(deals, now = Date.now()) {
  const queue = Array.isArray(deals?.queue) ? deals.queue : [];
  if (!queue.length || !deals.startDate) return null;
  const today = cairoDate(now);
  const days = Math.round((Date.parse(today) - Date.parse(deals.startDate)) / DAY);
  if (!Number.isFinite(days) || days < 0) return null;
  const d = queue[days % queue.length];
  const price = Number(d?.offerPrice);
  if (!d?.productId || !(price > 0)) return null;
  const tomorrow = new Date(Date.parse(today) + DAY + 12 * 3600000);
  return { id: 'daily-deal', title: 'عرض اليوم', kind: 'price', scope: 'products', productIds: [String(d.productId)], discountType: 'price', value: price, status: 'active',
    endsAt: new Date(cairoDate(tomorrow) + 'T00:00:00' + cairoOffset(tomorrow)).toISOString(), daily: true };
}

// الكوبون الدعائي (promoCoupons من /api/store-data) → داتا قوالب الكوبون
export function couponData(c) {
  const t = String(c.discountType || c.type || '').toLowerCase();
  const type = /ship/.test(t) ? 'free_shipping' : t === 'percent' ? 'percent' : 'amount';
  return { code: String(c.code || '').toUpperCase(), type, value: Number(c.value) || 0, maxDiscount: Number(c.maxDiscount) || 0, minSubtotal: Number(c.minOrder ?? c.minSubtotal) || 0, endsAt: c.endsAt || '' };
}
export const promoCouponList = (coupons = [], now = Date.now()) => coupons.filter(c => {
  if (!c || !c.code || c.active === false || !inWindow(c, now, false)) return false;
  const d = couponData(c);
  return d.type === 'free_shipping' || d.value > 0;
});

// ─── الصور ───────────────────────────────────────────────────────────────
export function productImageJob(p, pr) {
  const image = heroImage(p);
  const name = cleanLine(p.name);
  // «العرض لحد …» بيظهر بس لو عرض حقيقي على المنتج (مش الخصم الثابت)
  const offerOn = pr.oldPrice && pr.price < p.price;
  if (pr.oldPrice) return { template: 'sale-ribbon', skin: SKIN, format: 'portrait', data: { name, image, price: pr.price, oldPrice: pr.oldPrice, headline: pr.tag && pr.tag !== 'خصم' ? gold(cleanLine(pr.tag)) : '', endsAt: offerOn ? pr.endsAt || '' : '' } };
  return { template: 'product-bar', skin: SKIN, format: 'portrait', data: { name, image, price: pr.price, sub: 'شحن لكل المحافظات' } };
}

export function offerImageJob(o, p, { price, regular, soon }) {
  const title = cleanLine(o.title) || 'عرض خاص';
  return { template: 'sale-burst', skin: SKIN, format: 'portrait', data: { name: cleanLine(p.name), image: heroImage(p), price, oldPrice: regular, headline: gold(title) + (soon ? ` · يبدأ ${dayMonth(o.startsAt)}` : ''), endsAt: o.endsAt } };
}

export function couponImageJob(c) {
  const d = couponData(c);
  const head = safe(c.title);
  return { template: 'coupon-ticket', skin: SKIN, format: 'portrait', data: { ...d, headline: head ? gold(head) : 'هدية ليك من **فرح مصر**' } };
}

// ─── الريلز (نفس إيقاع ريل المنتج: كل مشهد ≈2.2 ث مقفول على ضربات المزيكا) ─────
function beatClock(track) {
  const P = 60 / track.bpm, T = 0.12;
  const NB = Math.max(2, Math.round(2.2 / P));
  const D = k => +((k === 4 ? NB : Math.round(NB * k / 4)) * P + T).toFixed(3);
  return { P, T, NB, D, half: +(Math.round(NB / 2) * P).toFixed(2) };
}
const storyboard = (name, product, track, variant, T, scenes) => ({
  name, ...(product ? { product } : {}), format: 'story', skin: SKIN, fps: 30, voice: null,
  music: track.file, musicStart: track.start, musicVolume: 0.9, autoWhoosh: false,
  transitions: TRANS.slice(variant % 2), transitionDur: T, scenes,
});

// العرض يخبط ← المنتج (لقطة حقيقية لو موجودة) ← ميزة ← السعر قبل/بعد ← الطلب و«العرض لحد …»
export function buildOfferReel(o, p, { price, regular, soon }, { copy = null, track = TRACKS[0], variant = 0 } = {}) {
  const { T, D, half } = beatClock(track);
  const img0 = heroImage(p);
  const more = (p.images || []).filter(u => u && u !== img0);
  const name = shortName(p);
  const title = cleanLine(o.title) || 'عرض خاص';
  const pct = Math.round(100 - (100 * price) / regular);
  const ben = benefitsFor(p, copy)[0];
  const scenes = [
    { angle: 'العرض', template: 'v-slam', data: { lines: [{ text: gold(title), at: 0.05, size: title.length > 16 ? 96 : 124 }, { text: pct >= 5 ? `خصم **${pct}%**` : `وفّر **${regular - price} ج**`, at: half, size: 170 }], confettiAt: half },
      dur: D(5), sfx: [{ s: 'hit', at: 0.05, v: 0.5 }, { s: 'hit', at: half, v: 0.45 }] },
    p.video
      ? { angle: 'المنتج', clip: p.video, from: 1.2, zoom: [1.04, 1.16], overlay: 'v-overlay', data: { headline: gold(name) }, dur: D(4), sfx: [{ s: 'pop', at: 0.15, v: 0.3 }] }
      : { angle: 'المنتج', template: 'v-hook', data: { image: img0, headline: gold(name), move: 'snap', fit: 'contain' }, dur: D(4), sfx: [{ s: 'pop', at: 0.15, v: 0.3 }] },
    ...(ben ? [{ angle: 'ميزة', template: 'v-shot', data: { image: more[0] || img0, headline: gold(ben), move: MOVES[variant % MOVES.length], fit: 'contain' }, dur: D(4), sfx: [{ s: 'pop', at: 0.15, v: 0.28 }] }] : []),
    { angle: 'السعر', template: 'v-flash', data: { image: img0, name, price, oldPrice: regular, tag: title }, dur: D(5), sfx: [{ s: 'ding', at: 0.3, v: 0.5 }] },
    { angle: 'الطلب', template: 'v-cta', data: { image: img0, cta: ctaFor(p, copy),
      labels: soon ? [`يبدأ ${dayMonth(o.startsAt)}`, 'شحن لكل المحافظات'] : ['شحن لكل المحافظات', 'استبدال خلال 14 يوم'], icons: soon ? ['calendar', 'truck'] : ['truck', 'refresh'],
      labelsAt: [0.15, 0.45], ctaAt: 0.8, note: `العرض لحد ${dayMonth(o.endsAt)}`, noteAt: 1.6 }, dur: D(7), sfx: [{ s: 'riser', at: -1.0, v: 0.3 }, { s: 'hit', at: 0.8, v: 0.45 }] },
  ];
  return storyboard(`offer-${safeId(o.id)}-${p.id}`, p.id, track, variant, T, scenes);
}

// هدية ← كارت الكوبون ← الكود كبير ← إزاي تستخدمه ← الطلب (4 منتجات)
export function buildCouponReel(c, grid, { soon = false, track = TRACKS[0], variant = 0 } = {}) {
  const { T, D, half, P, NB } = beatClock(track);
  const d = couponData(c);
  const t = couponTexts(d);
  const head = safe(c.title);
  const big = d.type === 'free_shipping' ? 'شحن **مجاني**' : d.type === 'percent' ? `خصم **${d.value}%**` : `خصم **${d.value} ج**`;
  const step = +(Math.round(NB / 3) * P).toFixed(2);
  const when = soon ? { icon: 'calendar', text: `يبدأ ${dayMonth(c.startsAt)}`, sub: d.endsAt ? `ولحد ${dayMonth(d.endsAt)}` : '' }
    : d.endsAt ? { icon: 'clock', text: `لحد ${dayMonth(d.endsAt)}` } : null;
  const scenes = [
    { angle: 'الهدية', template: 'v-slam', data: { lines: [{ text: head ? gold(head) : 'هدية ليك من **فرح مصر**', at: 0.05, size: 104 }, { text: big, at: half, size: 170 }], confettiAt: half },
      dur: D(4), sfx: [{ s: 'hit', at: 0.05, v: 0.5 }, { s: 'hit', at: half, v: 0.45 }] },
    { angle: 'الكوبون', template: 'coupon-giftcard', data: { ...d, headline: 'كود خصم **ليك إنت**' }, dur: D(4), sfx: [{ s: 'pop', at: 0.3, v: 0.35 }] },
    { angle: 'الكود', template: 'coupon-code', data: { ...d }, dur: D(5), sfx: [{ s: 'ding', at: 0.6, v: 0.45 }] },
    { angle: 'إزاي', template: 'v-trust', data: { image: grid[0] || '', items: [
      { icon: 'ticket', text: 'اكتب الكود وإنت بتطلب', sub: t.code, at: 0.05 },
      { icon: 'shopping-cart', text: t.cond, ...(t.cap ? { sub: t.cap } : {}), at: step },
      ...(when ? [{ ...when, at: +(2 * step).toFixed(2) }] : []),
    ] }, dur: D(5), sfx: [{ s: 'pop', at: 0.05, v: 0.3 }, { s: 'pop', at: step, v: 0.3 }, ...(when ? [{ s: 'pop', at: 2 * step, v: 0.3 }] : [])] },
    { angle: 'الطلب', template: 'v-cta', data: { ...(grid.length >= 4 ? { grid: grid.slice(0, 4) } : { image: grid[0] || '' }), cta: 'اطلب دلوقتي',
      labels: ['شحن لكل المحافظات', 'استبدال خلال 14 يوم'], icons: ['truck', 'refresh'], labelsAt: [0.15, 0.45], ctaAt: 0.8, note: `الكود ${t.code}`, noteAt: 1.6 },
      dur: D(7), sfx: [{ s: 'riser', at: -1.0, v: 0.3 }, { s: 'hit', at: 0.8, v: 0.45 }] },
  ];
  return storyboard(`coupon-${safeId(c.id || c.code)}`, null, track, variant, T, scenes);
}

// ─── كلام البوست (مصري، من غير «الدفع عند الاستلام» ولا ادعاءات) ─────────────
export function productCaption(p, copy, pr) {
  const off = pr.oldPrice ? Math.round(100 - (100 * pr.price) / pr.oldPrice) : 0;
  const hook = safe(copy?.hook2) || safe(copy?.hook) || (off >= 10 ? `${shortName(p)} بخصم ${off}%` : shortName(p));
  const offerOn = pr.oldPrice && pr.price < p.price && pr.endsAt;
  return [
    `${off ? '🔥' : '✨'} ${hook}`,
    ...benefitsFor(p, copy).map(b => `✔️ ${b}`),
    pr.oldPrice ? `💰 ${pr.price} ج بدل ${pr.oldPrice} ج${pr.tag && pr.tag !== 'خصم' ? ` — ${cleanLine(pr.tag)}` : ''}` : `💰 ${pr.price} ج`,
    ...(offerOn ? [`⏳ العرض لحد ${dayMonth(pr.endsAt)}`] : []),
    SHIP,
    `🛒 ${ctaFor(p, copy)}: ${urlOf(p)}`,
    TAGS,
  ].join('\n');
}

export function offerCaption(o, p, copy, { price, regular, soon }) {
  const title = cleanLine(o.title) || 'عرض خاص';
  const pct = Math.round(100 - (100 * price) / regular);
  return [
    `🔥 ${title}: ${shortName(p)} بـ ${price} ج بدل ${regular} ج`,
    ...benefitsFor(p, copy).slice(0, 2).map(b => `✔️ ${b}`),
    `💰 وفّر ${regular - price} ج (خصم ${pct}%)`,
    soon ? `⏳ العرض يبدأ ${dayMonth(o.startsAt)} ولحد ${dayMonth(o.endsAt)}` : `⏳ العرض لحد ${dayMonth(o.endsAt)}`,
    SHIP,
    `🛒 ${ctaFor(p, copy)}: ${urlOf(p)}`,
    TAGS,
  ].join('\n');
}

export function couponCaption(c, { soon }) {
  const d = couponData(c);
  const t = couponTexts(d);
  const when = soon ? `⏳ الكود يبدأ ${dayMonth(c.startsAt)}${d.endsAt ? ` ولحد ${dayMonth(d.endsAt)}` : ''}` : d.endsAt ? `⏳ الكود شغال لحد ${dayMonth(d.endsAt)}` : '';
  return [
    `🎁 ${safe(c.title) || 'هدية ليك من فرح مصر'}`,
    `✔️ ${t.title} ${t.cond}${t.cap ? ` (${t.cap})` : ''}`,
    `✔️ اكتب الكود ${t.code} وإنت بتطلب`,
    ...(when ? [when] : []),
    SHIP,
    `🛒 اطلب دلوقتي: ${SITE}`,
    TAGS,
  ].join('\n');
}

// ─── الخطة: كل اللي المفروض يبقى موجود دلوقتي ببصمته ─────────────────────────
export function planPromo(store, { bank = {}, now = Date.now() } = {}) {
  const products = (store.products || []).filter(p => p.price > 0);
  const offers = store.offers || [];
  const items = [];
  const trackFor = key => { const variant = parseInt(hex('t' + key).slice(0, 8), 16) % TRACKS.length; return { track: TRACKS[variant], variant }; };

  // 1) صورة لكل منتج بسعره الحالي (زي الموقع بالظبط، ومعاه عرض اليوم — من غير تاريخ عشان الصورة ماتتعملش كل يوم)
  const daily = dailyDealOffer(store.dailyDeals, now);
  for (const p of products) {
    if (!heroImage(p)) continue;
    const pr = priceOf(p, daily ? [...offers, daily] : offers, now);
    if (daily && pr.endsAt === daily.endsAt && pr.tag === daily.title) pr.endsAt = '';
    const job = productImageJob(p, pr);
    items.push({ key: `product-image:${p.id}`, type: 'product-image', kind: 'image', dir: p.id, code: p.id, slug: p.slug || '', products: [p.id],
      title: cleanLine(p.name), caption: productCaption(p, bank[p.id], pr), sig: sigOf(job), job,
      note: pr.oldPrice ? `${pr.price} ج بدل ${pr.oldPrice} ج${pr.tag ? ` (${pr.tag})` : ''}` : `${pr.price} ج` });
  }

  // 2) العروض: ريل + صورة لكل منتج في العرض
  for (const o of promoOffers(offers, now)) {
    const soon = soonOf(o, now);
    const window = { startsAt: o.startsAt || null, endsAt: o.endsAt };
    const title = cleanLine(o.title) || 'عرض خاص';
    for (const r of offerProducts(o, products)) {
      const { p } = r;
      const x = { ...r, soon };
      const copy = bank[p.id] || null;
      const id = `${o.id}:${p.id}`;
      const common = { offerId: o.id, code: p.id, slug: p.slug || '', products: [p.id], dir: `${safeId(o.id)}/${p.id}`, title: `${title} — ${shortName(p)}`,
        caption: offerCaption(o, p, copy, x), window, note: `${r.price} ج بدل ${r.regular} ج${soon ? ' (لسه هيبدأ)' : ''}` };
      const sb = buildOfferReel(o, p, x, { copy, ...trackFor(id) });
      items.push({ key: `offer-reel:${id}`, type: 'offer-reel', kind: 'reel', ...common, sig: sigOf(sb), storyboard: sb });
      const job = offerImageJob(o, p, x);
      items.push({ key: `offer-image:${id}`, type: 'offer-image', kind: 'image', ...common, sig: sigOf(job), job });
    }
  }

  // 3) الكوبونات الدعائية (لو المتجر بيبعتها)
  const grid = products.filter(p => heroImage(p)).sort((a, b) => (Number(!!b.oldPrice) - Number(!!a.oldPrice)) || a.id.localeCompare(b.id)).slice(0, 4).map(heroImage);
  for (const c of promoCouponList(store.promoCoupons || [], now)) {
    const soon = soonOf(c, now);
    const cid = String(c.id || c.code);
    const d = couponData(c);
    const common = { couponId: cid, dir: safeId(cid), title: `${safe(c.title) || 'كوبون'} — ${d.code}`, caption: couponCaption(c, { soon }),
      window: { startsAt: c.startsAt || null, endsAt: c.endsAt || null }, note: `${couponTexts(d).title} ${couponTexts(d).cond}${soon ? ' (لسه هيبدأ)' : ''}` };
    const sb = buildCouponReel(c, grid, { soon, ...trackFor(cid) });
    items.push({ key: `coupon-reel:${cid}`, type: 'coupon-reel', kind: 'reel', ...common, sig: sigOf(sb), storyboard: sb });
    const job = couponImageJob(c);
    items.push({ key: `coupon-image:${cid}`, type: 'coupon-image', kind: 'image', ...common, sig: sigOf(job), job });
  }
  return items;
}

// ─── الفهرس العام promo/index.json (العقد مع طابور النشر — الحقول دي بالظبط) ─────
export function promoEntry(w, media) {
  const e = { key: w.key, type: w.type };
  if (w.code) e.code = w.code;
  if (w.offerId) e.offerId = w.offerId;
  if (w.couponId) e.couponId = w.couponId;
  e.title = w.title;
  e.caption = w.caption;
  e.url = media.url;
  if (media.poster) e.poster = media.poster;
  if (media.sheet) e.sheet = media.sheet;
  e.sig = w.sig;
  e.at = media.at;
  if (w.window) e.window = w.window;
  if (w.products?.length) e.products = w.products;
  if (w.slug) e.slug = w.slug;
  return e;
}

// الفهرس الجديد = اللي المفروض يبقى موجود دلوقتي (wanted) وليه ملف ببصمته (اتعمل دلوقتي أو قبل كده).
// العرض/الكوبون اللي خلص أو اتشال، والمنتج اللي اتشال، والنسخة القديمة اللي سعرها اتغير — كلهم بيتشالوا.
// لو خطة المتجر مش متاحة (wanted = null): بنضيف الجديد ونشيل اللي نهايته عدّت بس.
export function mergePromoIndex(prev, fresh = [], wanted = null, now = Date.now()) {
  const old = prev?.items || {};
  const got = new Map(fresh.filter(r => r?.key && r.url).map(r => [r.key, r]));
  const items = {};
  if (wanted) {
    for (const w of wanted) {
      const f = got.get(w.key);
      const media = f?.sig === w.sig ? f : old[w.key]?.sig === w.sig ? old[w.key] : null;
      if (media?.url) items[w.key] = promoEntry(w, media);
    }
  } else {
    Object.assign(items, old, Object.fromEntries(got));
    for (const [k, v] of Object.entries(items)) if (v.window?.endsAt && Date.parse(v.window.endsAt) <= now) delete items[k];
  }
  const dropped = Object.keys(old).filter(k => !items[k]);
  return { index: { at: new Date(now).toISOString(), items }, dropped };
}
