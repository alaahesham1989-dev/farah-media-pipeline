// أجزاء صغيرة بتتكرر في القوالب (لوجو، سعر، صورة، شريط الثقة...) + حسابات الأرقام والتواريخ.
// كل حاجة هنا بتطلع HTML نص عادي؛ مفيش أي اعتماد على السيرفر.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const money = v => Math.round(num(v)).toLocaleString('en-US');

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export function dayMonth(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${p.day} ${MONTHS[Number(p.month) - 1]}`;
}
export const untilText = iso => (iso ? `العرض لحد ${dayMonth(iso)}` : '');

// **كلمة** في أي نص = تتلوّن بالدهبي
// والنسبة (49%) بتتعزل شمال-يمين عشان ماتتقلبش لـ «%49» جوه الكلام العربي
export const ltrPct = html => html.replace(/(\d[\d.,]*\s?%)/g, '<span style="unicode-bidi:isolate;direction:ltr">$1</span>');
export const rich = s => ltrPct(esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="foil-text">$1</span>').replace(/\n/g, '<br>'));

export const icon = (name, extra = '') => `<i class="ic" style="--ic:url('/assets/icons/${esc(name)}.svg');${extra}"></i>`;

export function lockup(ctx, { size = 40, mark = 84, en = true, a = '', d = '' } = {}) {
  const b = ctx.brand;
  return `<div class="lockup" style="--ls:${size}px;${d ? `--d:${d};` : ''}" ${a ? `data-a="${a}"` : ''}>
    <div class="mark" style="--s:${mark}px"></div>
    <div class="nm"><span class="ar">${esc(b.short)}</span>${en && b.en ? `<span class="en">${esc(b.en)}</span>` : ''}</div></div>`;
}
export const mark = (s = 96, extra = '') => `<div class="mark" style="--s:${s}px;${extra}"></div>`;

export function price(v, size, cls = '') {
  return `<span class="price ${cls}" style="font-size:${size}px"><span>${money(v)}</span><span class="cur">ج</span></span>`;
}
export const oldPrice = (v, size) => (num(v) ? `<span class="old" style="font-size:${size}px">${money(v)} ج</span>` : '');

// صورة المنتج: cutout = صورة مقصوصة من غير خلفية، غير كده الصورة الخام في إطار
export function photo(d, { cls = '', fit, pad, style = '', a = '' } = {}) {
  const src = d.cutout || d.image;
  if (!src) return `<div class="ph ${cls}" style="${style}"></div>`;
  const f = fit || d.fit || (d.cutout ? 'contain' : 'cover');
  return `<div class="ph ${cls}${pad ? ' pad' : ''}" style="--fit:${f};--pos:${esc(d.pos || 'center')};${pad ? `--pad:${pad}px;` : ''}${style}">
    <img src="${esc(src)}" alt="" ${a ? `data-a="${a}"` : ''} ${d.cutout ? 'class="cut"' : ''}></div>`;
}

export function season(ctx, a = '', d = '') {
  const t = ctx.data.season ?? ctx.skin.label;
  return t ? `<span class="season" ${a ? `data-a="${a}" style="--d:${d}"` : ''}>${icon('sparkles')}${esc(t)}</span>` : '';
}

// شريط الثقة: بيطلع من brand.json بس (كلام صحيح)
export function strip(ctx) {
  return esc(ctx.data.strip ?? ctx.brand.strip ?? 'شحن لكل المحافظات • استبدال أو استرجاع خلال 14 يوم');
}

export function percentOf(d) {
  if (num(d.percent)) return Math.round(num(d.percent));
  if (num(d.oldPrice) > num(d.price) && num(d.price) > 0) return Math.round((1 - num(d.price) / num(d.oldPrice)) * 100);
  return 0;
}
export const saved = d => Math.max(0, Math.round(num(d.oldPrice) - num(d.price)));

// كلام الكوبون من بياناته (نفس منطق js/coupons.js في المتجر)
export function couponTexts(d) {
  const t = d.type || 'amount';
  const value = t === 'percent' ? `${num(d.value)}%` : t === 'amount' ? `${money(d.value)} ج` : '';
  const title = t === 'free_shipping' ? 'شحن مجاني' : `خصم ${value}`;
  const cap = t === 'percent' && num(d.maxDiscount) ? `لحد ${money(d.maxDiscount)} ج` : '';
  const cond = num(d.minSubtotal) ? `على الطلبات من ${money(d.minSubtotal)} ج` : 'على أي طلب';
  const until = d.endsAt ? `صالح لحد ${dayMonth(d.endsAt)}` : '';
  return { t, value, title, cap, cond, until, code: String(d.code || 'FARAH').toUpperCase() };
}
