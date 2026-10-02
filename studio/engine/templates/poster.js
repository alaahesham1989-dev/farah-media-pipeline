// بوسترات الإعلان (2/10 — طلب المالك: جودة أعلى وأشكال كتير، العميل مايشوفش نفس الشكل كل بوست).
// 5 أشكال مختلفة، والمكنة بتوزعها على المنتجات (lib/promo.mjs). كلها على متغيرات السكين، فبتشتغل كحلي أو كريمي.
// الداتا: name, hook, feats[] (2-4 سطور قصيرة), images[] (صور المنتج الحقيقية، الأولى = المنتج نفسه),
//        price, oldPrice, badge («عرض الافتتاح»/«خصم»…), endsAt, cta
import { esc, money, num, mark, rich, dayMonth } from '../parts.js';

const imgs = d => (Array.isArray(d.images) ? d.images : [d.image]).filter(Boolean);
const feats = (d, n = 4) => (Array.isArray(d.feats) ? d.feats : []).filter(Boolean).slice(0, n);
const off = d => (num(d.oldPrice) > num(d.price) && num(d.price) > 0 ? Math.round(num(d.oldPrice) - num(d.price)) : 0);
const pct = d => (off(d) ? Math.round((off(d) / num(d.oldPrice)) * 100) : 0);
const img = (src, pos = 'center', fit = 'cover') => (src ? `<img src="${esc(src)}" alt="" style="object-fit:${fit};object-position:${pos}">` : '');
const site = ctx => esc(ctx.brand.site || 'farahegypt.com');
const until = d => (d.endsAt ? `لحد ${dayMonth(d.endsAt)}` : '');
const ICONS = ['sparkles', 'bolt', 'shield-check', 'heart', 'star', 'check'];
const ic = (name, size = 26) => `<i class="ic" style="--ic:url('/assets/icons/${name}.svg');width:${size}px;height:${size}px"></i>`;
// اسم طويل → حجم أصغر عشان مايتكسرش على 3 سطور
const nameSize = (name, big, small) => (String(name || '').length > 26 ? small : big);

const COMMON = `
.pz .ic { background: currentColor; -webkit-mask: var(--ic) center / contain no-repeat; mask: var(--ic) center / contain no-repeat; display: inline-block; flex: none; }
.pz .num { font-family: var(--f-display); font-weight: 800; line-height: 1; direction: ltr; unicode-bidi: isolate; }
.pz .cur { font-family: var(--f-display); font-weight: 700; }
.pz .strike { position: relative; display: inline-block; }
.pz .strike::after { content: ''; position: absolute; left: -6%; right: -6%; top: 52%; height: 4px; background: var(--sale); transform: rotate(-8deg); border-radius: 2px; }
.pz .brandrow { display: flex; align-items: center; gap: 14px; }
.pz .brandrow b { font-family: var(--f-lux); font-weight: 700; font-size: 34px; line-height: 1; color: var(--acc); }
.pz .brandrow small { display: block; font-family: var(--f-display); font-size: 15px; letter-spacing: .3em; color: var(--ink2); margin-top: 6px; direction: ltr; text-align: right; }`;

const brandRow = (size = 70) => `<div class="brandrow">${mark(size)}<div><b>فرح مصر</b><small>FARAH EGYPT</small></div></div>`;

