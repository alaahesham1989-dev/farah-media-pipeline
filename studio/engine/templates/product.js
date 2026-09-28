// صورة المنتج باسمه — 5 أشكال. الداتا: name, sub, price, oldPrice, image | cutout, showName, showPrice
import { esc, lockup, mark, photo, price, oldPrice, season, icon } from '../parts.js';

const show = (d, k, def = true) => (d[k] === undefined ? def : !!d[k]);

export const product = [
  {
    id: 'product-bar', noFooter: true, type: 'product', name: 'الشريط', desc: 'الصورة فوق وشريط تحت فيه الاسم والسعر',
    render(ctx) {
      const { data: d, fmt, brand } = ctx;
      const hasBar = show(d, 'showName') || show(d, 'showPrice');
      return {
        css: `
.t-pbar { --bar: ${!hasBar ? '0px' : fmt === 'story' ? 'calc(var(--sb) + 360px)' : fmt === 'square' ? '240px' : '280px'}; }
.t-pbar .ph { position: absolute; inset: 0 0 var(--bar) 0; }
.t-pbar .top { position: absolute; z-index: 3; top: calc(var(--st) - 24px); right: 44px; left: 44px; display: flex; justify-content: space-between; align-items: center; }
.t-pbar .brandpill { background: var(--bg); border-radius: 999px; padding: 12px 30px 12px 16px; }
.t-pbar .bar { position: absolute; z-index: 2; left: 0; right: 0; bottom: 0; height: var(--bar); background: var(--bg);
  display: flex; flex-direction: column; justify-content: ${fmt === 'story' ? 'flex-start' : 'center'}; padding: ${fmt === 'story' ? '56px' : '0'} 64px ${fmt === 'story' ? 'var(--sb)' : '0'}; gap: 34px; }
.t-pbar .bar::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 7px; background: var(--foil); }
.t-pbar .row { display: flex; align-items: center; justify-content: space-between; gap: 40px; }
.t-pbar .txt { flex: 1; min-width: 0; }
.t-pbar .name { font-size: 62px; color: var(--ink); }
.t-pbar .sub { font-size: 32px; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t-pbar .pbox { flex: none; background: var(--acc); color: var(--acc-ink); border-radius: 30px; padding: 20px 36px 22px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.t-pbar .pbox .old { --old: currentColor; opacity: .7; }
.t-pbar .cta { display: flex; align-items: center; justify-content: space-between; border-top: 2px solid var(--line); padding-top: 30px; }
.t-pbar .cta .pill { background: var(--acc); color: var(--acc-ink); font-family: var(--f-display); font-size: 36px; padding: 18px 40px; }
.t-pbar .cta .site { color: var(--ink2); font-size: 30px; }`,
        html: `<div class="cv t-pbar">
  ${photo(d, { pad: d.cutout ? 90 : 0, a: 'zoom' })}
  <div class="top"><div class="brandpill" data-a="left" style="--d:.1s">${lockup(ctx, { size: 30, mark: 58, en: false })}</div>${season(ctx, 'right', '.2s')}</div>
  ${hasBar ? `<div class="bar" data-a="rise" style="--d:.25s">
    <div class="row">
      <div class="txt">${show(d, 'showName') ? `<div class="name" data-fit="2">${esc(d.name)}</div>${d.sub ? `<div class="sub">${esc(d.sub)}</div>` : ''}` : ''}</div>
      ${show(d, 'showPrice') && d.price ? `<div class="pbox" data-a="pop" style="--d:.55s">${oldPrice(d.oldPrice, 30)}${price(d.price, 72)}</div>` : ''}
    </div>
    ${fmt === 'story' ? `<div class="cta"><span class="pill">${icon('shopping-cart')} ${esc(d.cta || 'اطلب دلوقتي')}</span><span class="site">${esc(brand.site)}</span></div>` : ''}
  </div>` : ''}
</div>`,
      };
    },
  },

  {
    id: 'product-frame', type: 'product', name: 'الإطار الفاخر', desc: 'الصورة جوه إطار دهبي والاسم بخط فخم',
    render(ctx) {
      const { data: d, fmt, brand } = ctx;
      return {
        css: `
.t-pframe .safe { display: flex; flex-direction: column; align-items: center; gap: ${fmt === 'square' ? 26 : 38}px; }
.t-pframe .head { display: flex; align-items: center; gap: 16px; }
.t-pframe .head .ar { font-family: var(--f-lux); font-weight: 700; font-size: 38px; color: var(--acc); }
.t-pframe .frame { flex: 1; min-height: 0; width: ${fmt === 'square' ? 640 : 860}px; background: var(--foil); padding: 3px; border-radius: 44px; position: relative; }
.t-pframe .inner { width: 100%; height: 100%; background: var(--bg2); border-radius: 41px; padding: 18px; }
.t-pframe .inner .ph { width: 100%; height: 100%; border-radius: 28px; }
.t-pframe .dia { position: absolute; width: 22px; height: 22px; background: var(--foil); transform: rotate(45deg); }
.t-pframe .info { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; }
.t-pframe .name { font-family: var(--f-lux); font-weight: 700; font-size: ${fmt === 'square' ? 56 : 66}px; line-height: 1.25; max-width: 900px; }
.t-pframe .sub { font-size: 30px; }
.t-pframe .prices { display: flex; align-items: baseline; gap: 26px; margin-top: 6px; }
.t-pframe .rule { width: 180px; height: 2px; background: var(--foil); margin: 4px 0; }`,
        html: `<div class="cv t-pframe">
  <div class="safe">
    <div class="head" data-a="fade">${mark(fmt === 'square' ? 70 : 84)}<span class="ar">${esc(brand.short)}</span></div>
    <div class="frame" data-a="rise" style="--d:.15s">
      <div class="inner">${photo(d, { pad: d.cutout ? 50 : 0 })}</div>
      <span class="dia" style="top:-11px;right:-11px"></span><span class="dia" style="top:-11px;left:-11px"></span>
      <span class="dia" style="bottom:-11px;right:-11px"></span><span class="dia" style="bottom:-11px;left:-11px"></span>
    </div>
    <div class="info">
      ${show(d, 'showName') ? `<div class="name" data-fit="2" data-a="rise" style="--d:.35s">${esc(d.name)}</div>` : ''}
      ${d.sub && fmt !== 'square' ? `<div class="sub" data-a="fade" style="--d:.5s">${esc(d.sub)}</div>` : ''}
      ${show(d, 'showPrice') && d.price ? `<div class="rule"></div><div class="prices" data-a="pop" style="--d:.6s">${price(d.price, fmt === 'square' ? 80 : 96, 'foil-text')}${oldPrice(d.oldPrice, 40)}</div>` : ''}
    </div>
  </div>
</div>`,
      };
    },
  },

  {
    id: 'product-tag', noFooter: true, type: 'product', name: 'التيكت المعلق', desc: 'صورة كاملة وتيكت سعر متعلق في الركن',
    render(ctx) {
      const { data: d, fmt, brand } = ctx;
      return {
        css: `
.t-ptag .ph { position: absolute; inset: 0; }
.t-ptag .string { position: absolute; z-index: 2; left: 250px; top: 0; width: 3px; height: calc(var(--st) + 30px); background: var(--acc); opacity: .9; }
.t-ptag .tag { position: absolute; z-index: 3; left: 90px; top: calc(var(--st) + 24px); width: 330px; --r: -7deg; transform: rotate(var(--r)); transform-origin: 160px 0;
  background: var(--acc); color: var(--acc-ink); padding: 74px 34px 38px; text-align: center;
  clip-path: polygon(22% 0, 78% 0, 100% 14%, 100% 100%, 0 100%, 0 14%); border-radius: 0 0 26px 26px; }
.t-ptag .hole { position: absolute; top: 24px; left: 50%; width: 30px; height: 30px; margin-left: -15px; border-radius: 50%; background: var(--bg); box-shadow: inset 0 0 0 5px color-mix(in srgb, var(--acc-ink) 25%, transparent); }
.t-ptag .tname { font-family: var(--f-display); font-weight: 700; font-size: 36px; line-height: 1.3; }
.t-ptag .hr { height: 2px; background: currentColor; opacity: .25; margin: 22px 10px; }
.t-ptag .old { --old: currentColor; opacity: .65; display: block; margin-bottom: 10px; }
.t-ptag .bottom { position: absolute; z-index: 3; left: 48px; right: 48px; bottom: calc(var(--sb) - 20px); display: flex; justify-content: space-between; align-items: center; }
.t-ptag .glass { background: color-mix(in srgb, var(--bg) 72%, transparent); backdrop-filter: blur(16px); border-radius: 999px; padding: 12px 30px 12px 16px; color: var(--ink); }
.t-ptag .glass.site { padding: 18px 30px; font-size: 28px; }`,
        html: `<div class="cv t-ptag">
  ${photo(d, { pad: d.cutout ? 110 : 0, a: 'zoom' })}
  <div class="string"></div>
  ${show(d, 'showName') || show(d, 'showPrice') ? `<div class="tag" data-a="drop" style="--d:.2s"><span class="hole"></span>
    ${show(d, 'showName') ? `<div class="tname" data-fit="3">${esc(d.name)}</div>` : ''}
    ${show(d, 'showPrice') && d.price ? `<div class="hr"></div>${oldPrice(d.oldPrice, 30)}${price(d.price, 80)}` : ''}
  </div>` : ''}
  <div class="bottom" data-a="rise" style="--d:.5s"><div class="glass">${lockup(ctx, { size: 30, mark: 58, en: false })}</div><span class="glass site">${esc(brand.site)}</span></div>
</div>`,
      };
    },
  },

  {
    id: 'product-glass', noFooter: true, type: 'product', name: 'الكارت الزجاجي', desc: 'صورة كاملة وكارت شفاف عايم تحت',
    render(ctx) {
      const { data: d, fmt, brand } = ctx;
      return {
        css: `
.t-pglass .ph { position: absolute; inset: 0; }
.t-pglass .shade { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to top, color-mix(in srgb, var(--bg) 88%, transparent) 0%, color-mix(in srgb, var(--bg) 40%, transparent) 30%, transparent 55%); }
.t-pglass .top { position: absolute; z-index: 3; top: calc(var(--st) - 24px); right: 44px; left: 44px; display: flex; justify-content: space-between; align-items: center; }
.t-pglass .gl { background: color-mix(in srgb, var(--bg) 58%, transparent); backdrop-filter: blur(22px) saturate(1.3); border: 1.5px solid color-mix(in srgb, var(--ink) 16%, transparent); }
.t-pglass .brandpill { border-radius: 999px; padding: 12px 30px 12px 16px; }
.t-pglass .card { position: absolute; z-index: 3; left: 52px; right: 52px; bottom: calc(var(--sb) - 16px); border-radius: 46px; padding: 40px 44px; display: flex; flex-direction: column; gap: 28px; }
.t-pglass .row { display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.t-pglass .name { font-size: 54px; }
.t-pglass .sub { font-size: 29px; margin-top: 6px; }
.t-pglass .pcol { flex: none; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.t-pglass .foot { display: flex; align-items: center; justify-content: space-between; }
.t-pglass .pill { background: var(--acc); color: var(--acc-ink); font-family: var(--f-display); font-size: 32px; padding: 16px 34px; }
.t-pglass .site { color: var(--ink2); font-size: 28px; }`,
        html: `<div class="cv t-pglass">
  ${photo(d, { pad: d.cutout ? 100 : 0, a: 'zoom' })}<div class="shade"></div>
  <div class="top"><div class="gl brandpill" data-a="left" style="--d:.1s">${lockup(ctx, { size: 30, mark: 58, en: false })}</div>${season(ctx, 'right', '.2s')}</div>
  <div class="gl card" data-a="rise" style="--d:.3s">
    <div class="row">
      <div style="flex:1;min-width:0">${show(d, 'showName') ? `<div class="name" data-fit="2">${esc(d.name)}</div>` : ''}${d.sub ? `<div class="sub">${esc(d.sub)}</div>` : ''}</div>
      ${show(d, 'showPrice') && d.price ? `<div class="pcol" data-a="pop" style="--d:.6s">${oldPrice(d.oldPrice, 32)}${price(d.price, 84, 'foil-text')}</div>` : ''}
    </div>
    ${fmt !== 'square' ? `<div class="foot"><span class="pill">${icon('shopping-cart')} ${esc(d.cta || 'اطلب دلوقتي')}</span><span class="site">${esc(brand.site)}</span></div>` : ''}
  </div>
</div>`,
      };
    },
  },

  {
    id: 'product-minimal', noFooter: true, type: 'product', name: 'اللوجو بس', desc: 'الصورة زي ما هي ولوجو صغير في الركن (المستوى الأول)',
    defaults: { showName: false, showPrice: false },
    render(ctx) {
      const { data: d, brand } = ctx;
      return {
        css: `
.t-pmin .ph { position: absolute; inset: 0; }
.t-pmin .bottom { position: absolute; z-index: 3; left: 40px; right: 40px; bottom: calc(var(--sb) - 30px); display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.t-pmin .gl { background: color-mix(in srgb, var(--bg) 70%, transparent); backdrop-filter: blur(14px); border-radius: 999px; color: var(--ink); }
.t-pmin .brandpill { padding: 10px 26px 10px 12px; }
.t-pmin .site { padding: 14px 26px; font-size: 24px; }
.t-pmin .cap { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); bottom: calc(var(--sb) + 80px); max-width: 860px; text-align: center; padding: 18px 40px; font-family: var(--f-display); font-weight: 700; font-size: 40px; border-radius: 28px; }`,
        html: `<div class="cv t-pmin">
  ${photo(d, { pad: d.cutout ? 100 : 0, a: 'zoom' })}
  ${show(d, 'showName', false) ? `<div class="gl cap" data-a="rise">${esc(d.name)}${show(d, 'showPrice', false) && d.price ? ` · ${esc(Math.round(d.price))} ج` : ''}</div>` : ''}
  <div class="bottom" data-a="fade" style="--d:.2s"><div class="gl brandpill">${lockup(ctx, { size: 26, mark: 50, en: false })}</div><span class="gl site">${esc(brand.site)}</span></div>
</div>`,
      };
    },
  },
];
