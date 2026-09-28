// صور الخصم والعروض — 6 أشكال.
// الداتا: name, image|cutout, price (بعد الخصم), oldPrice (قبل), percent (اختياري؛ بيتحسب لوحده), endsAt, headline, sub
// + للباندل: items[] أو نفس المنتج مرتين، minQty, reward ('percent'|'amount'|'gift'), value
import { esc, rich, lockup, mark, photo, price, oldPrice, season, strip, percentOf, saved, untilText, money, num, icon } from '../parts.js';
import { starPath } from '../skins.js';

const until = d => untilText(d.endsAt);

export const sale = [
  {
    id: 'sale-ribbon', noFooter: true, type: 'sale', name: 'الشريط المايل', desc: 'هالة دهبي حوالين المنتج وشريط النسبة في الركن',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const pct = percentOf(d);
      const halo = fmt === 'square' ? 470 : fmt === 'story' ? 700 : 620;
      return {
        css: `
.t-sribbon .safe { display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
.t-sribbon .top { width: 100%; display: flex; justify-content: flex-start; }
.t-sribbon .ribbon { position: absolute; z-index: 4; top: ${fmt === 'story' ? 330 : 96}px; left: -150px; width: 620px; --r: -45deg; transform: rotate(var(--r));
  background: var(--foil); color: var(--foil-ink); text-align: center; font-family: var(--f-display); font-weight: 900; font-size: 74px; padding: 10px 0 14px; line-height: 1;
  box-shadow: 0 12px 30px rgba(0,0,0,.25); }
.t-sribbon .ribbon small { display: block; font-size: 24px; font-weight: 700; letter-spacing: .1em; margin-bottom: 4px; }
.t-sribbon .halo { width: ${halo}px; height: ${halo}px; border-radius: 50%; background: var(--glow); position: relative; display: grid; place-items: center; flex: none; }
.t-sribbon .halo::before { content: ''; position: absolute; inset: -18px; border-radius: 50%; border: 2px solid var(--line); }
.t-sribbon .halo .ph { width: ${halo - 60}px; height: ${halo - 60}px; border-radius: 50%; ${d.cutout ? 'background: transparent;' : 'box-shadow: 0 0 0 10px var(--bg2);'} }
.t-sribbon .info { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.t-sribbon .hl2 { font-family: var(--f-display); font-weight: 700; font-size: 34px; color: var(--acc); }
.t-sribbon .name { font-size: ${fmt === 'square' ? 50 : 60}px; max-width: 900px; }
.t-sribbon .prices { display: flex; align-items: baseline; gap: 28px; }
.t-sribbon .until { font-size: 30px; color: var(--acc); font-weight: 600; font-family: var(--f-display); }
.t-sribbon .strip { position: absolute; z-index: 3; left: 0; right: 0; bottom: ${fmt === 'story' ? 'calc(var(--sb) - 110px)' : '0'}; background: var(--acc); color: var(--acc-ink);
  text-align: center; font-family: var(--f-display); font-weight: 600; font-size: 30px; padding: 20px 20px 22px; }`,
        html: `<div class="cv t-sribbon">
  ${pct ? `<div class="ribbon" data-a="left" style="--d:.5s"><small>خصم</small>${pct}%</div>` : ''}
  <div class="safe" style="bottom:calc(var(--sb) + ${fmt === 'story' ? 0 : 70}px)">
    <div class="top" style="justify-content:flex-start" data-a="fade">${lockup(ctx, { size: 34, mark: 70 })}</div>
    <div class="halo" data-a="pop" style="--d:.15s">${photo(d, { pad: d.cutout ? 30 : 0 })}</div>
    <div class="info">
      ${d.headline ? `<div class="hl2" data-a="rise" style="--d:.3s">${rich(d.headline)}</div>` : season(ctx, 'rise', '.3s')}
      <div class="name" data-fit="2" data-a="rise" style="--d:.4s">${esc(d.name)}</div>
      <div class="prices" data-a="pop" style="--d:.7s">${price(d.price, fmt === 'square' ? 96 : 116, 'foil-text')}${oldPrice(d.oldPrice, 46)}</div>
      ${until(d) ? `<div class="until" data-a="fade" style="--d:.9s">${esc(until(d))}</div>` : ''}
    </div>
  </div>
  <div class="strip" data-a="fade" style="--d:1s">${strip(ctx)}</div>
</div>`,
      };
    },
  },

  {
    id: 'sale-split', noFooter: true, type: 'sale', name: 'النصين', desc: 'نص صورة ونص ألوان، ودايرة النسبة على الحد بينهم',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const pct = percentOf(d);
      const row = fmt === 'square';
      return {
        css: `
.t-ssplit .ph { position: absolute; ${row ? 'top: 0; bottom: 0; right: 0; width: 52%;' : `top: 0; left: 0; right: 0; height: ${fmt === 'story' ? 52 : 55}%;`} }
.t-ssplit .panel { position: absolute; z-index: 2; ${row ? 'top: 0; bottom: 0; left: 0; width: 48%; padding: 64px 56px;' : `bottom: 0; left: 0; right: 0; height: ${fmt === 'story' ? 48 : 45}%; padding: 90px 72px ${fmt === 'story' ? 'var(--sb)' : '64px'};`}
  background: var(--bg); display: flex; flex-direction: column; justify-content: ${row ? 'center' : 'flex-start'}; gap: ${row ? 22 : 18}px; }
.t-ssplit .panel::before { content: ''; position: absolute; background: var(--foil); ${row ? 'top: 0; bottom: 0; right: 0; width: 6px;' : 'top: 0; left: 0; right: 0; height: 6px;'} }
.t-ssplit .badge { position: absolute; z-index: 4; width: 250px; height: 250px; border-radius: 50%; background: var(--foil); color: var(--foil-ink); display: grid; place-items: center; text-align: center;
  ${row ? 'top: 50%; right: 52%; margin: -125px -125px 0 0;' : `top: ${fmt === 'story' ? 52 : 55}%; left: 90px; margin-top: -125px;`} box-shadow: 0 0 0 12px var(--bg), 0 20px 40px rgba(0,0,0,.25); --r: -8deg; transform: rotate(var(--r)); }
.t-ssplit .badge b { font-family: var(--f-display); font-weight: 900; font-size: 92px; line-height: .9; display: block; }
.t-ssplit .badge span { font-family: var(--f-display); font-weight: 700; font-size: 30px; }
.t-ssplit .name { font-size: ${row ? 50 : 60}px; ${row ? '' : 'max-width: 620px;'} }
.t-ssplit .sub { font-size: 30px; }
.t-ssplit .prices { display: flex; align-items: baseline; gap: 24px; flex-wrap: wrap; }
.t-ssplit .until { display: inline-flex; align-items: center; gap: 10px; font-family: var(--f-display); font-weight: 600; font-size: 28px; color: var(--acc); }
.t-ssplit .foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.t-ssplit .site { color: var(--ink2); font-size: 26px; }`,
        html: `<div class="cv t-ssplit">
  ${photo(d, { pad: d.cutout ? 70 : 0, a: 'zoom' })}
  <div class="panel">
    ${season(ctx, 'rise', '.2s') ? `<div>${season(ctx, 'rise', '.2s')}</div>` : ''}
    ${d.headline ? `<div class="hl" style="font-size:${row ? 40 : 44}px;color:var(--acc);--d:.25s" data-a="rise">${rich(d.headline)}</div>` : ''}
    <div class="name" data-fit="2" data-a="rise" style="--d:.3s">${esc(d.name)}</div>
    ${d.sub && !row ? `<div class="sub" data-a="fade" style="--d:.4s">${esc(d.sub)}</div>` : ''}
    <div class="prices" data-a="rise" style="--d:.5s">${price(d.price, row ? 88 : 104, 'foil-text')}${oldPrice(d.oldPrice, 44)}</div>
    ${until(d) ? `<div class="until" data-a="fade" style="--d:.6s">${icon('clock')}${esc(until(d))}</div>` : ''}
    <div class="foot" data-a="fade" style="--d:.7s">${lockup(ctx, { size: 28, mark: 56, en: false })}${row ? '' : `<span class="site">${esc(ctx.brand.site)}</span>`}</div>
  </div>
  ${pct ? `<div class="badge" data-a="spin" style="--d:.45s"><div><span>خصم</span><b>${pct}%</b></div></div>` : ''}
</div>`,
      };
    },
  },

  {
    id: 'sale-burst', noFooter: true, type: 'sale', name: 'الختم', desc: 'صورة كاملة وختم نجمة كبير فيه النسبة',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const pct = percentOf(d);
      const S = 380;
      return {
        css: `
.t-sburst .ph { position: absolute; inset: 0 0 ${fmt === 'story' ? 'calc(var(--sb) + 250px)' : fmt === 'square' ? '230px' : '270px'} 0; }
.t-sburst .stamp { position: absolute; z-index: 4; top: calc(var(--st) - 10px); left: 40px; width: ${S}px; height: ${S}px; --r: -12deg; transform: rotate(var(--r)); }
.t-sburst .stamp svg { position: absolute; inset: 0; filter: drop-shadow(0 18px 30px rgba(0,0,0,.3)); }
.t-sburst .stamp .t { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: var(--acc-ink); font-family: var(--f-display); }
.t-sburst .stamp b { display: block; font-weight: 900; font-size: 112px; line-height: .9; }
.t-sburst .stamp span { font-weight: 800; font-size: 40px; }
.t-sburst .top { position: absolute; z-index: 3; top: calc(var(--st) - 24px); right: 44px; }
.t-sburst .brandpill { background: var(--bg); border-radius: 999px; padding: 12px 30px 12px 16px; }
.t-sburst .bar { position: absolute; z-index: 2; left: 0; right: 0; bottom: 0; height: ${fmt === 'story' ? 'calc(var(--sb) + 250px)' : fmt === 'square' ? '230px' : '270px'}; background: var(--bg);
  padding: ${fmt === 'story' ? '50px' : '0'} 64px ${fmt === 'story' ? 'var(--sb)' : '0'}; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.t-sburst .bar::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 7px; background: var(--foil); }
.t-sburst .name { font-size: 54px; }
.t-sburst .until { font-family: var(--f-display); font-weight: 600; font-size: 28px; color: var(--acc); margin-top: 10px; }
.t-sburst .pcol { flex: none; display: flex; flex-direction: column; align-items: center; gap: 6px; }`,
        html: `<div class="cv t-sburst">
  ${photo(d, { pad: d.cutout ? 90 : 0, a: 'zoom' })}
  <div class="top" data-a="fade"><div class="brandpill">${lockup(ctx, { size: 30, mark: 58, en: false })}</div></div>
  ${pct ? `<div class="stamp" data-a="spin" style="--d:.35s"><svg viewBox="0 0 ${S} ${S}"><defs><linearGradient id="bg-f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <path d="${starPath(S / 2, S / 2, 20, S / 2 - 4, S / 2 - 34)}" fill="var(--acc)"/><path d="${starPath(S / 2, S / 2, 20, S / 2 - 4, S / 2 - 34)}" fill="url(#bg-f)"/>
      <circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 58}" fill="none" stroke="var(--acc-ink)" stroke-opacity=".35" stroke-width="3" stroke-dasharray="2 10"/></svg>
    <div class="t"><div><span>خصم</span><b>${pct}%</b></div></div></div>` : ''}
  <div class="bar" data-a="rise" style="--d:.2s">
    <div style="flex:1;min-width:0">${d.headline ? `<div class="hl" style="font-size:34px;color:var(--acc);margin-bottom:8px">${rich(d.headline)}</div>` : ''}<div class="name" data-fit="2">${esc(d.name)}</div>${until(d) ? `<div class="until">${esc(until(d))}</div>` : ''}</div>
    <div class="pcol" data-a="pop" style="--d:.6s">${oldPrice(d.oldPrice, 38)}${price(d.price, 96, 'foil-text')}</div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'sale-type', type: 'sale', name: 'الرقم الكبير', desc: 'رقم الخصم ضخم ورا المنتج — ستايل مجلات',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const pct = percentOf(d);
      const big = fmt === 'square' ? 420 : fmt === 'story' ? 560 : 500;
      return {
        css: `
.t-stype .safe { display: flex; flex-direction: column; }
.t-stype .head { display: flex; justify-content: space-between; align-items: center; }
.t-stype .stage { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; }
.t-stype .num { position: absolute; top: ${fmt === 'story' ? 40 : 0}px; left: 0; right: 0; text-align: center; overflow: hidden; font-family: var(--f-display); font-weight: 900; font-size: ${big}px; line-height: .8;
  color: transparent; -webkit-text-stroke: 4px var(--acc); letter-spacing: -.04em; direction: ltr; white-space: nowrap; opacity: .9; }
.t-stype .num.fill { color: var(--acc); -webkit-text-stroke: 0; clip-path: inset(62% 0 0 0); opacity: .95; }
.t-stype .off { position: absolute; top: ${fmt === 'story' ? 60 : 16}px; right: 10px; font-family: var(--f-display); font-weight: 800; font-size: 44px; color: var(--ink); background: var(--bg); padding: 4px 18px; border-radius: 12px; }
.t-stype .card { position: relative; z-index: 2; width: ${fmt === 'square' ? 520 : 640}px; aspect-ratio: 1; margin-top: ${fmt === 'square' ? 150 : fmt === 'story' ? 330 : 250}px; border-radius: 40px; overflow: hidden;
  box-shadow: 0 30px 60px rgba(0,0,0,.28); ${d.cutout ? 'box-shadow: none; overflow: visible;' : ''} }
.t-stype .card .ph { width: 100%; height: 100%; ${d.cutout ? 'background: transparent;' : ''} }
.t-stype .info { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; margin-top: 34px; }
.t-stype .name { font-size: ${fmt === 'square' ? 44 : 54}px; }
.t-stype .until { font-size: 26px; color: var(--ink2); font-family: var(--f-display); margin-top: 8px; }
.t-stype .pcol { flex: none; text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }`,
        html: `<div class="cv t-stype">
  <div class="safe">
    <div class="head" data-a="fade">${lockup(ctx, { size: 30, mark: 60 })}${season(ctx)}</div>
    <div class="stage">
      ${pct ? `<div class="num" data-fit="1" data-a="wipe" style="--d:.1s">${pct}%</div><div class="num fill" data-fit="1" data-a="wipe" style="--d:.35s">${pct}%</div><div class="off" data-a="pop" style="--d:.6s">خصم</div>` : ''}
      <div class="card" data-a="rise" style="--d:.3s">${photo(d, { pad: d.cutout ? 10 : 0 })}</div>
    </div>
    <div class="info" data-a="rise" style="--d:.5s">
      <div style="flex:1;min-width:0"><div class="name" data-fit="2">${esc(d.name)}</div>${until(d) ? `<div class="until">${esc(until(d))}</div>` : ''}</div>
      <div class="pcol">${oldPrice(d.oldPrice, 36)}${price(d.price, fmt === 'square' ? 80 : 96)}</div>
    </div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'sale-receipt', type: 'sale', name: 'الفاتورة', desc: 'المنتج فوق وفاتورة صغيرة بتوضح كان كام وبقى كام ووفّرت كام',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const sv = saved(d);
      return {
        css: `
.t-srcpt .safe { display: flex; flex-direction: column; align-items: center; gap: ${fmt === 'square' ? 22 : 34}px; }
.t-srcpt .head { width: 100%; display: flex; justify-content: space-between; align-items: center; }
.t-srcpt .big { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 76 : 92}px; line-height: 1.05; text-align: center; }
.t-srcpt .ph { flex: 1; min-height: 0; width: 100%; border-radius: 36px; }
.t-srcpt .paper { width: ${fmt === 'square' ? 760 : 860}px; background: var(--card); color: var(--card-ink); border-radius: 26px 26px 0 0; padding: 30px 46px 40px; position: relative; font-family: var(--f-display);
  -webkit-mask: radial-gradient(circle 14px at 50% 100%, #0000 98%, #000) 0 0 / 40px 100% repeat-x; mask: radial-gradient(circle 14px at 50% calc(100% + 2px), #0000 98%, #000) 0 0 / 40px 100% repeat-x; }
.t-srcpt .ln { display: flex; justify-content: space-between; align-items: baseline; font-size: 32px; font-weight: 500; padding: 8px 0; color: var(--card-ink2); }
.t-srcpt .ln.minus b { color: var(--sale); }
.t-srcpt .ln b { font-weight: 700; color: var(--card-ink); }
.t-srcpt .ln .strike { text-decoration: line-through; text-decoration-color: var(--sale); text-decoration-thickness: 3px; }
.t-srcpt .dash { border-top: 3px dashed color-mix(in srgb, var(--card-ink) 25%, transparent); margin: 12px 0; }
.t-srcpt .total { display: flex; justify-content: space-between; align-items: center; font-size: 40px; font-weight: 800; }
.t-srcpt .total .price { color: var(--card-ink); }
.t-srcpt .nm { font-family: var(--f-display); font-weight: 700; font-size: 30px; color: var(--card-ink); margin-bottom: 10px; }`,
        html: `<div class="cv t-srcpt">
  <div class="safe">
    <div class="head" data-a="fade">${lockup(ctx, { size: 30, mark: 60 })}${season(ctx)}</div>
    <div class="big" data-a="rise" style="--d:.1s">${d.headline ? rich(d.headline) : sv ? `وفّر <span class="foil-text">${money(sv)} جنيه</span>` : esc(d.name)}</div>
    ${photo(d, { pad: d.cutout ? 40 : 0, a: 'zoom' })}
    <div class="paper" data-a="rise" style="--d:.35s">
      <div class="nm" data-fit="1">${esc(d.name)}</div>
      ${num(d.oldPrice) ? `<div class="ln"><span>السعر الأصلي</span><b class="strike">${money(d.oldPrice)} ج</b></div>
      <div class="ln minus"><span>خصم العرض</span><b>- ${money(sv)} ج</b></div><div class="dash"></div>` : ''}
      <div class="total"><span>تدفع</span>${price(d.price, 64)}</div>
      ${untilText(d.endsAt) ? `<div class="ln" style="justify-content:center;font-size:26px;padding-top:14px">${esc(untilText(d.endsAt))}</div>` : ''}
    </div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'sale-bundle', type: 'sale', name: 'اشتري 2', desc: 'قطعتين جنب بعض وعلامة + وعرض الكمية',
    render(ctx) {
      const { data: d, fmt } = ctx;
      const items = (d.items && d.items.length ? d.items : [d, d]).slice(0, 3);
      const n = Math.max(2, num(d.minQty) || items.length);
      const head = d.headline || (d.reward === 'gift' ? `اشتري ${n} وخد **هدية**` : d.reward === 'percent' ? `اشتري ${n} وخد **خصم ${num(d.value)}%**`
        : num(d.value) ? `اشتري ${n} و**وفّر ${money(d.value)} ج**` : `اشتري ${n} **ووفّر**`);
      const W = fmt === 'square' ? 400 : 440;
      return {
        css: `
.t-sbundle .safe { display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
.t-sbundle .head { width: 100%; display: flex; justify-content: space-between; align-items: center; }
.t-sbundle .big { font-family: var(--f-display); font-weight: 900; font-size: ${fmt === 'square' ? 78 : 96}px; line-height: 1.1; text-align: center; }
.t-sbundle .row { display: flex; align-items: center; justify-content: center; gap: 0; position: relative; }
.t-sbundle .it { width: ${W}px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.t-sbundle .it .ph { width: ${W}px; height: ${W}px; border-radius: 34px; box-shadow: 0 0 0 3px var(--line); }
.t-sbundle .it .nm { font-family: var(--f-display); font-weight: 700; font-size: 30px; text-align: center; max-width: ${W}px; color: var(--ink2); }
.t-sbundle .plus { width: 120px; height: 120px; margin: 0 -30px; margin-bottom: 60px; z-index: 2; border-radius: 50%; background: var(--foil); color: var(--foil-ink); display: grid; place-items: center; font-size: 70px; box-shadow: 0 0 0 12px var(--bg); flex: none; }
.t-sbundle .foot { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.t-sbundle .note { font-family: var(--f-display); font-weight: 600; font-size: 30px; color: var(--acc); }`,
        html: `<div class="cv t-sbundle">
  <div class="safe">
    <div class="head" data-a="fade">${lockup(ctx, { size: 30, mark: 60 })}${season(ctx)}</div>
    <div class="big" data-a="rise" style="--d:.1s">${rich(head)}</div>
    <div class="row">
      ${items.slice(0, 2).map((it, i) => `${i ? `<div class="plus" data-a="pop" style="--d:.55s">${icon('plus')}</div>` : ''}<div class="it" data-a="${i ? 'left' : 'right'}" style="--d:${.25 + i * .15}s">${photo(it, { pad: it.cutout ? 30 : 0 })}${items[0].id !== items[1]?.id ? `<div class="nm" data-fit="2">${esc(it.name)}</div>` : ''}</div>`).join('')}
    </div>
    <div class="foot" data-a="rise" style="--d:.7s">
      ${items[0].id === items[1]?.id ? `<div class="name" style="font-size:48px;text-align:center" data-fit="2">${esc(d.name)}</div>` : ''}
      ${d.sub ? `<div class="sub" style="font-size:30px">${esc(d.sub)}</div>` : ''}
      ${untilText(d.endsAt) ? `<div class="note">${esc(untilText(d.endsAt))}</div>` : ''}
    </div>
  </div>
</div>`,
      };
    },
  },
];