export const poster = [
  // ─── 1) الكتالوج: صورة كبيرة + 3 كروت جانبية + بلوك سعر + مميزات ───────────────
  {
    id: 'poster-catalog', type: 'poster', name: 'كتالوج', desc: 'صورة كبيرة وجنبها 3 كروت، وبلوك سعر ومميزات', noFooter: true,
    render(ctx) {
      const { data: d } = ctx;
      const im = imgs(d);
      const side = im.slice(1, 4);
      const f = feats(d, 4);
      return {
        css: COMMON + `
.t-pcat { padding: 52px 48px 0; }
.t-pcat .top { display: flex; justify-content: space-between; align-items: center; }
.t-pcat .badge { background: var(--acc); color: var(--acc-ink); font-family: var(--f-display); font-weight: 800; font-size: 27px; padding: 13px 28px; border-radius: 999px; }
.t-pcat h1 { margin-top: 30px; font-family: var(--f-display); font-weight: 800; line-height: 1.15; color: var(--ink); }
.t-pcat .hook { margin-top: 10px; font-family: var(--f-display); font-weight: 600; font-size: 32px; color: var(--ink2); }
.t-pcat .gal { position: absolute; top: var(--gt); right: 48px; left: 48px; height: var(--gh); display: grid; grid-template-columns: ${side.length ? 'minmax(0,1fr) 290px' : '1fr'}; grid-template-rows: minmax(0,1fr); gap: 18px; }
.t-pcat .card { position: relative; min-height: 0; border-radius: 30px; overflow: hidden; background: var(--photo); border: 5px solid var(--card); box-shadow: 0 18px 40px rgba(0,0,0,.22); }
.t-pcat .card img { width: 100%; height: 100%; display: block; }
.t-pcat .side { display: grid; grid-template-rows: repeat(${Math.max(1, side.length)}, minmax(0,1fr)); gap: 18px; min-height: 0; }
.t-pcat .price { position: absolute; top: 950px; right: 48px; left: 48px; height: 140px; border-radius: 28px; background: var(--card); color: var(--card-ink);
  display: flex; align-items: center; justify-content: space-between; padding: 0 36px; box-shadow: 0 14px 30px rgba(0,0,0,.2); }
.t-pcat .now .num { font-size: 96px; }
.t-pcat .now .cur { font-size: 38px; color: var(--sale); margin-right: 6px; }
.t-pcat .was { font-size: 30px; font-weight: 700; color: var(--card-ink2); text-align: center; line-height: 1.3; }
.t-pcat .save { background: var(--sale); color: #fff; font-family: var(--f-display); font-weight: 800; font-size: 28px; padding: 12px 22px; border-radius: 18px; transform: rotate(-4deg); }
.t-pcat .feats { position: absolute; top: 1112px; right: 48px; left: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
.t-pcat .f { display: flex; align-items: center; gap: 12px; font-size: 27px; font-weight: 700; color: var(--ink); }
.t-pcat .f .dot { width: 46px; height: 46px; border-radius: 50%; background: var(--acc); color: var(--acc-ink); display: grid; place-items: center; flex: none; }
.t-pcat .foot { position: absolute; bottom: 0; right: 0; left: 0; height: 76px; background: var(--acc); color: var(--acc-ink); display: flex; align-items: center; justify-content: center; gap: 22px; font-family: var(--f-display); font-weight: 700; font-size: 24px; }`,
        html: `<div class="cv pz t-pcat" style="--gt:${f.length ? 340 : 330}px;--gh:${f.length ? 586 : 600}px">
  <div class="top">${brandRow(70)}${d.badge ? `<div class="badge">${esc(d.badge)}</div>` : ''}</div>
  <h1 style="font-size:${nameSize(d.name, 60, 50)}px">${esc(d.name)}</h1>
  ${d.hook ? `<div class="hook">${esc(d.hook)}</div>` : ''}
  <div class="gal">
    <div class="card">${img(im[0])}</div>
    ${side.length ? `<div class="side">${side.map(s => `<div class="card">${img(s)}</div>`).join('')}</div>` : ''}
  </div>
  <div class="price">
    <div class="now"><span class="num">${money(d.price)}</span><span class="cur">ج.م</span></div>
    ${off(d) ? `<div class="was">بدلاً من<br><span class="strike num" style="font-size:36px">${money(d.oldPrice)}</span></div><div class="save">وفّر ${money(off(d))} ج</div>` : `<div class="was">${esc(until(d) || 'شحن لكل المحافظات')}</div>`}
  </div>
  <div class="feats">${f.map((t, i) => `<div class="f"><span class="dot">${ic(ICONS[i % ICONS.length], 24)}</span>${esc(t)}</div>`).join('')}</div>
  <div class="foot"><span>${site(ctx)}</span><span>•</span><span>الدفع عند الاستلام</span><span>•</span><span>استبدال 14 يوم</span></div>
</div>`,
      };
    },
  },

  // ─── 2) مجلة: الصورة مالية البوست + جملة الهوك كبيرة + تاج سعر متعلق ─────────────
  {
    id: 'poster-editorial', type: 'poster', name: 'مجلة', desc: 'صورة مالية البوست وجملة كبيرة وتاج سعر', noFooter: true, noDecor: true,
    render(ctx) {
      const { data: d } = ctx;
      const im = imgs(d);
      const hook = d.hook || d.name;
      return {
        css: COMMON + `
.t-ped .full { position: absolute; inset: 0; }
.t-ped .full img { width: 100%; height: 100%; display: block; }
.t-ped .shade { position: absolute; inset: 0; background: linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 30%, color-mix(in srgb, var(--bg) 0%, transparent) 62%),
  linear-gradient(to bottom, color-mix(in srgb, var(--bg) 70%, transparent) 0%, transparent 18%); }
.t-ped .top { position: absolute; top: 46px; right: 48px; left: 48px; display: flex; justify-content: space-between; align-items: center; }
.t-ped .chip { background: color-mix(in srgb, var(--bg) 70%, transparent); backdrop-filter: blur(10px); color: var(--ink); border: 1.5px solid var(--line); font-family: var(--f-display); font-weight: 700; font-size: 24px; padding: 10px 22px; border-radius: 999px; }
.t-ped .tag { position: absolute; top: 160px; left: 70px; transform: rotate(-7deg); transform-origin: top center; }
.t-ped .tag::before { content: ''; position: absolute; top: -60px; left: 50%; width: 3px; height: 64px; background: var(--acc); }
.t-ped .tag .box { background: var(--card); color: var(--card-ink); border-radius: 26px; padding: 22px 30px 18px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,.35); position: relative; }
.t-ped .tag .box::before { content: ''; position: absolute; top: 12px; left: 50%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: var(--bg); }
.t-ped .tag .num { font-size: 84px; display: block; margin-top: 16px; }
.t-ped .tag .cur { font-size: 30px; color: var(--sale); }
.t-ped .tag .was { font-size: 26px; color: var(--card-ink2); font-weight: 700; margin-top: 8px; }
.t-ped .body { position: absolute; right: 56px; left: 56px; bottom: 150px; }
.t-ped .hook { font-family: var(--f-display); font-weight: 800; font-size: 76px; line-height: 1.12; color: var(--ink); }
.t-ped .name { margin-top: 18px; font-family: var(--f-display); font-weight: 600; font-size: 34px; color: var(--ink2); }
.t-ped .bar { position: absolute; right: 56px; left: 56px; bottom: 56px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid var(--line); padding-top: 22px; font-family: var(--f-display); font-size: 26px; color: var(--ink2); }
.t-ped .bar b { color: var(--acc); font-weight: 800; }`,
        html: `<div class="cv pz t-ped">
  <div class="full">${img(im[0], d.pos || '50% 35%')}</div>
  <div class="shade"></div>
  <div class="top">${brandRow(64)}${d.badge ? `<div class="chip">${esc(d.badge)}</div>` : ''}</div>
  <div class="tag"><div class="box"><span class="num">${money(d.price)}<span class="cur"> ج.م</span></span>${off(d) ? `<div class="was">بدل <span class="strike">${money(d.oldPrice)}</span></div>` : ''}</div></div>
  <div class="body"><div class="hook">${rich(hook)}</div>${d.hook ? `<div class="name">${esc(d.name)}</div>` : ''}</div>
  <div class="bar"><b>${site(ctx)}</b><span>الدفع عند الاستلام • شحن لكل المحافظات</span></div>
</div>`,
      };
    },
  },

  // ─── 3) ليه تشتريه: صورة فوق بزاوية مقصوصة + علامات ✔ كبيرة + ختم السعر ─────────
  {
    id: 'poster-check', type: 'poster', name: 'ليه تشتريه', desc: 'صورة فوق وتحتها 3 أسباب بعلامة صح وختم سعر', noFooter: true,
    render(ctx) {
      const { data: d } = ctx;
      const im = imgs(d);
      const f = feats(d, 3);
      return {
        css: COMMON + `
.t-pchk .ph2 { position: absolute; top: 0; right: 0; left: 0; height: 690px; clip-path: polygon(0 0, 100% 0, 100% 86%, 0 100%); }
.t-pchk .ph2 img { width: 100%; height: 100%; display: block; }
.t-pchk .top { position: absolute; top: 40px; right: 44px; left: 44px; display: flex; justify-content: space-between; align-items: center; }
.t-pchk .pill { background: var(--bg); border-radius: 999px; padding: 10px 24px 10px 12px; box-shadow: 0 10px 24px rgba(0,0,0,.2); }
.t-pchk .badge { background: var(--sale); color: #fff; font-family: var(--f-display); font-weight: 800; font-size: 26px; padding: 12px 24px; border-radius: 999px; }
.t-pchk .stamp { position: absolute; top: 560px; left: 64px; width: 250px; height: 250px; border-radius: 50%; background: var(--acc); color: var(--acc-ink);
  display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-10deg); box-shadow: 0 18px 40px rgba(0,0,0,.3); outline: 4px dashed color-mix(in srgb, var(--acc-ink) 45%, transparent); outline-offset: -18px; }
.t-pchk .stamp .num { font-size: 78px; }
.t-pchk .stamp .cur { font-size: 28px; }
.t-pchk .stamp .was { font-size: 24px; font-weight: 700; margin-top: 6px; opacity: .85; }
.t-pchk .txt { position: absolute; top: 760px; right: 56px; left: 340px; }
.t-pchk h1 { font-family: var(--f-display); font-weight: 800; line-height: 1.15; color: var(--ink); }
.t-pchk .why { position: absolute; top: 905px; right: 56px; left: 56px; display: grid; gap: 22px; }
.t-pchk .w { display: flex; align-items: center; gap: 18px; font-family: var(--f-display); font-weight: 700; font-size: 36px; color: var(--ink); }
.t-pchk .w .ok { width: 58px; height: 58px; border-radius: 16px; background: color-mix(in srgb, var(--acc) 22%, transparent); color: var(--acc); display: grid; place-items: center; flex: none; }
.t-pchk .foot { position: absolute; bottom: 52px; right: 56px; left: 56px; display: flex; justify-content: space-between; font-family: var(--f-display); font-size: 25px; color: var(--ink2); border-top: 2px solid var(--line); padding-top: 20px; }
.t-pchk .foot b { color: var(--acc); }`,
        html: `<div class="cv pz t-pchk">
  <div class="ph2">${img(im[0], d.pos || '50% 45%')}</div>
  <div class="top"><div class="pill">${brandRow(56)}</div>${d.badge ? `<div class="badge">${esc(d.badge)}</div>` : ''}</div>
  <div class="stamp"><span class="num">${money(d.price)}</span><span class="cur">ج.م</span>${off(d) ? `<span class="was">بدل <span class="strike">${money(d.oldPrice)}</span></span>` : ''}</div>
  <div class="txt"><h1 style="font-size:${nameSize(d.name, 54, 44)}px">${esc(d.name)}</h1></div>
  <div class="why">${f.map(t => `<div class="w"><span class="ok">${ic('check', 34)}</span>${esc(t)}</div>`).join('')}</div>
  <div class="foot"><b>${site(ctx)}</b><span>الدفع عند الاستلام • استبدال 14 يوم</span></div>
</div>`,
      };
    },
  },

  // ─── 4) اللي هيوصلك: شبكة 4 صور حقيقية + شريط سعر ─────────────────────────────
  {
    id: 'poster-grid', type: 'poster', name: 'اللي هيوصلك', desc: 'شبكة صور حقيقية للمنتج وشريط سعر', noFooter: true,
    render(ctx) {
      const { data: d } = ctx;
      const im = imgs(d).slice(0, 4);
      const n = im.length >= 4 ? 4 : im.length >= 2 ? 2 : 1;
      return {
        css: COMMON + `
.t-pgrid { padding: 48px; }
.t-pgrid .top { display: flex; justify-content: space-between; align-items: center; }
.t-pgrid .kicker { font-family: var(--f-display); font-weight: 700; font-size: 26px; color: var(--acc); letter-spacing: .02em; }
.t-pgrid h1 { margin-top: 22px; font-family: var(--f-display); font-weight: 800; line-height: 1.15; color: var(--ink); }
.t-pgrid .grid { position: absolute; top: 300px; right: 48px; left: 48px; height: 760px; display: grid; gap: 14px;
  grid-template-columns: ${n === 1 ? '1fr' : '1fr 1fr'}; grid-template-rows: ${n === 4 ? '1fr 1fr' : '1fr'}; }
.t-pgrid .grid div { position: relative; min-height: 0; border-radius: 26px; overflow: hidden; background: var(--photo); }
.t-pgrid .grid img { width: 100%; height: 100%; display: block; }
.t-pgrid .grid .n { position: absolute; top: 14px; right: 14px; width: 46px; height: 46px; border-radius: 50%; background: var(--bg); color: var(--acc); font-family: var(--f-display); font-weight: 800; font-size: 24px; display: grid; place-items: center; }
.t-pgrid .bar { position: absolute; right: 48px; left: 48px; bottom: 48px; height: 196px; border-radius: 32px; background: var(--card); color: var(--card-ink); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
.t-pgrid .bar .num { font-size: 100px; }
.t-pgrid .bar .cur { font-size: 38px; color: var(--sale); }
.t-pgrid .bar .r { text-align: left; font-family: var(--f-display); }
.t-pgrid .bar .r .was { font-size: 32px; font-weight: 700; color: var(--card-ink2); }
.t-pgrid .bar .r .pct { display: inline-block; margin-top: 10px; background: var(--sale); color: #fff; font-weight: 800; font-size: 28px; padding: 8px 20px; border-radius: 14px; }
.t-pgrid .bar .r .site { display: block; margin-top: 10px; font-size: 24px; color: var(--card-ink2); direction: ltr; }`,
        html: `<div class="cv pz t-pgrid">
  <div class="top">${brandRow(64)}<div class="kicker">${esc(d.badge || 'صور حقيقية للمنتج')}</div></div>
  <h1 style="font-size:${nameSize(d.name, 56, 46)}px">${esc(d.name)}</h1>
  <div class="grid">${im.slice(0, n).map((s, i) => `<div>${img(s)}<span class="n">${i + 1}</span></div>`).join('')}</div>
  <div class="bar">
    <div><span class="num">${money(d.price)}</span><span class="cur"> ج.م</span></div>
    <div class="r">${off(d) ? `<div class="was">بدل <span class="strike">${money(d.oldPrice)}</span></div>${pct(d) >= 5 ? `<span class="pct">خصم <span style="direction:ltr;unicode-bidi:isolate">${pct(d)}%</span></span>` : ''}` : `<div class="was">الدفع عند الاستلام</div>`}<span class="site">${site(ctx)}</span></div>
  </div>
</div>`,
      };
    },
  },

  // ─── 5) فاخر: قوس فيه الصورة + خط فخم + سعر صغير أنيق ─────────────────────────
  {
    id: 'poster-arch', type: 'poster', name: 'فاخر', desc: 'الصورة في قوس، خط فخم وسعر هادي', noFooter: true,
    render(ctx) {
      const { data: d } = ctx;
      const im = imgs(d);
      return {
        css: COMMON + `
.t-parch { background: radial-gradient(900px 700px at 50% 30%, var(--bg2) 0%, var(--bg) 70%); }
.t-parch .top { position: absolute; top: 48px; right: 0; left: 0; display: flex; justify-content: center; }
.t-parch .arch { position: absolute; top: 170px; left: 50%; width: 640px; height: 760px; margin-left: -320px; border-radius: 320px 320px 34px 34px; overflow: hidden; background: var(--photo); box-shadow: 0 30px 70px rgba(0,0,0,.28); }
.t-parch .arch img { width: 100%; height: 100%; display: block; }
.t-parch .ring { position: absolute; top: 146px; left: 50%; width: 688px; height: 808px; margin-left: -344px; border-radius: 344px 344px 46px 46px; border: 2px solid var(--acc); opacity: .7; }
.t-parch .badge { position: absolute; top: 210px; right: 150px; background: var(--acc); color: var(--acc-ink); font-family: var(--f-display); font-weight: 800; font-size: 24px; padding: 10px 22px; border-radius: 999px; transform: rotate(6deg); }
.t-parch h1 { position: absolute; top: 965px; right: 60px; left: 60px; text-align: center; font-family: var(--f-lux); font-weight: 700; line-height: 1.2; color: var(--ink); }
.t-parch .hook { position: absolute; top: 1068px; right: 80px; left: 80px; text-align: center; font-size: 30px; color: var(--ink2); }
.t-parch .price { position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 22px; white-space: nowrap;
  border: 2px solid var(--acc); border-radius: 999px; padding: 14px 40px; background: color-mix(in srgb, var(--bg) 85%, transparent); }
.t-parch .price .num { font-size: 58px; color: var(--acc); }
.t-parch .price .cur { font-size: 26px; color: var(--acc); }
.t-parch .price .was { font-size: 28px; color: var(--ink2); font-weight: 600; }
.t-parch .price .sep { width: 2px; height: 40px; background: var(--line); }
.t-parch .price .s { font-family: var(--f-display); font-size: 24px; color: var(--ink2); direction: ltr; }`,
        html: `<div class="cv pz t-parch">
  <div class="top">${brandRow(62)}</div>
  <div class="ring"></div>
  <div class="arch">${img(im[0], d.pos || '50% 40%')}</div>
  ${d.badge ? `<div class="badge">${esc(d.badge)}</div>` : ''}
  <h1 style="font-size:${nameSize(d.name, 58, 48)}px">${esc(d.name)}</h1>
  ${d.hook ? `<div class="hook">${esc(d.hook)}</div>` : ''}
  <div class="price"><span><span class="num">${money(d.price)}</span><span class="cur"> ج.م</span></span>${off(d) ? `<span class="was">بدل <span class="strike">${money(d.oldPrice)}</span></span>` : ''}<span class="sep"></span><span class="s">${site(ctx)}</span></div>
</div>`,
      };
    },
  },
];

export const POSTERS = poster.map(t => t.id);
