// أنواع الفيديو الجاهزة — كل واحد بيبني الـstoryboard من بيانات المتجر وملفات التسويق (kits) بس.
// صفر توكن: مفيش ولا جملة هنا بتتكتب بالذكاء الاصطناعي. اللي عايز يغيّر جملة يكتبها في الإعدادات.
import { dayMonth } from '../engine/parts.js';
import { offerPrice } from './resolve.mjs';

const byId = (store, id) => store.products.find(p => p.id === id);
const pick = (store, n, filter = () => true) => store.products.filter(p => p.images.length && filter(p)).sort((a, b) => (b.images.length - a.images.length) || a.id.localeCompare(b.id)).slice(0, n);
const spokenPrice = p => `بـ ${Math.round(p)} جنيه`;
const inDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const cta = { template: 'brand-cta', data: { qr: true }, dur: 3, say: 'اطلب دلوقتي من موقع فرح مصر.' };

export const PRESETS = [
  {
    id: 'why-farah', name: 'ليه فرح؟', desc: 'فيديو للمتجر نفسه: افتتاحية + 3 منتجات بسرعة + الثقة + خطوات الطلب + النهاية (~20 ث)',
    fields: [{ k: 'headline', label: 'الجملة الأولى', ph: 'حاجات حلوة للبيت ولنفسك، **بسعر يفرّح**' }],
    build(store, o) {
      const ps = pick(store, 3);
      return {
        scenes: [
          { template: 'brand-hook', data: { headline: o.headline || 'حاجات حلوة للبيت ولنفسك، **بسعر يفرّح**' }, dur: 2.6, say: 'من فرح مصر: حاجات حلوة للبيت ولنفسك، بسعر يفرّح.' },
          ...ps.map((p, i) => ({ template: 'brand-product', product: p.id, data: { index: i + 1, total: ps.length }, dur: 1.9, transition: 'slideleft' })),
          { template: 'brand-trust', data: { freeShipping: store.shipping.freeShipping, freeShippingFar: store.shipping.freeShippingFar }, dur: 3.5, say: 'بنشحن لكل المحافظات، والاستبدال أو الاسترجاع خلال أربعتاشر يوم.' },
          { template: 'brand-steps', dur: 3.2, say: 'اختار منتجك، اكتب بياناتك، واستلم في البيت.' },
          cta,
        ],
      };
    },
  },
  {
    id: 'catalog-flash', name: 'كتالوج سريع', desc: 'منتجات ورا بعض بإيقاع سريع بالاسم والسعر (~15 ث) — ممتاز للستوري',
    fields: [{ k: 'count', label: 'عدد المنتجات', type: 'number', ph: '6' }, { k: 'headline', label: 'العنوان', ph: 'جديد **فرح مصر**' }],
    build(store, o) {
      const ps = pick(store, Math.min(10, Number(o.count) || 6));
      return {
        scenes: [
          { template: 'brand-hook', data: { headline: o.headline || 'جديد **فرح مصر**', sub: 'اختار اللي يعجبك' }, dur: 1.8, say: o.voiceIntro ?? 'شوف الجديد عندنا.' },
          ...ps.map((p, i) => ({ template: 'brand-product', product: p.id, data: { index: i + 1, total: ps.length }, dur: 1.5, transition: i % 2 ? 'slideleft' : 'slideright' })),
          { ...cta, dur: 2.6 },
        ],
        transitionDur: 0.28,
      };
    },
  },
  {
    id: 'product-showcase', name: 'منتج بطل', desc: 'منتج واحد: هوك من ملف التسويق + صوره + لقطة حقيقية (لو موجودة) + السعر + النهاية',
    fields: [{ k: 'product', label: 'المنتج', type: 'product' }],
    build(store, o) {
      const p = byId(store, o.product) || pick(store, 1)[0];
      const hook = p.hooks?.[0] || p.headlines?.[0] || p.name;
      const lines = (p.overlays?.length ? p.overlays : p.headlines || []).filter(t => !/الدفع عند الاستلام/.test(t)).slice(0, 3);
      const imgs = p.images.slice(0, 3);
      const scenes = [{ template: 'brand-hook', data: { headline: hook, image: p.images[0] }, dur: 2.6, say: hook }];
      if (p.video) scenes.push({ clip: p.video, from: 1, dur: 3.2, caption: lines[0] || p.name, say: lines[0] });
      imgs.slice(p.video ? 1 : 0).forEach((u, i) => scenes.push({ template: 'product-glass', product: p.id, data: { image: u, sub: lines[i + (p.video ? 1 : 0)] || p.sub, showPrice: false }, dur: 2.2, say: lines[i + (p.video ? 1 : 0)] }));
      scenes.push({ template: 'product-bar', product: p.id, dur: 2.6, say: `${p.name} ${spokenPrice(p.price)}.` });
      scenes.push(cta);
      return { scenes };
    },
  },
  {
    id: 'offer-week', name: 'عرض على منتج', desc: 'عرض حقيقي من المتجر (أو السعر قبل/بعد) بتاريخ نهايته — شريط + فاتورة + النهاية',
    fields: [{ k: 'product', label: 'المنتج', type: 'product' }, { k: 'offer', label: 'العرض', type: 'offer' }],
    build(store, o) {
      const p = byId(store, o.product) || pick(store, 1, x => x.oldPrice)[0];
      const of = store.offers.find(x => x.id === o.offer && x.kind !== 'cart');
      let price = p.price, old = p.oldPrice;
      if (of) { const np = offerPrice(of, p.price); if (np != null && np < p.price) { old = p.price; price = np; } }
      const data = { price, oldPrice: old, endsAt: of?.endsAt || '' };
      const until = data.endsAt ? ` لحد ${dayMonth(data.endsAt)}` : '';
      return {
        scenes: [
          { template: 'brand-hook', data: { headline: `عرض على **${p.name}**`, image: p.images[0] }, dur: 2.4, say: `عرض على ${p.name}${until}.` },
          { template: 'sale-ribbon', product: p.id, data, dur: 3, say: old ? `بدل ${Math.round(old)}، بقى ${spokenPrice(price)}.` : `${spokenPrice(price)} بس.` },
          ...(p.video ? [{ clip: p.video, from: 1, dur: 3, caption: p.sub || p.name }] : []),
          { template: 'sale-receipt', product: p.id, data, dur: 2.8, say: old ? `يعني بتوفّر ${Math.round(old - price)} جنيه.` : '' },
          cta,
        ],
      };
    },
  },
  {
    id: 'coupon-drop', name: 'كوبون', desc: 'إعلان كوبون: هدية + كارت الكوبون + إزاي تستخدمه + النهاية',
    fields: [{ k: 'code', label: 'الكود', ph: 'FARAH50' }, { k: 'type', label: 'النوع', type: 'select', opts: [['amount', 'مبلغ'], ['percent', 'نسبة %'], ['free_shipping', 'شحن مجاني']] },
      { k: 'value', label: 'القيمة', type: 'number', ph: '50' }, { k: 'minSubtotal', label: 'أقل طلب', type: 'number', ph: '400' }, { k: 'endsAt', label: 'آخر يوم', type: 'date' }],
    build(store, o) {
      const c = { code: (o.code || 'FARAH50').toUpperCase(), type: o.type || 'amount', value: Number(o.value) || 50, minSubtotal: Number(o.minSubtotal) || 0, endsAt: o.endsAt || inDays(14) };
      const what = c.type === 'free_shipping' ? 'شحن مجاني' : c.type === 'percent' ? `خصم ${c.value} في المية` : `خصم ${c.value} جنيه`;
      const spelled = c.code.split('').join(' ');
      return {
        scenes: [
          { template: 'brand-hook', data: { headline: 'هدية ليك من **فرح مصر**' }, dur: 2.2, say: 'هدية ليك من فرح مصر.' },
          { template: 'coupon-giftcard', data: c, dur: 3.4, say: `${what}${c.minSubtotal ? ` على الطلبات من ${c.minSubtotal} جنيه` : ''}، بالكود ${spelled}.` },
          { template: 'coupon-code', data: c, dur: 3, say: `اكتب الكود وإنت بتطلب، لحد ${dayMonth(c.endsAt)}.` },
          cta,
        ],
      };
    },
  },
  {
    id: 'season-open', name: 'افتتاح موسم', desc: 'غلاف الموسم بالتواريخ + منتجات بخصم + النهاية (اختار السكين المناسب: الجمعة البيضاء، رمضان...)',
    fields: [{ k: 'title', label: 'اسم الموسم', ph: 'فاضي = اسم السكين' }, { k: 'headline', label: 'السطر', ph: 'خصومات لحد **40%**' },
      { k: 'startsAt', label: 'من', type: 'date' }, { k: 'endsAt', label: 'لحد', type: 'date' }],
    build(store, o) {
      const ps = pick(store, 3, x => x.oldPrice);
      const title = o.title || '';
      return {
        scenes: [
          { template: 'brand-season', data: { title: title || undefined, headline: o.headline || 'خصومات على **منتجات مختارة**', startsAt: o.startsAt || inDays(7), endsAt: o.endsAt || inDays(14) }, dur: 3.2,
            say: `${title || 'عروض فرح مصر'} بدأت، من ${dayMonth(o.startsAt || inDays(7))} لحد ${dayMonth(o.endsAt || inDays(14))}.` },
          ...ps.map((p, i) => ({ template: ['sale-burst', 'sale-split', 'sale-ribbon'][i % 3], product: p.id, data: { endsAt: o.endsAt || inDays(14) }, dur: 2.4, transition: 'slideleft' })),
          cta,
        ],
      };
    },
  },
];

export async function preset(id, { store, skin, voice = { name: 'ar-EG-SalmaNeural', rate: '+10%' }, params = {}, ...rest } = {}) {
  const p = PRESETS.find(x => x.id === id);
  if (!p) throw new Error('نوع فيديو مش موجود: ' + id);
  const built = p.build(store, { ...rest, ...params });
  for (const s of built.scenes) if (s.data) for (const k of Object.keys(s.data)) if (s.data[k] === undefined) delete s.data[k];
  return { name: id, format: 'story', skin: skin || 'farah', fps: 30, voice, transition: 'fade', ...built };
}
