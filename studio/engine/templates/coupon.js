// الكوبونات — 4 أشكال. الداتا بنفس حقول كوبونات المتجر:
//   code, type ('percent'|'amount'|'free_shipping'), value, maxDiscount, minSubtotal, endsAt, headline (اختياري)
import { esc, rich, lockup, mark, season, couponTexts, icon } from '../parts.js';

const how = 'اكتب الكود وإنت بتطلب';

export const coupon = [
  {
    id: 'coupon-ticket', type: 'coupon', name: 'التذكرة', desc: 'تذكرة بقطعين على الجناب وخط متقطع',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const c = couponTexts(d);
      return {
        css: `
.t-cticket .safe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${fmt === 'square' ? 30 : 46}px; }
.t-cticket .head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.t-cticket .hl { font-size: ${fmt === 'square' ? 50 : 60}px; }
.t-cticket .tk { width: ${fmt === 'square' ? 760 : 860}px; background: var(--card); color: var(--card-ink); border-radius: 40px; position: relative; overflow: visible; box-shadow: 0 30px 60px rgba(0,0,0,.25); }
.t-cticket .up { padding: ${fmt === 'square' ? 40 : 56}px 50px ${fmt === 'square' ? 34 : 46}px; text-align: center; }
.t-cticket .lbl { font-family: var(--f-display); font-weight: 600; font-size: 30px; color: var(--card-ink2); letter-spacing: .04em; }
.t-cticket .val { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 104 : 128}px; line-height: 1.25; margin: 8px 0 14px; }
.t-cticket .cond { font-family: var(--f-body); font-weight: 600; font-size: 32px; color: var(--card-ink2); }
.t-cticket .cut { position: relative; height: 0; border-top: 4px dashed color-mix(in srgb, var(--card-ink) 28%, transparent); margin: 0 44px; }
.t-cticket .cut::before, .t-cticket .cut::after { content: ''; position: absolute; top: -34px; width: 64px; height: 64px; border-radius: 50%; background: var(--bg); }
.t-cticket .cut::before { right: -78px; } .t-cticket .cut::after { left: -78px; }
.t-cticket .down { padding: ${fmt === 'square' ? 34 : 46}px 50px ${fmt === 'square' ? 40 : 54}px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.t-cticket .code { font-family: var(--f-mono); font-weight: 700; font-size: 76px; letter-spacing: .12em; direction: ltr; padding: 14px 44px; border: 4px dashed var(--acc); border-radius: 20px; color: var(--card-ink); background: color-mix(in srgb, var(--acc) 8%, transparent); }
.t-cticket .how { font-size: 30px; font-weight: 600; font-family: var(--f-display); }
.t-cticket .until { font-size: 28px; color: var(--card-ink2); }
.t-cticket .foot { display: flex; align-items: center; gap: 24px; color: var(--ink2); font-size: 28px; }`,
        html: `<div class="cv t-cticket">
  <div class="safe">
    <div class="head">
      <div data-a="fade">${lockup(ctx, { size: 36, mark: 76 })}</div>
      ${d.headline ? `<div class="hl" data-a="rise" style="--d:.15s">${rich(d.headline)}</div>` : season(ctx, 'rise', '.15s')}
    </div>
    <div class="tk" data-a="pop" style="--d:.3s">
      <div class="up"><div class="lbl">كوبون خصم</div><div class="val">${esc(c.title)}</div><div class="cond">${esc(c.cond)}${c.cap ? ` · ${esc(c.cap)}` : ''}</div></div>
      <div class="cut"></div>
      <div class="down"><div class="code" data-a="wipe" style="--d:.8s">${esc(c.code)}</div><div class="how">${how}</div>${c.until ? `<div class="until">${esc(c.until)}</div>` : ''}</div>
    </div>
    ${fmt !== 'square' ? `<div class="foot" data-a="fade" style="--d:1s"><span class="site">${esc(ctx.brand.site)}</span></div>` : ''}
  </div>
</div>`,
      };
    },
  },

  {
    id: 'coupon-giftcard', type: 'coupon', name: 'كارت الهدية', desc: 'كارت فخم زي كروت البنوك والكود مكتوب زي رقم الكارت',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const c = couponTexts(d);
      const CW = fmt === 'square' ? 820 : 900;
      return {
        css: `
.t-cgift .safe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${fmt === 'square' ? 40 : 60}px; }
.t-cgift .hl { font-size: ${fmt === 'square' ? 56 : 68}px; text-align: center; }
.t-cgift .card { width: ${CW}px; height: ${Math.round(CW / 1.586)}px; border-radius: 44px; position: relative; overflow: hidden; --r: -5deg; transform: rotate(var(--r));
  background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--acc) 30%, var(--bg2)) 0%, var(--bg2) 45%, var(--bg) 100%);
  box-shadow: 0 40px 80px rgba(0,0,0,.35), inset 0 0 0 3px color-mix(in srgb, var(--acc) 55%, transparent); color: var(--ink); padding: 50px 56px; display: flex; flex-direction: column; }
.t-cgift .card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.14) 45%, transparent 55%); }
.t-cgift .r1 { display: flex; justify-content: space-between; align-items: center; }
.t-cgift .chip { width: 110px; height: 80px; border-radius: 16px; background: var(--foil); position: relative; }
.t-cgift .chip::before { content: ''; position: absolute; inset: 18px 30px; border: 3px solid rgba(0,0,0,.25); border-radius: 8px; }
.t-cgift .kind { font-family: var(--f-display); font-weight: 600; font-size: 28px; color: var(--ink2); letter-spacing: .06em; }
.t-cgift .val { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 96 : 108}px; line-height: 1.2; margin-top: auto; }
.t-cgift .code { font-family: var(--f-mono); font-weight: 700; font-size: 60px; letter-spacing: .22em; direction: ltr; text-align: left; margin-top: 18px; }
.t-cgift .r3 { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; font-size: 26px; color: var(--ink2); font-family: var(--f-display); }
.t-cgift .info { text-align: center; display: flex; flex-direction: column; gap: 10px; }
.t-cgift .how { font-family: var(--f-display); font-weight: 700; font-size: 38px; }
.t-cgift .cond { font-size: 30px; color: var(--ink2); }`,
        html: `<div class="cv t-cgift">
  <div class="safe">
    <div class="hl" data-a="rise">${rich(d.headline || `هدية ليك من **${ctx.brand.short}**`)}</div>
    <div class="card" data-a="drop" style="--d:.25s">
      <div class="r1"><div class="chip"></div>${mark(90)}</div>
      <div class="kind" style="margin-top:22px">كارت خصم</div>
      <div class="val foil-text">${esc(c.title)}</div>
      <div class="code">${esc(c.code)}</div>
      <div class="r3"><span>${esc(c.until)}</span><span style="direction:ltr">${esc(ctx.brand.en)}</span></div>
    </div>
    <div class="info" data-a="rise" style="--d:.6s"><div class="how">${how}</div><div class="cond">${esc(c.cond)}${c.cap ? ` · ${esc(c.cap)}` : ''}</div></div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'coupon-stamp', type: 'coupon', name: 'طابع البوستة', desc: 'طابع بحواف مسننة وختم بريد — ستايل كلاسيك',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const c = couponTexts(d);
      const SW = fmt === 'square' ? 560 : 640;
      return {
        css: `
.t-cstamp .safe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${fmt === 'square' ? 30 : 50}px; }
.t-cstamp .wrap { position: relative; }
.t-cstamp .stamp { width: ${SW}px; height: ${Math.round(SW * 1.18)}px; background: var(--card); padding: 34px; --r: 3deg; transform: rotate(var(--r));
  -webkit-mask: linear-gradient(#000 0 0) center / calc(100% - 40px) calc(100% - 40px) no-repeat, radial-gradient(circle 15px, #0000 96%, #000) -20px -20px / 40px 40px round; mask: linear-gradient(#000 0 0) center / calc(100% - 40px) calc(100% - 40px) no-repeat, radial-gradient(circle 15px, #0000 96%, #000) -20px -20px / 40px 40px round;
  filter: drop-shadow(0 30px 40px rgba(0,0,0,.3)); }
.t-cstamp .in { width: 100%; height: 100%; border: 3px solid color-mix(in srgb, var(--card-ink) 20%, transparent); background: color-mix(in srgb, var(--acc) 10%, var(--card));
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--card-ink); gap: 10px; padding: 30px; }
.t-cstamp .in .mark { margin-bottom: 10px; }
.t-cstamp .lbl { font-family: var(--f-lux); font-weight: 700; font-size: 38px; color: var(--card-ink2); }
.t-cstamp .val { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 92 : 110}px; line-height: 1.25; margin-bottom: 8px; }
.t-cstamp .cond { font-size: 28px; color: var(--card-ink2); font-weight: 600; }
.t-cstamp .post { position: absolute; left: -210px; bottom: -110px; width: 330px; height: 330px; --r: -18deg; transform: rotate(var(--r)); color: var(--acc); }
.t-cstamp .post svg { width: 100%; height: 100%; }
.t-cstamp .code { font-family: var(--f-mono); font-weight: 700; font-size: 70px; letter-spacing: .14em; direction: ltr; padding: 12px 40px; border-radius: 18px; background: var(--acc); color: var(--acc-ink); }
.t-cstamp .how { font-family: var(--f-display); font-weight: 600; font-size: 32px; text-align: center; }
.t-cstamp .how small { display: block; font-size: 26px; color: var(--ink2); margin-top: 8px; font-weight: 500; }`,
        html: `<div class="cv t-cstamp">
  <div class="safe">
    <div data-a="fade">${d.headline ? `<div class="hl" style="font-size:56px;text-align:center">${rich(d.headline)}</div>` : lockup(ctx, { size: 34, mark: 70 })}</div>
    <div class="wrap">
      <div class="stamp" data-a="pop" style="--d:.2s"><div class="in">${mark(110)}<div class="lbl">كوبون ${esc(ctx.brand.short)}</div><div class="val">${esc(c.title)}</div><div class="cond">${esc(c.cond)}</div></div></div>
      <div class="post" data-a="spin" style="--d:.6s"><svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="70"/>
        <path id="pa" d="M100 22 a78 78 0 1 1 -0.1 0" stroke="none"/>
        <text font-family="Alexandria" font-weight="700" font-size="17" fill="currentColor" stroke="none" letter-spacing="2"><textPath href="#pa">${esc(ctx.brand.en)} • ${esc(ctx.brand.en)} •</textPath></text>
        <text x="100" y="96" text-anchor="middle" font-family="Alexandria" font-weight="800" font-size="30" fill="currentColor" stroke="none">كوبون</text>
        <text x="100" y="128" text-anchor="middle" font-family="Alexandria" font-weight="600" font-size="18" fill="currentColor" stroke="none">${esc(c.until.replace('صالح ', ''))}</text>
        ${[0, 1, 2, 3].map(i => `<path d="M${-60 + i * 4} ${60 + i * 26} q 25 -14 50 0 t 50 0 t 50 0" transform="translate(-10 0)"/>`).join('')}</svg></div>
    </div>
    <div class="code" data-a="wipe" style="--d:.9s">${esc(c.code)}</div>
    <div class="how" data-a="fade" style="--d:1s">${how}${c.cap ? `<small>${esc(c.cap)}</small>` : ''}</div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'coupon-code', type: 'coupon', name: 'الكود الكبير', desc: 'الكود نفسه هو البطل — بسيط وواضح',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const c = couponTexts(d);
      return {
        css: `
.t-ccode .safe { display: flex; flex-direction: column; justify-content: space-between; }
.t-ccode .head { display: flex; justify-content: space-between; align-items: center; }
.t-ccode .mid { display: flex; flex-direction: column; align-items: center; gap: ${fmt === 'square' ? 22 : 34}px; text-align: center; }
.t-ccode .k { display: inline-flex; align-items: center; gap: 14px; font-family: var(--f-display); font-weight: 700; font-size: 36px; color: var(--acc); }
.t-ccode .val { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 116 : 144}px; line-height: 1.2; }
.t-ccode .box { position: relative; width: 100%; padding: ${fmt === 'square' ? 36 : 50}px 20px; border: 5px dashed var(--acc); border-radius: 36px; background: color-mix(in srgb, var(--acc) 7%, transparent); }
.t-ccode .code { font-family: var(--f-mono); font-weight: 700; font-size: ${fmt === 'square' ? 120 : 140}px; letter-spacing: .1em; direction: ltr; line-height: 1; color: var(--ink); }
.t-ccode .scis { position: absolute; top: -34px; right: 60px; width: 64px; height: 64px; border-radius: 50%; background: var(--bg); color: var(--acc); display: grid; place-items: center; font-size: 44px; }
.t-ccode .cond { font-size: 34px; color: var(--ink2); font-weight: 600; }
.t-ccode .foot { display: flex; justify-content: space-between; align-items: center; font-family: var(--f-display); font-size: 30px; }
.t-ccode .foot .until { color: var(--acc); font-weight: 700; }`,
        html: `<div class="cv t-ccode">
  <div class="safe">
    <div class="head" data-a="fade">${lockup(ctx, { size: 32, mark: 64 })}${season(ctx)}</div>
    <div class="mid">
      <div class="k" data-a="rise" style="--d:.1s">${icon('ticket')} ${d.headline ? rich(d.headline) : 'كود خصم'}</div>
      <div class="val foil-text" data-a="pop" style="--d:.25s">${esc(c.title)}</div>
      <div class="cond" data-a="fade" style="--d:.4s">${esc(c.cond)}${c.cap ? ` · ${esc(c.cap)}` : ''}</div>
      <div class="box" data-a="rise" style="--d:.55s"><span class="scis">${icon('scissors')}</span><div class="code" data-fit="1">${esc(c.code)}</div></div>
      <div class="how hl" style="font-size:38px" data-a="fade">${how}</div>
    </div>
    <div class="foot" data-a="fade" style="--d:.8s"><span class="until">${esc(c.until)}</span><span class="site">${esc(ctx.brand.site)}</span></div>
  </div>
</div>`,
      };
    },
  },
];
