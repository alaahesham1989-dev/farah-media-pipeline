// كروت المتجر نفسه (مش منتج بعينه) — بتتعمل منها فيديوهات المتجر وبوستات الثقة.
// كل الكلام الافتراضي جاي من brand.json (صحيح ومطابق لسياسات الموقع).
import { esc, rich, lockup, mark, photo, price, oldPrice, season, icon, money, num, untilText, dayMonth } from '../parts.js';

const fill = (s, d) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => money(d[k] ?? ''));

export const brand = [
  {
    id: 'brand-hook', noFooter: true, type: 'brand', name: 'افتتاحية', desc: 'جملة كبيرة تشد في أول 3 ثواني (ينفع فوق صورة)',
    render(ctx) {
      const { data: d, fmt } = ctx;
      return {
        css: `
.t-bhook .bgimg { position: absolute; inset: 0; }
.t-bhook .bgimg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, var(--bg) 8%, color-mix(in srgb, var(--bg) 55%, transparent) 60%, color-mix(in srgb, var(--bg) 30%, transparent)); }
.t-bhook .safe { display: flex; flex-direction: column; justify-content: ${d.image ? 'flex-end' : 'center'}; gap: 40px; }
.t-bhook .big { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 96 : 116}px; line-height: 1.12; }
.t-bhook .sub { font-size: 40px; }
.t-bhook .bar { width: 160px; height: 10px; border-radius: 5px; background: var(--foil); }`,
        html: `<div class="cv t-bhook">
  ${d.image ? `<div class="bgimg">${photo(d, { a: 'zoom' })}</div>` : ''}
  <div class="safe">
    <div data-a="fade">${lockup(ctx, { size: 34, mark: 72 })}</div>
    <div class="bar" data-a="wipe" style="--d:.15s"></div>
    <div class="big" data-fit="4" data-a="rise" style="--d:.25s">${rich(d.headline || 'حاجات حلوة للبيت ولنفسك، **بسعر يفرّح**')}</div>
    ${d.sub ? `<div class="sub" data-a="rise" style="--d:.5s">${rich(d.sub)}</div>` : ''}
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-trust', type: 'brand', name: 'ليه فرح؟', desc: 'مميزات الشراء من المتجر (الدفع والشحن والاستبدال) — كلها من السياسات الحقيقية',
    render(ctx) {
      const { data: d, fmt, brand: b } = ctx;
      const vals = { freeShipping: d.freeShipping ?? b.defaults.freeShipping, freeShippingFar: d.freeShippingFar ?? b.defaults.freeShippingFar };
      const items = (d.items || b.trust).slice(0, 4);
      const sq = fmt === 'square';
      return {
        css: `
.t-btrust .safe { display: flex; flex-direction: column; justify-content: center; gap: ${sq ? 30 : 50}px; }
.t-btrust .ttl { font-family: var(--f-display); font-weight: 900; font-size: ${sq ? 72 : 88}px; line-height: 1.1; }
.t-btrust .list { display: grid; grid-template-columns: ${sq ? '1fr 1fr' : '1fr'}; gap: ${sq ? 22 : 26}px; }
.t-btrust .it { display: flex; align-items: center; gap: 30px; background: var(--bg2); border: 2px solid var(--line); border-radius: 32px; padding: ${sq ? '26px 28px' : '30px 34px'}; }
.t-btrust .ico { width: ${sq ? 84 : 104}px; height: ${sq ? 84 : 104}px; border-radius: 28px; background: var(--foil); color: var(--foil-ink); display: grid; place-items: center; font-size: ${sq ? 46 : 56}px; flex: none; }
.t-btrust .t1 { font-family: var(--f-display); font-weight: 800; font-size: ${sq ? 36 : 44}px; line-height: 1.2; }
.t-btrust .t2 { font-size: ${sq ? 24 : 30}px; color: var(--ink2); margin-top: 4px; line-height: 1.35; }`,
        html: `<div class="cv t-btrust">
  <div class="safe">
    <div data-a="fade">${lockup(ctx, { size: 32, mark: 66 })}</div>
    <div class="ttl" data-a="rise" style="--d:.1s">${rich(d.headline || 'ليه تطلب من **فرح**؟')}</div>
    <div class="list">${items.map((it, i) => `<div class="it" data-a="left" style="--d:${.3 + i * .18}s"><div class="ico">${icon(it.icon || 'check')}</div>
      <div><div class="t1">${esc(fill(it.title, vals))}</div><div class="t2">${esc(fill(it.sub, vals))}</div></div></div>`).join('')}</div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-steps', type: 'brand', name: 'اطلب في 3 خطوات', desc: 'خطوات الطلب بالترتيب',
    render(ctx) {
      const { data: d, fmt, brand: b } = ctx;
      const steps = (d.steps || b.steps).slice(0, 4);
      const sq = fmt === 'square';
      return {
        css: `
.t-bsteps .safe { display: flex; flex-direction: column; justify-content: center; gap: ${sq ? 34 : 60}px; }
.t-bsteps .ttl { font-family: var(--f-display); font-weight: 900; font-size: ${sq ? 76 : 92}px; line-height: 1.1; }
.t-bsteps .list { position: relative; display: flex; flex-direction: column; gap: ${sq ? 26 : 46}px; }
.t-bsteps .list::before { content: ''; position: absolute; top: 40px; bottom: 40px; right: ${sq ? 45 : 55}px; width: 4px; background: var(--line); }
.t-bsteps .st { position: relative; display: flex; align-items: center; gap: 34px; }
.t-bsteps .n { width: ${sq ? 94 : 114}px; height: ${sq ? 94 : 114}px; border-radius: 50%; background: var(--foil); color: var(--foil-ink); display: grid; place-items: center; font-family: var(--f-display); font-weight: 900; font-size: ${sq ? 48 : 58}px; flex: none; box-shadow: 0 0 0 10px var(--bg); }
.t-bsteps .t1 { font-family: var(--f-display); font-weight: 800; font-size: ${sq ? 42 : 52}px; }
.t-bsteps .t2 { font-size: ${sq ? 26 : 32}px; color: var(--ink2); margin-top: 4px; }
.t-bsteps .site { align-self: flex-start; background: var(--acc); color: var(--acc-ink); border-radius: 999px; padding: 16px 36px; font-size: 34px; font-weight: 700; }`,
        html: `<div class="cv t-bsteps">
  <div class="safe">
    <div class="ttl" data-a="rise">${rich(d.headline || `اطلب في **${steps.length} خطوات**`)}</div>
    <div class="list">${steps.map((s, i) => `<div class="st" data-a="right" style="--d:${.25 + i * .3}s"><div class="n">${i + 1}</div><div><div class="t1">${esc(s.title)}</div><div class="t2">${esc(s.sub || '')}</div></div></div>`).join('')}</div>
    <div class="site" data-a="pop" style="--d:${.4 + steps.length * .3}s">${esc(b.site)}</div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-product', type: 'brand', name: 'منتج في الكتالوج', desc: 'كارت منتج للفيديو السريع (صورة + اسم + سعر + رقمه في السلسلة)',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const sq = fmt === 'square';
      return {
        css: `
.t-bprod .safe { display: flex; flex-direction: column; gap: ${sq ? 24 : 40}px; }
.t-bprod .head { display: flex; justify-content: space-between; align-items: center; }
.t-bprod .idx { font-family: var(--f-display); font-weight: 700; font-size: 30px; color: var(--ink2); direction: ltr; }
.t-bprod .ph { flex: 1; min-height: 0; border-radius: 44px; box-shadow: 0 0 0 3px var(--line); }
.t-bprod .row { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; }
.t-bprod .name { font-size: ${sq ? 50 : 60}px; }
.t-bprod .cat { font-family: var(--f-display); font-weight: 600; font-size: 28px; color: var(--acc); margin-bottom: 6px; }
.t-bprod .pcol { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }`,
        html: `<div class="cv t-bprod">
  <div class="safe">
    <div class="head" data-a="fade">${lockup(ctx, { size: 30, mark: 60, en: false })}${d.index ? `<span class="idx">${num(d.index)} / ${num(d.total)}</span>` : season(ctx)}</div>
    ${photo(d, { pad: d.cutout ? 40 : 0, a: 'zoom' })}
    <div class="row" data-a="rise" style="--d:.2s">
      <div style="flex:1;min-width:0">${d.category ? `<div class="cat">${esc(d.category)}</div>` : ''}<div class="name" data-fit="2">${esc(d.name)}</div></div>
      ${d.price ? `<div class="pcol" data-a="pop" style="--d:.45s">${oldPrice(d.oldPrice, 34)}${price(d.price, sq ? 80 : 96, 'foil-text')}</div>` : ''}
    </div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-cta', noFooter: true, type: 'brand', name: 'النهاية', desc: 'اللوجو الكبير + اطلب دلوقتي + الموقع (وكود QR لو عايز)',
    render(ctx) {
      const { data: d, fmt, brand: b } = ctx;
      const sq = fmt === 'square';
      const qr = d.qr ? `/api/qr?text=${encodeURIComponent('https://' + b.site)}` : '';
      return {
        css: `
.t-bcta .safe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${sq ? 30 : 48}px; text-align: center; }
.t-bcta .ring { width: ${sq ? 280 : 360}px; height: ${sq ? 280 : 360}px; border-radius: 50%; display: grid; place-items: center; background: var(--glow); box-shadow: 0 0 0 2px var(--line), 0 0 0 26px color-mix(in srgb, var(--acc) 5%, transparent); }
.t-bcta .nm { font-family: var(--f-lux); font-weight: 700; font-size: ${sq ? 64 : 80}px; line-height: 1.1; }
.t-bcta .en { font-family: var(--f-display); font-weight: 500; font-size: 26px; letter-spacing: .4em; color: var(--ink2); direction: ltr; margin-top: 10px; }
.t-bcta .btn { display: inline-flex; align-items: center; gap: 16px; background: var(--foil); color: var(--foil-ink); border-radius: 999px; padding: 26px 64px; font-family: var(--f-display); font-weight: 800; font-size: ${sq ? 48 : 56}px; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
.t-bcta .site { font-size: 38px; color: var(--ink); }
.t-bcta .qr { width: 220px; height: 220px; background: #fff; border-radius: 26px; padding: 20px; }
.t-bcta .qr img { width: 100%; height: 100%; }
.t-bcta .note { font-size: 30px; color: var(--ink2); }`,
        html: `<div class="cv t-bcta">
  <div class="safe">
    <div class="ring" data-a="pop">${mark(sq ? 200 : 260)}</div>
    <div data-a="rise" style="--d:.25s"><div class="nm">${esc(b.name)}</div>${b.en ? `<div class="en">${esc(b.en)}</div>` : ''}</div>
    <div class="btn" data-a="pop" style="--d:.55s">${icon('shopping-cart')} ${esc(d.cta || b.cta[0])}</div>
    ${qr && !sq ? `<div class="qr" data-a="fade" style="--d:.8s"><img src="${qr}" alt=""></div>` : ''}
    <div class="site" data-a="fade" style="--d:.8s">${esc(b.site)}</div>
    ${d.note ? `<div class="note" data-a="fade" style="--d:1s">${esc(d.note)}</div>` : ''}
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-season', type: 'brand', name: 'غلاف الموسم', desc: 'افتتاح موسم عروض (الجمعة البيضاء، رمضان...) بالتواريخ',
    render(ctx) {
      const { data: d, fmt, skin } = ctx;
      const sq = fmt === 'square';
      const title = d.title || skin.label || 'عروض فرح';
      const dates = d.startsAt && d.endsAt ? `من ${dayMonth(d.startsAt)} لحد ${dayMonth(d.endsAt)}` : untilText(d.endsAt);
      return {
        css: `
.t-bseason .safe { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: ${sq ? 26 : 44}px; }
.t-bseason .kick { font-family: var(--f-display); font-weight: 700; font-size: 36px; color: var(--acc); letter-spacing: .08em; }
.t-bseason .ttl { font-family: var(--f-heavy); font-weight: 400; font-size: ${sq ? 150 : 180}px; line-height: 1.05; }
.t-bseason .rule { display: flex; align-items: center; gap: 22px; color: var(--acc); }
.t-bseason .rule i.l { width: 140px; height: 3px; background: var(--foil); display: block; }
.t-bseason .rule .dm { width: 18px; height: 18px; background: var(--foil); transform: rotate(45deg); }
.t-bseason .sub { color: var(--ink); font-family: var(--f-display); font-weight: 800; font-size: ${sq ? 56 : 68}px; line-height: 1.2; }
.t-bseason .dates { display: inline-flex; align-items: center; gap: 14px; font-family: var(--f-display); font-weight: 600; font-size: 36px; background: var(--bg2); border: 2px solid var(--line); border-radius: 999px; padding: 16px 36px; }`,
        html: `<div class="cv t-bseason">
  <div class="safe">
    <div data-a="fade">${lockup(ctx, { size: 34, mark: 72 })}</div>
    ${d.kicker ? `<div class="kick" data-a="rise" style="--d:.15s">${esc(d.kicker)}</div>` : ''}
    <div class="ttl foil-text" data-fit="2" data-a="pop" style="--d:.3s">${esc(title)}</div>
    <div class="rule" data-a="wipe" style="--d:.55s"><i class="l"></i><span class="dm"></span><i class="l"></i></div>
    ${d.sub ? `<div class="sub" data-a="rise" style="--d:.7s">${rich(d.sub)}</div>` : ''}
    ${dates ? `<div class="dates" data-a="fade" style="--d:.9s">${icon('calendar')}${esc(dates)}</div>` : ''}
  </div>
</div>`,
      };
    },
  },

  {
    id: 'brand-caption', noFooter: true, type: 'brand', name: 'كلام فوق الفيديو', desc: 'طبقة شفافة فيها جملة — بتتحط فوق لقطات الفيديو الحقيقية', noDecor: true,
    defaults: { pos: 'bottom' },
    render(ctx) {
      const { data: d } = ctx;
      const at = d.pos === 'top' ? 'top: calc(var(--st) + 30px);' : d.pos === 'center' ? 'top: 50%; transform: translateY(-50%);' : 'bottom: calc(var(--sb) + 30px);';
      return {
        css: `
.t-bcap { background: transparent !important; }
.t-bcap .box { position: absolute; left: 60px; right: 60px; ${at} display: flex; flex-direction: column; align-items: center; gap: 18px; }
.t-bcap .txt { background: color-mix(in srgb, var(--bg) 86%, transparent); color: var(--ink); border-radius: 30px; padding: 22px 40px 26px; text-align: center;
  font-family: var(--f-display); font-weight: 800; font-size: 58px; line-height: 1.3; max-width: 100%; box-shadow: 0 16px 40px rgba(0,0,0,.25); }
.t-bcap .tag { position: absolute; top: calc(var(--st) - 40px); right: 50px; background: color-mix(in srgb, var(--bg) 80%, transparent); border-radius: 999px; padding: 10px 26px 10px 12px; }`,
        html: `<div class="cv t-bcap transparent">
  ${d.brandTag !== false ? `<div class="tag">${lockup(ctx, { size: 26, mark: 50, en: false })}</div>` : ''}
  ${d.text ? `<div class="box"><div class="txt" data-fit="3" data-a="rise" style="--d:.1s">${rich(d.text)}</div></div>` : ''}
</div>`,
      };
    },
  },
];
