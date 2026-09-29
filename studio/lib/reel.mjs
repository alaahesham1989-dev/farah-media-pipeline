// ريلز فرح: فيديو قصير (≈16 ث، طولي) لأي منتج منشور — من غير تعليق صوتي: كلام كبير + مزيكا + القطع على الإيقاع.
// بيتبني أوتوماتيك من بيانات المتجر، وبنك الكلام (copy/reels.json من Antigravity) لو موجود.
//   buildReel(product, { copy, stock, offers, track, variant }) → storyboard للمحرك
// الترتيب: هوك → المنتج → 3 مميزات → السعر → الطلب. لقطة حقيقية لو المنتج عنده فيديو، وإلا لقطات Pexels لنفس الاستخدام، وإلا صور المنتج بحركة.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './paths.mjs';
import { cleanLine } from './kit-video.mjs';

export const TRACKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', 'tracks.json'), 'utf8'));

const MOVES = ['orbit', 'punch', 'pan', 'dolly', 'float'];
const TRANS = ['fade', 'smoothleft', 'zoomin', 'fade', 'smoothright'];
const WOMEN = /بشرة|شعر|مكياج|تجميل|الأم|طفل|أظافر|حواجب|السيدات|للستات/;

const words = (s, n) => String(s || '').split(/\s+/).filter(Boolean).slice(0, n).join(' ');
// آخر كلمة دهبي
const gold = s => { const w = String(s).split(/\s+/); if (w.length > 1) w[w.length - 1] = `**${w[w.length - 1]}**`; return w.join(' '); };

// اسم قصير للشاشة: من غير الموديل الإنجليزي والأقواس، 4 كلمات بالكتير
export function shortName(p) {
  let n = cleanLine(p.name).replace(/\([^)]*\)/g, '').replace(/\b[A-Za-z][A-Za-z0-9.\-+]*\b/g, '').replace(/[.،,:\-–]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!n) n = cleanLine(p.name);
  // «4 في 1» كلمة واحدة عشان ماتتقطعش
  const w = n.replace(/(\d+)\s*في\s*(\d+)/g, '$1 في $2').split(/ +/).slice(0, 5);
  while (w.length > 2 && /^(في|من|مع|ل|و|على|عن)$/.test(w[w.length - 1])) w.pop();
  return w.join(' ');
}

// المميزات من «المشاكل اللي بيحلها» في صفحة المنتج (✔️ … <br>)
// الجملة لحد أول فاصلة، ولو لسه طويلة بتتقص على 5 كلمات من غير ما تخلص بحرف جر؛ والأقصر الأول
export function benefitsOf(p) {
  const trim = s => {
    const head = s.split(/[،,:؛;–]/)[0].trim();
    let w = (head.split(/\s+/).length >= 2 ? head : s).split(/\s+/);
    if (w.length > 6) w = w.slice(0, 5);
    while (w.length > 2 && /^(في|من|مع|على|عن|و|أو|تساعد|يساعد|بيساعد)$/.test(w[w.length - 1])) w.pop();
    return w.join(' ');
  };
  return String(p.benefitsText || '').split(/<br\s*\/?>|\n|✔️|✔|•/).map(s => cleanLine(s.replace(/<[^>]+>/g, '')))
    .filter(s => s && s.length > 3 && !/\d+\s*(ج|جنيه)/.test(s)).map(trim).filter(s => s.split(/\s+/).length >= 2)
    .sort((a, b) => a.length - b.length).slice(0, 3);
}

// سعر المنتج تحت عرض — نفس حسبة المتجر (js/offers.js priceUnder): نسبة (90% بالكتير) / مبلغ بيتخصم / سعر نهائي
export function offerPriceFor(o, regular) {
  const v = Number(o?.value);
  if (!(v > 0) || !(regular > 0)) return regular;
  const p = Math.round(o.discountType === 'percent' ? regular * (1 - Math.min(v, 90) / 100) : o.discountType === 'price' ? v : regular - v);
  return p >= 1 && p < regular ? p : regular;
}
// العرض بيشمل المنتج؟ (نفس appliesTo في المتجر: كل المنتجات / قسم / منتجات معينة)
export const offerAppliesTo = (o, p) => (o.scope === 'all' ? true : o.scope === 'category' ? (o.categories || []).includes(p.category) : (o.productIds || []).includes(p.id));

