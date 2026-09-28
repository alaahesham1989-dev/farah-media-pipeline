// مشاهد الفيديو الحية (للريلز/تيك توك): كل مشهد فيه حركة كاميرا + كلام كلمة كلمة مع الصوت + «فرح مصر» فوق ثابتة.
// الحركات (data-m): snap زووم خاطف · orbit لفّة حوالين المنتج · punch زووم على جزء · pan تحريك · dolly رجوع لورا · float طفو
// الداتا المشتركة: image, headline (بيتلوّن **كده**), words [{w,t0,t1}] من الصوت, move, ox/oy (مركز الزووم %)
import { esc, rich, mark, money, num, icon } from '../parts.js';

// «فرح مصر» فوق — ثابتة في كل المشاهد (مابتتحركش عشان تبان كأنها طبقة واحدة طول الفيديو)
const vbar = brand => `<div class="vbar">${mark(58)}<span class="vn">${esc(brand.short)}</span><span class="vs">${esc(brand.site)}</span></div>`;

// الكلام اللي بيظهر كلمة كلمة: بنقسمه مجموعات (3-4 كلمات) والمسرح بيعرض المجموعة الحالية وينوّر الكلمة اللي بتتقال
export function captionHtml(words = [], cls = '') {
  if (!words.length) return '';
  let c = 0, n = 0;
  const ws = words.map(w => {
    const o = { w: w.w, t0: +w.t0.toFixed(3), t1: +w.t1.toFixed(3), c };
    n++;
    if (n >= 4 || /[،,.؟?!]$/.test(w.w)) { c++; n = 0; }
    return o;
  });
  return `<div class="vcap ${cls}" data-words='${esc(JSON.stringify(ws))}'>${ws.map((w, i) => `<span data-i="${i}">${esc(w.w)}</span>`).join(' ')}</div>`;
}

const COMMON = `
.vx { background: #05080d; }
.static [data-m], .static [data-slam] span, .static .oldp::after { animation: none !important; }
.static .glare { display: none; }
.vx .bg { position: absolute; inset: -80px; background-size: cover; background-position: center; filter: blur(46px) brightness(.5) saturate(1.25); transform: scale(1.15); }
.vx .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(5,8,13,.55), rgba(5,8,13,.1) 30%, rgba(5,8,13,.15) 60%, rgba(5,8,13,.7)); }
.vx .vbar { position: absolute; z-index: 9; top: var(--vbt, 150px); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 14px;
  padding: 8px 26px 8px 12px; border-radius: 999px; background: rgba(11,25,41,.72); border: 1.5px solid rgba(212,168,83,.45); backdrop-filter: blur(10px); white-space: nowrap; }
.vx .vbar .vn { font-family: var(--f-lux); font-weight: 700; font-size: 40px; color: #E9C77A; line-height: 1; }
.vx .vbar .vs { font-family: var(--f-display); font-weight: 500; font-size: 20px; color: #BBBFC3; direction: ltr; border-inline-start: 1.5px solid rgba(212,168,83,.4); padding-inline-start: 14px; }
.vx .hl { position: absolute; z-index: 5; left: 60px; right: 60px; top: var(--hlt, 270px); text-wrap: balance; text-align: center; font-family: var(--f-display); font-weight: 900; color: #fff;
  font-size: 76px; line-height: 1.12; text-shadow: 0 6px 30px rgba(0,0,0,.55); }
.vx .hl .foil-text { text-shadow: none; filter: drop-shadow(0 6px 20px rgba(0,0,0,.45)); }
.vx .vcap { position: absolute; z-index: 6; left: 50px; right: 50px; bottom: var(--capb, 440px); text-align: center; font-family: var(--f-display); font-weight: 800; font-size: 60px; line-height: 1.35; color: #fff;
  text-shadow: 0 4px 0 rgba(0,0,0,.35), 0 0 30px rgba(0,0,0,.6); }
.vx .vcap span { display: inline-block; opacity: .55; transition: none; margin: 0 6px; }
.vx .vcap span.on { opacity: 1; }
.vx .vcap span.now { color: #F3D27E; transform: scale(1.12); }
.vx .card { position: absolute; z-index: 3; left: 50%; top: var(--cardt, 470px); width: var(--cardw, 900px); height: var(--cardh, 900px); margin-left: calc(var(--cardw, 900px) / -2);
  border-radius: 44px; overflow: hidden; background: #0b0f16; box-shadow: 0 50px 90px rgba(0,0,0,.55), 0 0 0 2px rgba(212,168,83,.35); transform-style: preserve-3d; }
.vx .card img { width: 100%; height: 100%; object-fit: var(--fit, cover); transform-origin: var(--ox, 50%) var(--oy, 50%); }
.vx .glare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.18) 46%, transparent 60%); mix-blend-mode: screen; }
.f-square.vx, .f-portrait.vx { --vbt: 26px; --hlt: 110px; --capb: 40px; }
.f-square.vx { --cardt: 250px; --cardw: 600px; --cardh: 600px; }
.f-portrait.vx { --cardt: 300px; --cardw: 760px; --cardh: 760px; }
.f-square.vx .hl, .f-portrait.vx .hl { font-size: 58px; }
.f-square.vx .vcap, .f-portrait.vx .vcap { font-size: 46px; }
/* الحركات — طولها = طول المشهد (--dur) */
.anim [data-m] { animation-duration: var(--dur, 3s); animation-fill-mode: both; animation-timing-function: cubic-bezier(.22,.8,.3,1); }
.anim [data-m="snap"]  { animation-name: m-snap; }
.anim [data-m="orbit"] { animation-name: m-orbit; animation-timing-function: ease-in-out; }
.anim [data-m="punch"] { animation-name: m-punch; }
.anim [data-m="pan"]   { animation-name: m-pan; animation-timing-function: linear; }
.anim [data-m="dolly"] { animation-name: m-dolly; }
.anim [data-m="float"] { animation-name: m-float; animation-timing-function: ease-in-out; }
.anim [data-m="bg"]    { animation-name: m-bg; animation-timing-function: linear; }
.anim .glare { animation: m-glare var(--dur, 3s) ease-in-out both; }
.anim [data-slam] span { display: inline-block; animation: m-slam .45s cubic-bezier(.2,1.6,.4,1) both; animation-delay: calc(var(--i) * .16s + .1s); }
@keyframes m-snap  { 0% { transform: scale(.35) rotate(-6deg); opacity: 0; filter: blur(8px); } 9% { transform: scale(1.12) rotate(1deg); opacity: 1; filter: blur(0); } 16% { transform: scale(.98); } 22% { transform: scale(1.02); } 100% { transform: scale(1.1); } }
@keyframes m-orbit { 0% { transform: perspective(1400px) rotateY(-24deg) rotateX(4deg) scale(.96); } 100% { transform: perspective(1400px) rotateY(22deg) rotateX(-3deg) scale(1.06); } }
@keyframes m-punch { 0%, 22% { transform: scale(1); } 40% { transform: scale(1.75); } 100% { transform: scale(1.9); } }
@keyframes m-pan   { from { transform: scale(1.25) translateX(6%); } to { transform: scale(1.25) translateX(-6%); } }
@keyframes m-dolly { from { transform: scale(1.45); } to { transform: scale(1); } }
@keyframes m-float { 0% { transform: translateY(22px) rotate(-2.5deg); } 50% { transform: translateY(-16px) rotate(2deg); } 100% { transform: translateY(10px) rotate(-1deg); } }
@keyframes m-bg    { from { transform: scale(1.15) translateX(-3%); } to { transform: scale(1.3) translateX(3%); } }
@keyframes m-glare { 0% { transform: translateX(-120%); } 60%, 100% { transform: translateX(120%); } }
@keyframes m-slam  { 0% { transform: scale(2.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes m-strike { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes m-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
`;

