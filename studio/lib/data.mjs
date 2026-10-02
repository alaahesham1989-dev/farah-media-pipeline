// بيانات المتجر — قراية بس من الحاجات العامة (نفس اللي أي زائر للموقع بيشوفه).
// الاستوديو ممنوع يكتب أي حاجة في قاعدة فرح. الناتج بيتحفظ نسخة محلية في data/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';

const SITE = 'https://farahegypt.com/';
// نسخة المتجر العامة المحفوظة على Cloudflare (/api/store-data) — نفس اللي أي زائر بيشوفه، ومابتصرفش قرايات من Firestore
const STORE_DATA = process.env.STORE_DATA_URL || SITE + 'api/store-data';
const DATA = path.join(ROOT, 'data');
const KITS = path.resolve(ROOT, '..', 'catalog', 'content', 'kits');

const abs = u => (!u ? '' : /^https?:/.test(u) ? u : SITE + String(u).replace(/^\//, ''));

function readKit(id) {
  try { return JSON.parse(fs.readFileSync(path.join(KITS, id + '.json'), 'utf8')); } catch { return null; }
}

// منتج المتجر → الداتا اللي القوالب محتاجاها (من غير أي تكلفة أو سعر مورد)
export function toCard(p) {
  const kit = readKit(p.id);
  const price = Number(p.price) || 0;
  const orig = Number(p.priceOriginal) || 0;
  return {
    id: p.id,
    name: p.name || '',
    price,
    oldPrice: orig > price ? orig : null,
    category: p.category || '',
    images: (p.images || []).map(abs),
    imagesMeta: (p.imagesMeta || []).map(m => ({ url: abs(m?.url), kind: m?.kind || '', text: !!m?.textOnImage })),
    // الفيديو الدعائي (videoKind 'promo' = /media/reel/<code>.mp4) هو ريل المكنة نفسه — مش لقطة حقيقية، فمايدخلش في ريل جديد
    video: p.video && p.videoKind !== 'promo' && !/\/media\/reel\//.test(p.video) ? abs(p.video) : '',
    sub: kit?.adCopy?.headlines?.[0] || '',
    headlines: kit?.adCopy?.headlines || [],
    overlays: (kit?.carousel || []).map(c => c.overlay),
    hooks: (kit?.hooks || []).map(h => h.text),
    facts: (kit?.benefits || []).slice(0, 3).concat(kit ? [] : [String(p.description?.overview || p.seo?.description || '').slice(0, 140)]).filter(Boolean),
    policy: p.adPolicy || kit?.policy?.level || '',
    active: p.isActive !== false && (!p.status || p.status === 'active'),
    publishedAt: p.publishedAt || p.createdAt || '',
    slug: p.slug || '',
    benefitsText: String(p.marketing?.problemsSolved || ''),
    overview: String(p.description?.overview || ''),
  };
}

// النسخة من الموقع (بنجرب 4 مرات)، ولو النت وقع على السحابة: آخر نسخة سليمة محفوظة في R2 (private/store-data.json)
async function storeData() {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(STORE_DATA, { headers: { 'user-agent': 'farah-studio' } });
      if (r.ok) return await r.json();
      last = new Error('store-data: ' + r.status);
    } catch (e) { last = e; }
    await new Promise(ok => setTimeout(ok, 3000 * (i + 1)));
  }
  if (process.env.R2_ACCESS_KEY_ID) {
    const { getJsonFrom } = await import('../../scripts/storage.mjs');
    const backup = await getJsonFrom(process.env.MEDIA_BUCKET || 'farah-media', 'private/store-data.json', null);
    if (backup?.products?.length) { console.log('⚠️ الموقع مارَدّش — استخدمنا آخر نسخة محفوظة في R2'); return backup; }
  }
  throw last;
}

export async function refresh() {
  fs.mkdirSync(DATA, { recursive: true });
  const sd = await storeData();
  const shipping = sd.settings?.shipping || {};
  const snap = {
    at: new Date().toISOString(), source: sd.at || '',
    products: (sd.products || []).map(toCard).filter(p => p.active),
    offers: (sd.offers || []).map(o => ({ id: o.id, title: o.title, subtitle: o.subtitle || '', kind: o.kind || 'price', discountType: o.discountType, value: o.value,
      minQty: o.minQty, reward: o.reward, productIds: o.productIds || [], categories: o.categories || [], scope: o.scope, startsAt: o.startsAt, endsAt: o.endsAt, status: o.status })),
    shipping: { freeShipping: shipping.freeShippingThreshold ?? null, freeShippingFar: shipping.zoneThresholds?.zone3 ?? null },
    // عرض اليوم (settings/daily_deals): { startDate, queue: [{ productId, offerPrice }] } — منتج بسعر خاص بيتغير كل يوم
    dailyDeals: sd.settings?.daily_deals ? { startDate: sd.settings.daily_deals.startDate || '', queue: Array.isArray(sd.settings.daily_deals.queue) ? sd.settings.daily_deals.queue : [] } : null,
    // الكوبونات الدعائية (اللي المالك عايزها تتنشر) — اختياري، لو المتجر لسه مابيبعتهاش بتبقى فاضية
    promoCoupons: (Array.isArray(sd.promoCoupons) ? sd.promoCoupons : []).filter(c => c && c.code).map(c => ({ id: String(c.id || c.code), code: String(c.code).toUpperCase(),
      title: c.title || '', discountType: c.discountType || c.type || '', value: Number(c.value) || 0, minOrder: Number(c.minOrder ?? c.minSubtotal) || 0,
      maxDiscount: Number(c.maxDiscount) || 0, startsAt: c.startsAt || '', endsAt: c.endsAt || '', active: c.active !== false })),
  };
  fs.writeFileSync(path.join(DATA, 'store.json'), JSON.stringify(snap, null, 1));
  return snap;
}

export async function load({ maxAgeMin = 60 } = {}) {
  const f = path.join(DATA, 'store.json');
  try {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - Date.parse(s.at) < maxAgeMin * 60000) return s;
  } catch {}
  try { return await refresh(); } catch (e) {
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    throw e;
  }
}