// السعر اللي الزبون هيدفعه النهارده: أرخص عرض سعر شغّال على المنتج (مش عروض السلة ولا لحظة الدفع)، وإلا الخصم الثابت (priceOriginal)
export function priceOf(p, offers = [], now = Date.now()) {
  const live = offers.filter(o => o.status === 'active' && (!o.startsAt || Date.parse(o.startsAt) <= now) && o.endsAt && Date.parse(o.endsAt) > now);
  let best = null;
  for (const o of live) {
    if (o.kind === 'cart' || o.kind === 'bump' || !offerAppliesTo(o, p)) continue;
    const price = offerPriceFor(o, p.price);
    if (price < p.price && (!best || price < best.price)) best = { price, oldPrice: p.price, tag: o.title || 'عرض', endsAt: o.endsAt };
  }
  if (best) return best;
  const opening = live.find(o => /الافتتاح/.test(o.title || ''));
  if (p.oldPrice && p.oldPrice > p.price) return { price: p.price, oldPrice: p.oldPrice, tag: opening ? 'عروض الافتتاح' : 'خصم', endsAt: opening?.endsAt || '' };
  return { price: p.price, oldPrice: null, tag: '', endsAt: '' };
}

// الهوك الافتراضي لحد ما بنك الكلام يوصل
function defaultHook(p, pr, bens) {
  const off = pr.oldPrice ? Math.round(100 - (100 * pr.price) / pr.oldPrice) : 0;
  if (off >= 15) return `${shortName(p)} بخصم ${off}%`;
  return bens[0] || shortName(p);
}

// بصمة المحتوى: لو السعر أو الكلام أو الصور اتغيرت، الفيديو بيتعمل تاني
export function reelSig(p, copy, pr, stock) {
  // v2 (29/9): لقطات Pexels العامة اتشالت من ريلز المنتجات (قرار المالك: مفيش صورة أو فيديو لمنتج تاني)
  const h = crypto.createHash('sha1').update(JSON.stringify([p.name, pr, (p.images || []).slice(0, 4), p.video, copy || null, (stock || []).filter(s => s.match === true).map(s => s.url), 'v2'])).digest('hex');
  return h.slice(0, 10);
}