// كلمة كلمة مع الحفاظ على **الكلمات الدهبي** حتى لو المجموعة فيها كذا كلمة
function richWords(text) {
  let gold = false;
  return String(text || '').split(/\s+/).filter(Boolean).map(raw => {
    let w = raw;
    if (w.startsWith('**')) { gold = true; w = w.slice(2); }
    const close = w.endsWith('**');
    if (close) w = w.slice(0, -2);
    const t = /^\d[\d.,]*%$/.test(w) ? `<span style="unicode-bidi:isolate;direction:ltr">${esc(w)}</span>` : esc(w);
    const html = gold ? `<span class="foil-text">${t}</span>` : t;
    if (close) gold = false;
    return html;
  });
}

// شارة صغيرة تحت «فرح مصر» (زي «● تصوير حقيقي للمنتج») + كلمات بتطلع واحدة ورا التانية (زي أسماء الرؤوس)
const EXTRA = `
.vx .tag { position: absolute; z-index: 8; top: calc(var(--vbt, 150px) + 96px); left: 0; right: 0; text-align: center; }
.vx .tag span { display: inline-block; background: rgba(11,25,41,.78); color: #fff; font-family: var(--f-display); font-weight: 700; font-size: 30px; padding: 6px 20px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,.25); }
.vx .tag b { color: #FF5A5F; margin-inline-end: 10px; font-size: .8em; }
.vx .chips { position: absolute; z-index: 6; left: 50px; right: 50px; top: var(--chipt, 500px); display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.vx .chip { background: rgba(11,25,41,.84); border: 2px solid rgba(243,210,126,.7); color: #F3D27E; font-family: var(--f-display); font-weight: 800; font-size: 46px; padding: 8px 28px; border-radius: 20px; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
.f-square.vx .chips, .f-portrait.vx .chips { --chipt: 250px; } .f-square.vx .chip, .f-portrait.vx .chip { font-size: 34px; }`;
const tagHtml = d => (d.tag ? `<div class="tag" data-a="fade" style="--d:.25s"><span><b>●</b>${esc(d.tag)}</span></div>` : '');
const chipsHtml = d => {
  const ls = d.labels || [];
  if (!ls.length) return '';
  return `<div class="chips">${ls.map((l, i) => `<span class="chip" data-a="pop" style="--d:${num(d.labelsAt?.[i]) || 0.5 + i * 0.55}s">${esc(l)}</span>`).join('')}</div>`;
};

// قصاقيص الفرح (confetti): بتنزل مرة واحدة من لحظة at — نفس الشكل في كل رسم (مش عشوائي)
const CONFETTI_CSS = `
.vx .cf { position: absolute; inset: 0; z-index: 7; pointer-events: none; overflow: hidden; }
.vx .cf i { position: absolute; top: -60px; left: var(--x); width: var(--w); height: calc(var(--w) * 1.6); background: var(--c); border-radius: 3px; opacity: 0; }
.anim.vx .cf i { animation: cf-fall var(--du) cubic-bezier(.25,.6,.45,1) both; animation-delay: calc(var(--at) + var(--dl)); }
.static.vx .cf { display: none; }
@keyframes cf-fall { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 6% { opacity: 1; } 100% { opacity: .9; transform: translate(var(--sx), 2050px) rotate(var(--r)); } }`;
function confetti(at = 0, n = 46) {
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const colors = ['#F3D27E', '#D4A853', '#FFFFFF', '#F8E9B8', '#E7B7C8', '#B98A36'];
  const bits = Array.from({ length: n }, () => `<i style="--x:${(rnd() * 100).toFixed(1)}%;--w:${(10 + rnd() * 12).toFixed(0)}px;--c:${colors[Math.floor(rnd() * colors.length)]};--du:${(1.8 + rnd() * 1.6).toFixed(2)}s;--dl:${(rnd() * 0.7).toFixed(2)}s;--sx:${((rnd() - 0.5) * 260).toFixed(0)}px;--r:${(360 + rnd() * 720).toFixed(0)}deg"></i>`).join('');
  return `<div class="cf" style="--at:${Number(at).toFixed(2)}s">${bits}</div>`;
}

// الخلفية: صورة متغبّشة بتتحرك ببطء — blur (px) لو عايزها أوضح (زي قاعة الفرح ورا الختام)
const bgOf = (img, blur) => (img ? `<div class="bg" data-m="bg" style="background-image:url('${esc(img)}')${blur != null ? `;filter:blur(${num(blur)}px) brightness(.62) saturate(1.2)` : ''}"></div>` : '');
const words = d => d.words || [];

