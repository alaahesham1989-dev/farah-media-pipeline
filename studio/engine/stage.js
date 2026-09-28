// المسرح: بياخد «أمر تصميم» ويرسمه. نفس الكود ده بيشتغل في اللوحة (معاينة) وفي الرسم النهائي (سكرين شوت).
//   أمر التصميم = { template, skin, format, data: {...}, transparent?, dur? }
import { TEMPLATES, templateById } from './templates/index.js';
import { skinById, skinStyle } from './skins.js';
import { FORMATS } from './formats.js';
import { esc } from './parts.js';

let BRAND = null;
export async function getBrand() {
  if (!BRAND) BRAND = await (await fetch('/brand/brand.json')).json();
  return BRAND;
}

const FONT_PROBES = ['800 40px Alexandria', '700 40px Alexandria', '500 40px Alexandria', '700 40px "El Messiri"', '500 40px "IBM Plex Sans Arabic"',
  '700 40px "IBM Plex Sans Arabic"', '400 40px Lalezar', '700 40px "Reem Kufi"', '700 40px "JetBrains Mono"', '700 40px Cairo'];

export async function mount(job, { el = document.getElementById('stage'), mode = 'static' } = {}) {
  const brand = await getBrand();
  const tpl = templateById(job.template);
  if (!tpl) throw new Error('قالب مش موجود: ' + job.template);
  const skin = skinById(job.skin);
  const fmt = FORMATS[job.format] ? job.format : 'portrait';
  const data = { ...(tpl.defaults || {}), ...(job.data || {}) };
  const ctx = { data, fmt, brand, skin, W: FORMATS[fmt].W, H: FORMATS[fmt].H };
  const { html, css } = tpl.render(ctx);
  el.innerHTML = `<style>${css}</style>${html}`;
  const cv = el.querySelector('.cv');
  cv.classList.add('f-' + fmt, mode);
  cv.setAttribute('style', (cv.getAttribute('style') || '') + ';' + skinStyle(skin));
  if (job.transparent) cv.classList.add('transparent');
  if (job.dur) cv.style.setProperty('--dur', job.dur + 's');
  if (skin.decor && job.decor !== false && !tpl.noDecor && !job.transparent) {
    const dec = document.createElement('div');
    dec.className = 'decor';
    dec.innerHTML = skin.decor(ctx.W, ctx.H);
    cv.prepend(dec);
  }
  if (fmt === 'story' && !tpl.noFooter && !job.transparent && job.footer !== false) {
    const f = document.createElement('div');
    f.className = 'story-foot';
    f.setAttribute('data-a', 'fade'); f.style.setProperty('--d', '1.1s');
    f.innerHTML = `<span class="ln"></span><span class="s1">${esc(data.strip ?? brand.strip ?? 'شحن لكل المحافظات • استبدال أو استرجاع خلال 14 يوم')}</span><span class="s2">${esc(brand.site)}</span>`;
    cv.appendChild(f);
  }
  await ready(cv);
  fit(cv);
  if (mode === 'anim') seek(0, cv); else live(cv, 1e9);
  return { W: ctx.W, H: ctx.H };
}

async function ready(cv) {
  void cv.offsetWidth;
  await Promise.all(FONT_PROBES.map(f => document.fonts.load(f, 'فرح ستور 0123').catch(() => {})));
  await document.fonts.ready;
  const imgs = [...cv.querySelectorAll('img')];
  await Promise.all(imgs.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
  await Promise.all(imgs.map(i => i.decode?.().catch(() => {})));
  await new Promise(r => { const m = new Image(); m.onload = m.onerror = r; m.src = '/brand/mark.png'; });
}

// النص الطويل بيصغر لوحده لحد ما يدخل في عدد السطور المسموح (data-fit="2")
export function fit(cv) {
  for (const el of cv.querySelectorAll('[data-fit]')) {
    const lines = Number(el.dataset.fit) || 1;
    let fs = parseFloat(getComputedStyle(el).fontSize);
    const min = fs * 0.5;
    const tooBig = () => el.scrollHeight > parseFloat(getComputedStyle(el).lineHeight) * lines + 6 || el.scrollWidth > el.clientWidth + 2;
    while (tooBig() && fs > min) { fs -= 2; el.style.fontSize = fs + 'px'; }
  }
}

// الفيديو: بنوقف كل الحركات ونروح للحظة t بالظبط (عشان كل فريم يطلع مظبوط)
export function seek(t, cv = document.querySelector('.cv')) {
  for (const a of cv.getAnimations({ subtree: true })) { a.pause(); a.currentTime = t * 1000; }
  live(cv, t);
}

// الحاجات اللي بتتغير مع الوقت ومش CSS: الكلام كلمة كلمة مع الصوت، والعداد بتاع السعر
export function live(cv, t) {
  for (const el of cv.querySelectorAll('[data-words]')) {
    const ws = JSON.parse(el.dataset.words);
    let cur = -1;
    for (let i = 0; i < ws.length; i++) if (t >= ws[i].t0) cur = i;
    const chunk = cur < 0 ? -1 : ws[cur].c;
    el.querySelectorAll('span[data-i]').forEach(sp => {
      const i = +sp.dataset.i;
      sp.style.display = ws[i].c === chunk ? '' : 'none';
      sp.classList.toggle('on', i <= cur);
      sp.classList.toggle('now', i === cur && t <= ws[i].t1 + 0.25);
    });
    el.style.visibility = chunk < 0 ? 'hidden' : 'visible';
  }
  for (const el of cv.querySelectorAll('[data-count]')) {
    // data-from: العداد بيبدأ منين (زي السعر القديم وينزل للجديد) — من غيره بيبدأ من صفر
    const to = +el.dataset.to, from = +(el.dataset.from || 0), t0 = +el.dataset.t0, t1 = +el.dataset.t1;
    const p = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US');
  }
}

export { TEMPLATES, FORMATS };