export function buildReel(p, { copy = null, stock = [], offers = [], track = TRACKS[0], variant = 0, site = 'https://farahegypt.com' } = {}) {
  const pr = priceOf(p, offers);
  const P = 60 / track.bpm, T = 0.12;
  // كل مشهد ≈ 2.2 ث مقفول على عدد ضربات صحيح، مهما كانت سرعة المزيكا
  const NB = Math.max(2, Math.round(2.2 / P));
  const D = k => +((k === 4 ? NB : Math.round(NB * k / 4)) * P + T).toFixed(3);
  const imgs = (p.images || []).filter(Boolean);
  const img0 = imgs[0] || '';
  const name = shortName(p);
  const bens = (copy?.benefits?.length ? copy.benefits.map(cleanLine) : benefitsOf(p)).filter(Boolean).slice(0, 3);
  const hook = cleanLine(copy?.hook || defaultHook(p, pr, bens));
  const women = WOMEN.test(p.category || '') || copy?.audience === 'women';
  const cta = copy?.cta || (women ? 'اطلبي دلوقتي' : 'اطلب دلوقتي');
  // قرار المالك 29/9: ممنوع أي لقطة فيها منتج أو أداة تانية غير منتجنا (زي حلاق بموس في إعلان ماكينة).
  // لقطات المصادر المفتوحة بتدخل بس لو اتراجعت بالعين واتعلّم إنها نفس المنتج بالظبط (match: true — الماركة والموديل).
  // غير كده الفيديو بيتبني من تصوير المنتج الحقيقي وصوره هو بس.
  const clips = stock.filter(s => !s.sensitive && s.match === true);
  const real = p.video || '';
  const scenes = [];

  // 1) الهوك: لقطة حقيقية للمنتج، وإلا لقطة استخدام من Pexels، وإلا صورة المنتج بزووم خاطف
  if (real) scenes.push({ angle: 'هوك', clip: real, from: 1.2, zoom: [1.04, 1.18], overlay: 'v-overlay', data: { headline: gold(hook) }, dur: D(4), sfx: [{ s: 'hit', at: 0.05, v: 0.5 }] });
  else if (clips[0]) scenes.push({ angle: 'هوك', clip: clips[0].url, from: 0.5, zoom: [1.02, 1.12], overlay: 'v-overlay', data: { headline: gold(hook) }, dur: D(4), sfx: [{ s: 'hit', at: 0.05, v: 0.5 }] });
  else scenes.push({ angle: 'هوك', template: 'v-hook', data: { image: img0, headline: gold(hook), move: 'snap', fit: 'contain' }, dur: D(4), sfx: [{ s: 'hit', at: 0.05, v: 0.5 }] });

  // 2) المنتج نفسه
  scenes.push({ angle: 'المنتج', template: 'v-shot', data: { image: img0, headline: gold(name), move: 'orbit', fit: 'contain' }, dur: D(4), sfx: [{ s: 'pop', at: 0.15, v: 0.3 }] });

  // 3) المميزات: كل ميزة على صورة تانية للمنتج، أو لقطة من فيديوه، أو لقطة استخدام
  bens.forEach((b, i) => {
    const im = imgs[i + 1];
    const sfx = [{ s: 'pop', at: 0.15, v: 0.28 }];
    if (im) scenes.push({ angle: 'ميزة', template: 'v-shot', data: { image: im, headline: gold(b), move: MOVES[(i + 1 + variant) % MOVES.length], fit: 'contain' }, dur: D(4), sfx });
    else if (real) scenes.push({ angle: 'ميزة', clip: real, from: 4 + i * 3.5, zoom: i % 2 ? [1.2, 1.04] : [1.04, 1.22], pan: i % 2 ? [60, 42] : [42, 58], overlay: 'v-overlay', data: { headline: gold(b) }, dur: D(4), sfx });
    else if (clips[i + 1]) scenes.push({ angle: 'ميزة', clip: clips[i + 1].url, from: 0.5, zoom: [1.02, 1.1], overlay: 'v-overlay', data: { headline: gold(b) }, dur: D(4), sfx });
    else scenes.push({ angle: 'ميزة', template: 'v-shot', data: { image: img0, headline: gold(b), move: MOVES[(i + 2 + variant) % MOVES.length], ox: [30, 70, 50][i], oy: [40, 60, 35][i], fit: 'contain' }, dur: D(4), sfx });
  });

  // 4) السعر
  if (pr.oldPrice) scenes.push({ angle: 'السعر', template: 'v-flash', data: { image: img0, name, price: pr.price, oldPrice: pr.oldPrice, tag: pr.tag }, dur: D(4), sfx: [{ s: 'ding', at: 0.3, v: 0.5 }] });
  else scenes.push({ angle: 'السعر', template: 'v-price', data: { image: img0, price: pr.price, label: 'السعر', badge: 'شحن لكل المحافظات', countAt: 0.4, countDur: 0.6 }, dur: D(4), sfx: [{ s: 'ding', at: 1.05, v: 0.5 }] });

  // 5) الطلب
  scenes.push({ angle: 'الطلب', template: 'v-cta', data: { image: img0, cta, labels: ['شحن لكل المحافظات', 'استبدال خلال 14 يوم'], icons: ['truck', 'refresh'], labelsAt: [0.15, 0.45], ctaAt: 0.8, ...(copy?.close ? { note: cleanLine(copy.close), noteAt: 1.6 } : {}) }, dur: D(7), sfx: [{ s: 'riser', at: -1.0, v: 0.3 }, { s: 'hit', at: 0.8, v: 0.45 }] });

  const url = `${site}/p/${p.slug || p.id}`;
  const caption = [
    hook,
    ...bens.map(b => `✔️ ${b}`),
    pr.oldPrice ? `💰 ${pr.price} ج بدل ${pr.oldPrice} ج${pr.tag ? ` — ${pr.tag}` : ''}` : `💰 ${pr.price} ج`,
    '🚚 شحن لكل المحافظات · استبدال خلال 14 يوم',
    `🛒 ${cta}: ${url}`,
    '#فرح_مصر #FarahEgypt',
  ].join('\n');

  return {
    storyboard: {
      name: `reel-${p.id}`, product: p.id, format: 'story', skin: 'farah', fps: 30, voice: null,
      music: track.file, musicStart: track.start, musicVolume: 0.9, autoWhoosh: false,
      transitions: TRANS.slice(variant % 2), transitionDur: T, scenes,
    },
    meta: { code: p.id, name: p.name, slug: p.slug || '', price: pr.price, oldPrice: pr.oldPrice, tag: pr.tag, endsAt: pr.endsAt, hook, benefits: bens, cta, caption, url, music: track.title, real: !!real },
  };
}