// أشعة نور دهبي بتلف ورا المشهد (لمشاهد الافتتاح) + فلاش أبيض على الضربة
const RAYS_CSS = `
.vx .rays { position: absolute; left: 50%; top: 45%; width: 2600px; height: 2600px; margin: -1300px 0 0 -1300px; z-index: 1; opacity: .5;
  background: repeating-conic-gradient(from 0deg, rgba(243,210,126,.22) 0deg 7deg, rgba(243,210,126,0) 7deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 0%, transparent 62%); mask: radial-gradient(circle, #000 0%, transparent 62%); }
.anim.vx .rays { animation: rays-spin var(--dur, 3s) linear both; }
@keyframes rays-spin { from { transform: rotate(0deg) scale(1); } to { transform: rotate(40deg) scale(1.12); } }
.vx .flash { position: absolute; inset: 0; z-index: 9; background: #fff; opacity: 0; pointer-events: none; }
.anim.vx .flash { animation: flash-in .32s ease-out both; }
@keyframes flash-in { 0% { opacity: .75; } 100% { opacity: 0; } }
@keyframes slam-in { 0% { transform: scale(2.6) rotate(var(--r0, -4deg)); opacity: 0; filter: blur(6px); } 55% { transform: scale(.94) rotate(0); opacity: 1; filter: blur(0); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes spin-pop { 0% { transform: scale(0) rotate(-200deg); } 70% { transform: scale(1.15) rotate(8deg); } 100% { transform: scale(1) rotate(-8deg); } }
@keyframes strike-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes punch-in { from { transform: scale(1.18); } to { transform: scale(1.02); } }`;

export const video = [
  {
    id: 'v-slam', type: 'video', name: 'ضربات كلام كبير', desc: 'سطور ضخمة بتخبط واحد ورا التاني على الإيقاع، ووراها أشعة نور دهبي — lines: [{text, at, size}]', noDecor: true, noFooter: true,
    defaults: { lines: [{ text: 'خصومات الافتتاح', at: 0.05 }, { text: 'لحد **49%**', at: 0.6, size: 190 }] },
    render(ctx) {
      const { data: d, brand } = ctx;
      const lines = d.lines || [];
      return {
        css: COMMON + RAYS_CSS + CONFETTI_CSS + `
.t-vslam { background: radial-gradient(110% 70% at 50% 45%, #1B3354 0%, #0B1929 60%, #05080D 100%); }
.t-vslam .stack { position: absolute; z-index: 5; left: 40px; right: 40px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
.t-vslam .ln { font-family: var(--f-display); font-weight: 900; color: #fff; line-height: 1.05; text-shadow: 0 10px 40px rgba(0,0,0,.55); }
.t-vslam .ln .foil-text { filter: drop-shadow(0 8px 24px rgba(0,0,0,.5)); }
.anim.t-vslam .ln { animation: slam-in .42s cubic-bezier(.2,1.4,.4,1) both; animation-delay: var(--at); }`,
        html: `<div class="cv vx t-vslam">
  <div class="rays"></div>
  <div class="stack">${lines.map((l, i) => `<div class="ln" style="--at:${num(l.at)}s;--r0:${i % 2 ? 4 : -4}deg;font-size:${num(l.size) || 120}px">${rich(l.text).replace(/([\d.,]+\s?%)/g, '<span style="unicode-bidi:isolate;direction:ltr">$1</span>')}</div>`).join('')}</div>
  ${d.confettiAt != null ? confetti(num(d.confettiAt)) : ''}
  <div class="flash"></div>
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-flash', type: 'video', name: 'كارت منتج سريع', desc: 'منتج في ثانية: الصورة بزووم، ملصق الخصم بيلف، السعر بيخبط والقديم بيتشطب — للمونتاج على الإيقاع', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      const hasOld = num(d.oldPrice) > num(d.price);
      const off = hasOld ? Math.round(100 - (100 * num(d.price)) / num(d.oldPrice)) : 0;
      return {
        css: COMMON + RAYS_CSS + `
.t-vflash { background: #0B1929; }
.t-vflash .bg { filter: blur(40px) brightness(.45) saturate(1.4); }
.t-vflash .pcard { position: absolute; z-index: 3; left: 90px; right: 90px; top: 360px; height: 900px; border-radius: 48px; overflow: hidden; background: #fff;
  box-shadow: 0 50px 100px rgba(0,0,0,.55), 0 0 0 4px rgba(243,210,126,.8); }
.t-vflash .pcard img { width: 100%; height: 100%; object-fit: contain; }
.anim.t-vflash .pcard img { animation: punch-in var(--dur, 1.1s) cubic-bezier(.2,.8,.3,1) both; }
.anim.t-vflash .pcard { animation: slam-in .34s cubic-bezier(.2,1.3,.4,1) both; }
.t-vflash .nm { position: absolute; z-index: 5; left: 50px; right: 50px; top: 250px; text-align: center; font-family: var(--f-display); font-weight: 900; font-size: 68px; color: #fff; line-height: 1.1; text-shadow: 0 6px 24px rgba(0,0,0,.6); }
.anim.t-vflash .nm { animation: a-rise .3s ease-out both; }
.t-vflash .off { position: absolute; z-index: 6; right: 44px; top: 400px; width: 250px; height: 250px; display: grid; place-items: center; text-align: center;
  background: radial-gradient(circle at 35% 30%, #FF6B6B, #D42A2A 70%); border-radius: 50%; box-shadow: 0 16px 40px rgba(0,0,0,.45), 0 0 0 8px rgba(255,255,255,.9);
  color: #fff; font-family: var(--f-display); font-weight: 900; font-size: 92px; line-height: .9; direction: ltr; transform: rotate(-8deg); }
.t-vflash .off small { display: block; font-size: 34px; font-weight: 800; direction: rtl; margin-top: 4px; }
.anim.t-vflash .off { animation: spin-pop .42s cubic-bezier(.2,1.4,.4,1) both; animation-delay: .12s; }
.t-vflash .prices { position: absolute; z-index: 6; left: 0; right: 0; top: 1300px; display: flex; justify-content: center; align-items: baseline; gap: 34px; direction: rtl; }
.t-vflash .newp { font-family: var(--f-display); font-weight: 900; font-size: 170px; line-height: 1; direction: ltr; }
.t-vflash .newp small { font-size: .36em; margin-left: 10px; }
.anim.t-vflash .newp { animation: slam-in .36s cubic-bezier(.2,1.5,.4,1) both; animation-delay: .22s; }
.t-vflash .oldp { position: relative; font-family: var(--f-display); font-weight: 800; font-size: 72px; color: #AEB6C1; direction: ltr; }
.t-vflash .oldp::after { content: ''; position: absolute; left: -8px; right: -8px; top: 52%; height: 9px; border-radius: 5px; background: #FF4D4F; transform-origin: right; }
.anim.t-vflash .oldp::after { animation: strike-x .22s ease-out both; animation-delay: .38s; }
.t-vflash .tagx { position: absolute; z-index: 6; left: 0; right: 0; top: 1500px; text-align: center; }
.t-vflash .tagx span { display: inline-block; background: linear-gradient(135deg,#F8E9B8,#D4A853 55%,#A87D2E); color: #0B1929; font-family: var(--f-display); font-weight: 900; font-size: 44px; padding: 8px 30px; border-radius: 999px; }
.anim.t-vflash .tagx span { animation: a-pop .3s ease-out both; animation-delay: .3s; }
/* 4:5 للفيد (1350 طول): نفس الترتيب بس أقصر، عشان السعر والشارة مايتقصوش من تحت */
.f-portrait.t-vflash .nm { top: 105px; font-size: 60px; }
.f-portrait.t-vflash .pcard { left: 150px; right: 150px; top: 195px; height: 690px; }
.f-portrait.t-vflash .off { right: 70px; top: 215px; width: 200px; height: 200px; font-size: 74px; }
.f-portrait.t-vflash .off small { font-size: 28px; }
.f-portrait.t-vflash .prices { top: 905px; } .f-portrait.t-vflash .newp { font-size: 150px; }
.f-portrait.t-vflash .tagx { top: 1095px; }`,
        html: `<div class="cv vx t-vflash">
  ${bgOf(d.image)}<div class="rays"></div>
  <div class="nm">${esc(d.name || '')}</div>
  <div class="pcard">${d.image ? `<img src="${esc(d.image)}" alt="">` : ''}</div>
  ${off ? `<div class="off">-${off}%<small>خصم</small></div>` : ''}
  <div class="prices"><div class="newp foil-text">${money(d.price)}<small>ج</small></div>${hasOld ? `<div class="oldp">${money(d.oldPrice)}</div>` : ''}</div>
  ${d.tag ? `<div class="tagx"><span>${esc(d.tag)}</span></div>` : ''}
  <div class="flash"></div>
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-trust', type: 'video', name: 'مشهد الثقة', desc: 'سطور ثقة كبيرة بأيقونات بتطلع على الإيقاع (شحن، استبدال، شحن مجاني)', noDecor: true, noFooter: true,
    defaults: { items: [{ icon: 'truck', text: 'شحن لكل المحافظات', at: 0.05 }, { icon: 'refresh', text: 'استبدال خلال 14 يوم', at: 0.6 }, { icon: 'gift', text: 'شحن مجاني فوق 600 ج', at: 1.15 }] },
    render(ctx) {
      const { data: d, brand } = ctx;
      return {
        css: COMMON + RAYS_CSS + `
.t-vtrust { background: radial-gradient(110% 70% at 50% 45%, #1B3354 0%, #0B1929 60%, #05080D 100%); }
.t-vtrust .list { position: absolute; z-index: 5; left: 70px; right: 70px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 36px; }
.t-vtrust .it { display: flex; align-items: center; gap: 30px; background: rgba(11,25,41,.82); border: 3px solid rgba(243,210,126,.7); border-radius: 36px; padding: 34px 40px; box-shadow: 0 20px 50px rgba(0,0,0,.4); }
.t-vtrust .it .ic { width: 96px; height: 96px; flex: none; background: #F3D27E; }
.t-vtrust .it b { font-family: var(--f-display); font-weight: 900; font-size: 58px; color: #fff; line-height: 1.15; }
.t-vtrust .it small { display: block; margin-top: 6px; font-family: var(--f-display); font-weight: 700; font-size: 34px; color: #E9C77A; line-height: 1.2; }
.anim.t-vtrust .it { animation: slam-in .38s cubic-bezier(.2,1.3,.4,1) both; animation-delay: var(--at); }`,
        html: `<div class="cv vx t-vtrust">
  ${bgOf(d.image, 18)}<div class="rays"></div>
  <div class="list">${(d.items || []).map(it => `<div class="it" style="--at:${num(it.at)}s">${icon(it.icon)}<div><b>${esc(it.text)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</div></div>`).join('')}</div>
  <div class="flash"></div>
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-intro', type: 'video', name: 'افتتاحية «كارت الدعوة»', desc: 'كارت فرح: البرواز بيترسم، واللوجو بيترسم كأن فيه قلم بيرسمه، واسم المتجر، وسطرين الدعوة، وقصاقيص دهبي', noDecor: true, noFooter: true,
    defaults: { line1: 'عندنا فرح…', line2: 'وإنتي المعزومة!', t1: 0.9, t2: 1.6 },
    render(ctx) {
      const { data: d, brand } = ctx;
      const t1 = num(d.t1) || 0.9, t2 = num(d.t2) || 1.6;
      return {
        css: COMMON + CONFETTI_CSS + `
@property --sweep { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.t-vintro { background: radial-gradient(120% 70% at 50% 38%, #1B3354 0%, #0B1929 55%, #060D17 100%); }
.t-vintro .glow { position: absolute; left: 50%; top: 640px; width: 900px; height: 900px; margin: -450px 0 0 -450px; border-radius: 50%;
  background: radial-gradient(circle, rgba(243,210,126,.28), rgba(243,210,126,0) 65%); }
.anim.t-vintro .glow { animation: in-glow var(--dur, 3s) ease-out both; }
.t-vintro .frame { position: absolute; inset: 70px 60px 90px; border: 3px solid rgba(212,168,83,.75); border-radius: 36px; box-shadow: inset 0 0 0 14px rgba(11,25,41,.0), inset 0 0 0 17px rgba(212,168,83,.35); }
.anim.t-vintro .frame { animation: in-frame 1.1s cubic-bezier(.6,0,.2,1) both; }
.t-vintro .corner { position: absolute; width: 90px; height: 90px; border-color: #E9C77A; border-style: solid; opacity: .9; }
.t-vintro .c1 { top: 52px; right: 42px; border-width: 5px 5px 0 0; border-radius: 0 30px 0 0; } .t-vintro .c2 { top: 52px; left: 42px; border-width: 5px 0 0 5px; border-radius: 30px 0 0 0; }
.t-vintro .c3 { bottom: 72px; right: 42px; border-width: 0 5px 5px 0; border-radius: 0 0 30px 0; } .t-vintro .c4 { bottom: 72px; left: 42px; border-width: 0 0 5px 5px; border-radius: 0 0 0 30px; }
.anim.t-vintro .corner { animation: a-fade .6s ease both; animation-delay: .5s; }
.t-vintro .logo { position: absolute; left: 50%; top: 330px; width: 420px; height: 420px; margin-left: -210px; }
.t-vintro .logo .ring { position: absolute; inset: 0; border-radius: 50%; border: 4px solid #E9C77A;
  -webkit-mask: conic-gradient(#000 var(--sweep), transparent 0); mask: conic-gradient(#000 var(--sweep), transparent 0); }
.t-vintro .logo .draw { position: absolute; inset: 40px; display: grid; place-items: center;
  -webkit-mask: conic-gradient(#000 var(--sweep), transparent 0); mask: conic-gradient(#000 var(--sweep), transparent 0); }
.t-vintro .logo .draw .mark { --s: 300px; }
.anim.t-vintro .logo .ring, .anim.t-vintro .logo .draw { animation: in-sweep 1.15s cubic-bezier(.55,.05,.3,1) both; animation-delay: .15s; }
.static.t-vintro .logo .ring, .static.t-vintro .logo .draw { --sweep: 360deg; }
.t-vintro .logo .pen { position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; margin: -11px; border-radius: 50%; background: #FFF6D8;
  box-shadow: 0 0 22px 8px rgba(255,230,160,.8); opacity: 0; }
.anim.t-vintro .logo .pen { animation: in-pen 1.15s cubic-bezier(.55,.05,.3,1) both; animation-delay: .15s; }
.t-vintro .logo .shine { position: absolute; inset: 40px; border-radius: 50%; overflow: hidden; }
.t-vintro .logo .shine::after { content: ''; position: absolute; inset: -20%; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%); transform: translateX(-130%); }
.anim.t-vintro .logo .shine::after { animation: in-shine .9s ease-in-out both; animation-delay: 1.25s; }
.t-vintro .nm { position: absolute; left: 0; right: 0; top: 790px; text-align: center; font-family: var(--f-lux); font-weight: 700; font-size: 92px; color: #E9C77A; line-height: 1; }
.t-vintro .en { position: absolute; left: 0; right: 0; top: 905px; text-align: center; font-family: var(--f-display); font-weight: 500; font-size: 26px; letter-spacing: .5em; color: #BBBFC3; direction: ltr; }
.t-vintro .l1 { position: absolute; left: 40px; right: 40px; top: 1030px; text-align: center; font-family: var(--f-display); font-weight: 900; font-size: 118px; color: #fff; line-height: 1.15; text-shadow: 0 8px 30px rgba(0,0,0,.5); }
.t-vintro .l2 { position: absolute; left: 40px; right: 40px; top: 1190px; text-align: center; font-family: var(--f-lux); font-weight: 700; font-size: 104px; line-height: 1.2; }
.anim.t-vintro .l1 span { display: inline-block; animation: m-slam .45s cubic-bezier(.2,1.6,.4,1) both; animation-delay: calc(${t1}s + var(--i) * .14s); }
.anim.t-vintro .l2 { animation: a-pop .6s cubic-bezier(.2,1.5,.4,1) both; animation-delay: ${t2}s; }
@keyframes in-sweep { from { --sweep: 0deg; } to { --sweep: 360deg; } }
@keyframes in-pen { 0% { opacity: 1; transform: rotate(0deg) translateY(-196px); } 92% { opacity: 1; } 100% { opacity: 0; transform: rotate(360deg) translateY(-196px); } }
@keyframes in-frame { from { clip-path: inset(50% 50% 50% 50% round 36px); opacity: .2; } to { clip-path: inset(0 0 0 0 round 36px); opacity: 1; } }
@keyframes in-glow { from { transform: scale(.6); opacity: 0; } to { transform: scale(1.08); opacity: 1; } }
@keyframes in-shine { to { transform: translateX(130%); } }
.anim.t-vintro.fast .logo .ring, .anim.t-vintro.fast .logo .draw, .anim.t-vintro.fast .logo .pen { animation-duration: .8s; animation-delay: 0s; }
.anim.t-vintro.fast .frame { animation-duration: .6s; } .anim.t-vintro.fast .corner { animation-delay: .2s; } .anim.t-vintro.fast .logo .shine::after { animation-delay: .8s; }
.anim.t-vintro.fast .nm { animation-delay: .4s !important; } .anim.t-vintro.fast .en { animation-delay: .55s !important; }
.f-square.t-vintro .logo, .f-portrait.t-vintro .logo { top: 90px; transform: scale(.7); }
.f-square.t-vintro .nm, .f-portrait.t-vintro .nm { top: 420px; font-size: 70px; } .f-square.t-vintro .en, .f-portrait.t-vintro .en { top: 505px; }
.f-square.t-vintro .l1, .f-portrait.t-vintro .l1 { top: 600px; font-size: 84px; } .f-square.t-vintro .l2, .f-portrait.t-vintro .l2 { top: 720px; font-size: 76px; }`,
        html: `<div class="cv vx t-vintro${d.fast ? ' fast' : ''}">
  <div class="glow"></div><div class="frame"></div><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i>
  <div class="logo"><div class="ring"></div><div class="draw">${mark(300)}</div><div class="shine"></div><div class="pen"></div></div>
  <div class="nm" data-a="rise" style="--d:.95s">${esc(brand.short || brand.name)}</div>
  ${brand.en ? `<div class="en" data-a="fade" style="--d:1.2s">${esc(brand.en)}</div>` : ''}
  <div class="l1">${richWords(d.line1).map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</div>
  <div class="l2 foil-text">${esc(d.line2)}</div>
  ${confetti(t2 + 0.05)}
</div>`,
      };
    },
  },
  {
    id: 'v-hook', type: 'video', name: 'افتتاحية حية', desc: 'الجملة بتخبط كلمة كلمة والمنتج داخل بزووم خاطف', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      const head = richWords(d.headline);
      return {
        css: COMMON + `.t-vhook .hl { top: var(--hlt, 262px); font-size: 84px; line-height: 1.2; } .t-vhook .card { --cardt: 560px; --cardh: 860px; } .f-square.t-vhook .hl { font-size: 60px; } .f-square.t-vhook .card, .f-portrait.t-vhook .card { --cardt: 330px; }`,
        html: `<div class="cv vx t-vhook">
  ${bgOf(d.image)}<div class="shade"></div>
  <div class="card" data-m="${esc(d.move || 'snap')}" style="--fit:${d.fit || 'cover'};--ox:${num(d.ox) || 50}%;--oy:${num(d.oy) || 50}%">${d.image ? `<img src="${esc(d.image)}" alt="">` : ''}<div class="glare"></div></div>
  <div class="hl" data-slam>${head.map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</div>
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-shot', type: 'video', name: 'مشهد متحرك', desc: 'صورة المنتج بحركة كاميرا (لفّة/زووم/تحريك) وعنوان وكلام مع الصوت', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      return {
        css: COMMON,
        html: `<div class="cv vx t-vshot">
  ${bgOf(d.image)}<div class="shade"></div>
  <div class="card" data-m="${esc(d.move === 'punch' ? 'none' : d.move || 'orbit')}" style="--fit:${d.fit || 'cover'}">
    ${d.image ? `<img src="${esc(d.image)}" alt="" ${d.move === 'punch' ? 'data-m="punch"' : ''} style="--ox:${num(d.ox) || 50}%;--oy:${num(d.oy) || 50}%">` : ''}<div class="glare"></div></div>
  ${d.headline ? `<div class="hl" data-a="pop" style="--d:.15s">${rich(d.headline)}</div>` : ''}
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-split', type: 'video', name: 'شاشة مقسومة', desc: 'صورتين فوق بعض بيتحركوا عكس بعض، ولكل واحدة كلمة', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      const [a, b] = [d.image, d.image2 || d.image];
      return {
        css: COMMON + `
.t-vsplit .half { position: absolute; z-index: 3; left: 60px; right: 60px; height: 440px; border-radius: 36px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,.5), 0 0 0 2px rgba(212,168,83,.3); }
.t-vsplit .half img { width: 100%; height: 100%; object-fit: cover; }
.t-vsplit .h1 { top: 440px; } .t-vsplit .h2 { top: 920px; }
.t-vsplit .lab { position: absolute; bottom: 18px; right: 18px; background: rgba(11,25,41,.8); color: #F3D27E; font-family: var(--f-display); font-weight: 800; font-size: 40px; padding: 8px 22px; border-radius: 16px; }
.anim.t-vsplit .h1 img { animation: m-pan var(--dur,3s) linear both; } .anim.t-vsplit .h2 img { animation: m-pan var(--dur,3s) linear reverse both; }
.f-square.t-vsplit .half, .f-portrait.t-vsplit .half { height: 300px; } .f-square.t-vsplit .h1, .f-portrait.t-vsplit .h1 { top: 200px; } .f-square.t-vsplit .h2, .f-portrait.t-vsplit .h2 { top: 530px; }`,
        html: `<div class="cv vx t-vsplit">
  ${bgOf(a)}<div class="shade"></div>
  <div class="half h1" data-a="right" style="--d:.05s"><img src="${esc(a)}" alt="">${d.label1 ? `<span class="lab">${esc(d.label1)}</span>` : ''}</div>
  <div class="half h2" data-a="left" style="--d:.25s"><img src="${esc(b)}" alt="">${d.label2 ? `<span class="lab">${esc(d.label2)}</span>` : ''}</div>
  ${d.headline ? `<div class="hl" data-a="pop" style="--d:.1s">${rich(d.headline)}</div>` : ''}
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-price', type: 'video', name: 'مشهد السعر', desc: 'السعر بيتعد قدامك والقديم بيتشطب', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      const hasOld = num(d.oldPrice) > num(d.price);
      const t0 = num(d.countAt) || (hasOld ? 0.9 : 0.35); // العداد بيبدأ إمتى (ممكن يتظبط على الكلمة في الصوت)
      const cd = num(d.countDur) || 1.1; // العداد بياخد قد إيه
      return {
        css: COMMON + `
.t-vprice .card { --cardt: 360px; --cardw: 520px; --cardh: 520px; border-radius: 50%; }
.t-vprice .pbox { position: absolute; z-index: 5; left: 0; right: 0; top: 920px; text-align: center; }
.t-vprice .lbl { font-family: var(--f-display); font-weight: 700; font-size: 44px; color: #D8DDE3; }
.t-vprice .oldp { display: inline-block; position: relative; font-family: var(--f-display); font-weight: 700; font-size: 70px; color: #9AA3AE; margin-top: 6px; }
.t-vprice .oldp::after { content: ''; position: absolute; left: -8px; right: -8px; top: 52%; height: 8px; border-radius: 4px; background: #E5484D; transform-origin: right; transform: scaleX(1); }
.anim.t-vprice .oldp::after { animation: m-strike .45s ease-out both; animation-delay: var(--sd, .45s); }
.t-vprice .newp { font-family: var(--f-display); font-weight: 900; font-size: 190px; line-height: 1.05; direction: ltr; }
.t-vprice .newp small { font-size: .38em; margin-left: 12px; }
.t-vprice .badge { display: inline-block; margin-top: 16px; background: linear-gradient(135deg,#F8E9B8,#D4A853 55%,#A87D2E); color: #0B1929; font-family: var(--f-display); font-weight: 800; font-size: 44px; padding: 10px 34px; border-radius: 999px; }
.f-square.t-vprice .card, .f-portrait.t-vprice .card { --cardt: 170px; --cardw: 380px; --cardh: 380px; }
.f-square.t-vprice .pbox, .f-portrait.t-vprice .pbox { top: 570px; } .f-square.t-vprice .newp, .f-portrait.t-vprice .newp { font-size: 130px; }`,
        html: `<div class="cv vx t-vprice">
  ${bgOf(d.bg || d.image, d.bgBlur)}<div class="shade"></div>
  <div class="card" data-m="float">${d.image ? `<img src="${esc(d.image)}" alt="">` : ''}<div class="glare"></div></div>
  <div class="pbox">
    <div class="lbl" data-a="fade">${esc(d.label || (hasOld ? 'بدل' : 'السعر'))}</div>
    ${hasOld ? `<div class="oldp" data-a="fade" style="--d:.15s;--sd:${num(d.strikeAt) || 0.45}s">${money(d.oldPrice)} ج</div>` : ''}
    <div class="newp foil-text"><span data-count data-to="${num(d.price)}"${hasOld && d.countFrom !== 0 ? ` data-from="${num(d.oldPrice)}"` : ""} data-t0="${t0}" data-t1="${t0 + cd}">${money(d.price)}</span><small>ج</small></div>
    ${d.badge || hasOld ? `<div class="badge" data-a="pop" style="--d:${t0 + cd + 0.05}s">${esc(d.badge || `وفّر ${money(num(d.oldPrice) - num(d.price))} ج`)}</div>` : ''}
  </div>
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-cta', type: 'video', name: 'النهاية الحية', desc: 'صورة المنتج + سطور الثقة بتطلع مع الصوت + زرار «اطلبي دلوقتي» بينبض + الموقع', noDecor: true, noFooter: true,
    defaults: { labels: ['استبدال خلال 14 يوم', 'شحن لكل المحافظات'], icons: ['refresh', 'truck'] },
    render(ctx) {
      const { data: d, brand } = ctx;
      const ls = d.labels || [];
      return {
        css: COMMON + CONFETTI_CSS + `
.t-vcta .card { --cardt: 330px; --cardw: 600px; --cardh: 600px; }
.t-vcta .trust { position: absolute; z-index: 5; left: 70px; right: 70px; top: 990px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.t-vcta .trust span { display: inline-flex; align-items: center; gap: 16px; background: rgba(11,25,41,.8); border: 2px solid rgba(243,210,126,.55); color: #fff; font-family: var(--f-display); font-weight: 700; font-size: 44px; padding: 10px 30px; border-radius: 20px; }
.t-vcta .trust .ic { width: 44px; height: 44px; background: #F3D27E; }
.t-vcta .go { position: absolute; z-index: 5; left: 0; right: 0; top: 1200px; text-align: center; }
.t-vcta .btn { display: inline-flex; align-items: center; gap: 16px; background: var(--foil); color: var(--foil-ink); border-radius: 999px; padding: 24px 64px; font-family: var(--f-display); font-weight: 900; font-size: 58px; box-shadow: 0 20px 50px rgba(0,0,0,.45); }
.t-vcta .btn .ic { width: 54px; height: 54px; background: currentColor; }
.anim.t-vcta .btn > span { display: inline-flex; align-items: center; gap: 16px; animation: m-pulse 1.1s ease-in-out infinite; animation-delay: 1.4s; }
.t-vcta .site { margin-top: 18px; font-family: var(--f-display); font-weight: 600; font-size: 36px; color: #E9C77A; direction: ltr; }
.f-square.t-vcta .card, .f-portrait.t-vcta .card { --cardt: 130px; --cardw: 340px; --cardh: 340px; }
.f-square.t-vcta .trust, .f-portrait.t-vcta .trust { top: 500px; } .f-square.t-vcta .go, .f-portrait.t-vcta .go { top: 700px; }
.f-square.t-vcta .trust span { font-size: 34px; }
.t-vcta .grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; height: 100%; background: #F3D27E; } .t-vcta .grid4 img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
.t-vcta .note { position: absolute; z-index: 8; left: 40px; right: 40px; top: 238px; text-align: center; font-family: var(--f-lux); font-weight: 700; font-size: 70px; line-height: 1.25; filter: drop-shadow(0 6px 18px rgba(0,0,0,.5)); }
.f-square.t-vcta .note, .f-portrait.t-vcta .note { top: 60px; font-size: 48px; }
/* 4:5 للفيد: الكارت أكبر، والكلام والزرار تحته من غير زحمة */
.f-portrait.t-vcta .card { --cardt: 185px; --cardw: 560px; --cardh: 560px; }
.f-portrait.t-vcta .note { top: 92px; font-size: 54px; }
.f-portrait.t-vcta .trust { top: 775px; } .f-portrait.t-vcta .trust span { font-size: 40px; }
.f-portrait.t-vcta .go { top: 965px; }`,
        html: `<div class="cv vx t-vcta">
  ${bgOf(d.bg || d.image, d.bgBlur)}<div class="shade"></div>
  <div class="card" data-m="float">${d.grid ? `<div class="grid4">${d.grid.slice(0, 4).map(g => `<img src="${esc(g)}" alt="">`).join('')}</div>` : d.image ? `<img src="${esc(d.image)}" alt="">` : ''}<div class="glare"></div></div>
  <div class="trust">${ls.map((l, i) => `<span data-a="pop" style="--d:${num(d.labelsAt?.[i]) || 0.4 + i * 0.5}s">${d.icons?.[i] ? icon(d.icons[i]) : ''}${esc(l)}</span>`).join('')}</div>
  <div class="go"><div class="btn" data-a="pop" style="--d:${num(d.ctaAt) || 1.2}s"><span>${icon('shopping-cart')} ${esc(d.cta || brand.cta?.[0] || 'اطلبي دلوقتي')}</span></div><div class="site" data-a="fade" style="--d:${(num(d.ctaAt) || 1.2) + 0.3}s">${esc(brand.site)}</div></div>
  ${d.note ? `<div class="note foil-text" data-a="pop" style="--d:${num(d.noteAt) || 2.4}s">${esc(d.note)}</div>${confetti(num(d.noteAt) || 2.4)}` : ''}
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
  {
    id: 'v-overlay', type: 'video', name: 'طبقة فوق لقطة حقيقية', desc: 'شفافة: «فرح مصر» فوق + العنوان + شارة «تصوير حقيقي» + كلمات بتظهر واحدة واحدة (labels) + الكلام مع الصوت — بتتحط فوق الفيديو الحقيقي', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      return {
        css: COMMON + EXTRA + `.t-vover { background: transparent !important; } .t-vover .hl { background: rgba(11,25,41,.62); border-radius: 28px; padding: 14px 26px; left: 80px; right: 80px; }
.t-vover .shade { background: linear-gradient(to bottom, rgba(5,8,13,.45), rgba(5,8,13,0) 22%, rgba(5,8,13,0) 62%, rgba(5,8,13,.55)); }`,
        html: `<div class="cv vx t-vover transparent"><div class="shade"></div>${d.headline ? `<div class="hl" data-a="pop" style="--d:.12s">${rich(d.headline)}</div>` : ''}${tagHtml(d)}${chipsHtml(d)}${captionHtml(words(d))}${vbar(brand)}</div>`,
      };
    },
  },
  {
    id: 'v-scene', type: 'video', name: 'مشهد صورة كاملة', desc: 'صورة مالية الشاشة (زي صورة استخدام) بحركة كاميرا بطيئة، وممكن كارت فيه صورة المنتج الحقيقي طالع فوقها', noDecor: true, noFooter: true,
    render(ctx) {
      const { data: d, brand } = ctx;
      return {
        css: COMMON + EXTRA + `
.t-vscene .full { position: absolute; inset: 0; overflow: hidden; }
.t-vscene .full img { width: 100%; height: 100%; object-fit: cover; transform-origin: var(--ox, 50%) var(--oy, 50%); }
.anim.t-vscene .full img { animation-duration: var(--dur, 3s); animation-timing-function: linear; animation-fill-mode: both; }
.anim.t-vscene .full img[data-kb="in"]    { animation-name: kb-in; }
.anim.t-vscene .full img[data-kb="out"]   { animation-name: kb-out; }
.anim.t-vscene .full img[data-kb="left"]  { animation-name: kb-left; }
.anim.t-vscene .full img[data-kb="right"] { animation-name: kb-left; animation-direction: reverse; }
.anim.t-vscene .full img[data-kb="up"]    { animation-name: kb-up; }
.anim.t-vscene .full img[data-kb="drone"] { animation-name: kb-drone; animation-timing-function: cubic-bezier(.35,0,.25,1); }
.anim.t-vscene .full img[data-kb="rise"]  { animation-name: kb-rise; animation-timing-function: cubic-bezier(.35,0,.25,1); }
@keyframes kb-drone { from { transform: scale(1.34) translate(3%, 5%) rotate(-1.6deg); } to { transform: scale(1.05) translate(-1%, -1.5%) rotate(.4deg); } }
@keyframes kb-rise  { from { transform: scale(1.08) translateY(4%); } to { transform: scale(1.22) translateY(-3%); } }
@keyframes kb-in   { from { transform: scale(1.03); } to { transform: scale(1.17); } }
@keyframes kb-out  { from { transform: scale(1.2); } to { transform: scale(1.03); } }
@keyframes kb-left { from { transform: scale(1.14) translateX(3.5%); } to { transform: scale(1.14) translateX(-3.5%); } }
@keyframes kb-up   { from { transform: scale(1.14) translateY(3%); } to { transform: scale(1.14) translateY(-3%); } }
.t-vscene .shade { background: linear-gradient(to bottom, rgba(5,8,13,.55), rgba(5,8,13,0) 24%, rgba(5,8,13,0) 58%, rgba(5,8,13,.72)); }
.t-vscene .hl { background: rgba(11,25,41,.55); border-radius: 28px; padding: 14px 26px; left: 80px; right: 80px; }
.t-vscene .pcard { position: absolute; z-index: 4; left: 50%; top: var(--pct, 760px); width: var(--pcw, 520px); height: var(--pch, 520px); margin-left: calc(var(--pcw, 520px) / -2); }
.t-vscene .pcard > div { width: 100%; height: 100%; border-radius: 40px; overflow: hidden; border: 4px solid rgba(243,210,126,.85); box-shadow: 0 40px 80px rgba(0,0,0,.55); background: #fff; }
.t-vscene .pcard img { width: 100%; height: 100%; object-fit: cover; }
.f-square.t-vscene .pcard, .f-portrait.t-vscene .pcard { --pct: 330px; --pcw: 380px; --pch: 380px; }`,
        html: `<div class="cv vx t-vscene">
  <div class="full">${d.image ? `<img src="${esc(d.image)}" alt="" data-kb="${esc(d.move || 'in')}" style="--ox:${num(d.ox) || 50}%;--oy:${num(d.oy) || 50}%">` : ''}</div><div class="shade"></div>
  ${d.card ? `<div class="pcard" data-a="pop" style="--d:${num(d.cardAt) || 0.45}s${num(d.cardTop) ? `;--pct:${num(d.cardTop)}px` : ""}"><div data-m="float"><img src="${esc(d.card)}" alt=""></div></div>` : ''}
  ${d.headline ? `<div class="hl" data-a="pop" style="--d:.12s">${rich(d.headline)}</div>` : ''}
  ${tagHtml(d)}${chipsHtml(d)}
  ${captionHtml(words(d))}
  ${vbar(brand)}
</div>`,
      };
    },
  },
];
