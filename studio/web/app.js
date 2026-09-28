// لوحة الاستوديو التجريبية — بتبني «أمر التصميم» وتعاينه وتصدّره. مابتلمسش المتجر.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (u, body) => {
  const r = await fetch(u, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 3200);
}

const S = { type: 'product', template: 'product-bar', skin: 'farah', format: 'portrait', productId: '', imageIndex: 0, offerId: '', fit: false, over: {} };
let META, STORE;

// ── الخانات لكل نوع (اللي فاضي بياخد القيمة الأوتوماتيك من المتجر) ──
const F = {
  name: { label: 'اسم المنتج' }, sub: { label: 'السطر الصغير', hint: 'ميزة واحدة قصيرة' }, price: { label: 'السعر', type: 'number' },
  oldPrice: { label: 'السعر قبل الخصم', type: 'number' }, percent: { label: 'نسبة الخصم %', type: 'number', hint: 'فاضية = بتتحسب من السعرين' },
  endsAt: { label: 'آخر يوم', type: 'date' }, startsAt: { label: 'أول يوم', type: 'date' }, headline: { label: 'الجملة الكبيرة', type: 'area', hint: 'حط **كلمة** بين نجمتين عشان تبقى دهبي' },
  cta: { label: 'زرار الطلب', hint: 'افتراضي: اطلب دلوقتي' }, showName: { label: 'يظهر الاسم', type: 'bool' }, showPrice: { label: 'يظهر السعر', type: 'bool' },
  season: { label: 'اسم الموسم', hint: 'فاضي = اسم الموسم المختار. اكتب - عشان يختفي' },
  code: { label: 'كود الكوبون' }, ctype: { label: 'نوع الكوبون', type: 'select', opts: [['amount', 'مبلغ'], ['percent', 'نسبة %'], ['free_shipping', 'شحن مجاني']] },
  value: { label: 'القيمة', type: 'number' }, maxDiscount: { label: 'أقصى خصم (للنسبة)', type: 'number' }, minSubtotal: { label: 'أقل طلب', type: 'number' },
  minQty: { label: 'عدد القطع', type: 'number' }, reward: { label: 'المكافأة', type: 'select', opts: [['amount', 'توفير مبلغ'], ['percent', 'خصم %'], ['gift', 'هدية']] },
  title: { label: 'اسم الموسم الكبير' }, kicker: { label: 'سطر فوق العنوان' }, category: { label: 'القسم' }, index: { label: 'رقمه', type: 'number' }, total: { label: 'من كام', type: 'number' },
  note: { label: 'ملاحظة صغيرة' }, qr: { label: 'كود QR للموقع', type: 'bool' }, text: { label: 'الكلام', type: 'area' },
  pos: { label: 'مكانه', type: 'select', opts: [['bottom', 'تحت'], ['center', 'النص'], ['top', 'فوق']] },
  move: { label: 'حركة الكاميرا', type: 'select', opts: [['orbit', 'لفّة حوالين المنتج'], ['snap', 'زووم خاطف'], ['punch', 'زووم على جزء'], ['pan', 'تحريك'], ['dolly', 'رجوع لورا'], ['float', 'طفو']] },
  ox: { label: 'مكان الزووم يمين/شمال %', type: 'number', hint: 'للزووم على جزء: 0 = الشمال · 100 = اليمين' }, oy: { label: 'مكان الزووم فوق/تحت %', type: 'number' },
  badge: { label: 'الشارة تحت السعر' }, label1: { label: 'كلمة الصورة الأولى' }, label2: { label: 'كلمة الصورة التانية' },
};
const TYPE_FIELDS = {
  product: ['name', 'sub', 'price', 'oldPrice', 'cta', 'showName', 'showPrice', 'season'],
  sale: ['headline', 'name', 'sub', 'price', 'oldPrice', 'percent', 'endsAt', 'season'],
  coupon: ['code', 'ctype', 'value', 'maxDiscount', 'minSubtotal', 'endsAt', 'headline', 'season'],
  video: ['headline', 'move', 'ox', 'oy'],
};
const TPL_FIELDS = {
  'sale-bundle': ['headline', 'name', 'minQty', 'reward', 'value', 'endsAt', 'sub', 'season'],
  'brand-hook': ['headline', 'sub'], 'brand-trust': ['headline'], 'brand-steps': ['headline'],
  'brand-product': ['name', 'category', 'price', 'oldPrice', 'index', 'total', 'season'], 'brand-cta': ['cta', 'note', 'qr'],
  'brand-season': ['title', 'kicker', 'headline', 'startsAt', 'endsAt'], 'brand-caption': ['text', 'pos'],
  'v-price': ['price', 'oldPrice', 'badge'], 'v-split': ['headline', 'label1', 'label2'], 'v-overlay': ['headline'],
};
const fieldsFor = () => TPL_FIELDS[S.template] || TYPE_FIELDS[S.type] || [];

const product = () => STORE?.products.find(p => p.id === S.productId);
const offer = () => STORE?.offers.find(o => o.id === S.offerId);
const inDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function offerPrice(o, regular) {
  const v = Number(o?.value) || 0;
  if (o.discountType === 'percent') return Math.round(regular * (1 - Math.min(v, 90) / 100));
  if (o.discountType === 'amount') return Math.max(0, Math.round(regular - v));
  if (o.discountType === 'price') return Math.round(v);
  return null;
}

// القيم الأوتوماتيك (صفر توكن)
function autoData() {
  const p = product();
  const d = {};
  if (p) Object.assign(d, { id: p.id, name: p.name, sub: p.sub, price: p.price, oldPrice: p.oldPrice || '', image: p.images[S.imageIndex] || p.images[0], category: p.category });
  const o = offer();
  if (o && S.type === 'sale') {
    d.endsAt = (o.endsAt || '').slice(0, 10);
    if (o.kind === 'cart') Object.assign(d, { minQty: o.minQty, reward: o.reward, value: o.value });
    else if (p) { const np = offerPrice(o, p.price); if (np != null && np < p.price) { d.oldPrice = p.price; d.price = np; } }
  }
  if (S.type === 'coupon') Object.assign(d, { code: 'FARAH50', ctype: 'amount', value: 50, minSubtotal: 400, endsAt: inDays(14) });
  if (S.template === 'brand-trust' && STORE?.shipping) Object.assign(d, { freeShipping: STORE.shipping.freeShipping, freeShippingFar: STORE.shipping.freeShippingFar });
  if (S.template === 'brand-season') Object.assign(d, { startsAt: inDays(50), endsAt: inDays(60), headline: 'خصومات لحد **40%**' });
  if (S.template === 'brand-caption') d.text = p?.sub || 'اكتب الجملة هنا';
  if (S.template === 'brand-hook' && p) d.image = '';
  return d;
}

function buildData() {
  const d = { ...autoData() };
  for (const [k, v] of Object.entries(S.over)) if (v !== '' && v != null) d[k] = v;
  if (d.ctype) { d.type = d.ctype; delete d.ctype; }
  if (d.season === '-') d.season = '';
  if (S.fit) d.fit = 'contain';
  for (const k of ['price', 'oldPrice', 'percent', 'value', 'maxDiscount', 'minSubtotal', 'minQty', 'index', 'total', 'ox', 'oy']) if (d[k] !== undefined && d[k] !== '') d[k] = Number(d[k]);
  if (S.template === 'brand-product' && d.index == null) { d.index = 1; d.total = 8; }
  if (S.template === 'brand-hook' && S.over.useImage) d.image = product()?.images[S.imageIndex];
  return d;
}
const job = (over = {}) => ({ template: S.template, skin: S.skin, format: S.format, data: buildData(), ...over });
// أمر التصميم المختصر (اللي بيتبعت للكمبيوتر السحابي أو بيكتبه الذكاء الاصطناعي)
function shortJob() {
  const o = { template: S.template, skin: S.skin, formats: [S.format] };
  if (S.productId && S.type !== 'coupon') o.product = S.productId;
  if (S.offerId && S.type === 'sale') o.offer = S.offerId;
  const data = Object.fromEntries(Object.entries(S.over).filter(([, v]) => v !== '' && v != null));
  if (data.ctype) { data.type = data.ctype; delete data.ctype; }
  if (S.imageIndex) o.imageIndex = S.imageIndex;
  if (S.fit) data.fit = 'contain';
  if (S.type === 'coupon') Object.assign(data, { code: buildData().code, type: buildData().type, value: buildData().value, minSubtotal: buildData().minSubtotal, endsAt: buildData().endsAt, ...data });
  if (Object.keys(data).length) o.data = data;
  return o;
}

// ── الرسم على الشاشة ──
function renderTypes() {
  $('#types').innerHTML = META.types.map(t => `<button data-t="${t.id}" class="${t.id === S.type ? 'on' : ''}">${esc(t.name)}</button>`).join('');
  const tpls = META.templates.filter(t => t.type === S.type);
  if (!tpls.some(t => t.id === S.template)) S.template = tpls[0].id;
  $('#templates').innerHTML = tpls.map(t => `<button data-tpl="${t.id}" class="${t.id === S.template ? 'on' : ''}"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('');
  $$('[data-for]').forEach(g => (g.hidden = !g.dataset.for.split(' ').includes(S.type)));
}
const swatchHtml = (sel, cur) => META.skins.map(s => `<button data-skin="${s.id}" class="${s.id === cur ? 'on' : ''}" title="${esc(s.name)}"><i>${s.swatch.map(c => `<s style="background:${c}"></s>`).join('')}</i>${esc(s.name.replace('فرح — ', ''))}</button>`).join('');
function renderSkins() { $('#skins').innerHTML = swatchHtml('#skins', S.skin); }
function renderFormats() { $('#formats').innerHTML = Object.entries(META.formats).map(([k, f]) => `<button data-fmt="${k}" class="${k === S.format ? 'on' : ''}">${esc(f.name)}</button>`).join(''); }

function renderProducts() {
  const q = ($('#q').value || '').trim();
  const list = STORE.products.filter(p => !q || p.name.includes(q) || p.id.includes(q));
  $('#product').innerHTML = list.map(p => `<option value="${p.id}" ${p.id === S.productId ? 'selected' : ''}>${esc(p.name)} — ${p.price} ج (${p.id})</option>`).join('');
  if (!list.some(p => p.id === S.productId) && list[0]) { S.productId = list[0].id; S.imageIndex = 0; }
  renderImages();
}
function renderImages() {
  const p = product();
  $('#images').innerHTML = (p?.images || []).map((u, i) => `<img src="${esc(u)}" data-img="${i}" class="${i === S.imageIndex ? 'on' : ''}" loading="lazy" alt="">`).join('');
}
function renderOffers() {
  $('#offer').innerHTML = '<option value="">— من غير عرض —</option>' + STORE.offers.map(o => `<option value="${o.id}" ${o.id === S.offerId ? 'selected' : ''}>${esc(o.title)}${o.status !== 'active' ? ' (موقوف)' : ''}</option>`).join('');
}
function renderFields() {
  const auto = autoData();
  $('#fields').innerHTML = '<label>الكلام والأرقام <small>(الرمادي = أوتوماتيك من المتجر)</small></label>' + fieldsFor().map(k => {
    const f = F[k]; const v = S.over[k] ?? ''; const ph = esc(auto[k] ?? (k === 'season' ? (META.skins.find(s => s.id === S.skin)?.label || '') : ''));
    let input;
    if (f.type === 'bool') { const on = S.over[k] ?? (auto[k] ?? (META.templates.find(t => t.id === S.template)?.defaults?.[k] ?? true)); input = `<label class="chk"><input type="checkbox" data-k="${k}" ${on ? 'checked' : ''}> ${esc(f.label)}</label>`; return `<div class="fld"><span></span>${input}</div>`; }
    if (f.type === 'select') input = `<select data-k="${k}">${f.opts.map(([val, t]) => `<option value="${val}" ${(v || auto[k]) === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    else if (f.type === 'area') input = `<textarea data-k="${k}" placeholder="${ph}">${esc(v)}</textarea>`;
    else input = `<input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" data-k="${k}" value="${esc(v)}" placeholder="${ph}">`;
    return `<div class="fld"><label>${esc(f.label)}</label>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
  }).join('') + (S.template === 'brand-hook' ? `<div class="fld"><span></span><label class="chk"><input type="checkbox" data-k="useImage" ${S.over.useImage ? 'checked' : ''}> صورة المنتج في الخلفية</label></div>` : '');
}

// ── المعاينة ──
const frame = $('#stage');
let seq = 0, stageReady = false, pending = null;
window.addEventListener('message', e => {
  if (e.data?.kind === 'stage-ready') { stageReady = true; if (pending) preview(); }
  if (e.data?.kind === 'error') toast('المعاينة: ' + e.data.message, true);
});
function fitFrame() {
  const f = META.formats[S.format];
  const wrap = $('#frameWrap');
  const w = wrap.clientWidth;
  const maxH = window.innerHeight * (window.innerWidth < 900 ? .62 : .78);
  const scale = Math.min(w / f.W, maxH / f.H);
  frame.style.width = f.W + 'px'; frame.style.height = f.H + 'px';
  frame.style.transform = `scale(${scale})`;
  frame.style.right = Math.max(0, (w - f.W * scale) / 2) + 'px';
  wrap.style.height = f.H * scale + 'px';
  $('#pvInfo').textContent = `${META.templates.find(t => t.id === S.template)?.name} · ${META.skins.find(s => s.id === S.skin)?.name} · ${f.name} (${f.W}×${f.H})`;
}
let pvTimer;
function preview() {
  if (!stageReady) { pending = true; return; }
  pending = false;
  clearTimeout(pvTimer);
  pvTimer = setTimeout(() => { fitFrame(); frame.contentWindow.postMessage({ kind: 'job', job: job(), seq: ++seq, mode: 'static' }, '*'); }, 120);
}
function refreshAll() { renderTypes(); renderSkins(); renderFormats(); renderFields(); preview(); }

// ── الأحداث ──
document.addEventListener('click', e => {
  const b = e.target.closest('button, img[data-img]');
  if (!b) return;
  if (b.dataset.tab) { $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab)); if (b.dataset.tab === 'gallery') loadGallery(); if (b.dataset.tab === 'rules') loadRules(); if (b.dataset.tab === 'image') preview(); }
  else if (b.dataset.t) { S.type = b.dataset.t; S.over = {}; refreshAll(); }
  else if (b.dataset.tpl) { S.template = b.dataset.tpl; S.over = Object.fromEntries(Object.entries(S.over).filter(([k]) => fieldsFor().includes(k))); refreshAll(); }
  else if (b.dataset.skin && b.closest('#skins')) { S.skin = b.dataset.skin; renderSkins(); renderFields(); preview(); }
  else if (b.dataset.fmt) { S.format = b.dataset.fmt; renderFormats(); preview(); }
  else if (b.dataset.img) { S.imageIndex = Number(b.dataset.img); renderImages(); preview(); }
});
$('#fields').addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  S.over[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  preview();
});
$('#q').addEventListener('input', () => { renderProducts(); renderFields(); preview(); });
$('#product').addEventListener('change', e => { S.productId = e.target.value; S.imageIndex = 0; renderImages(); renderFields(); preview(); });
$('#offer').addEventListener('change', e => { S.offerId = e.target.value; renderFields(); preview(); });
$('#fitContain').addEventListener('change', e => { S.fit = e.target.checked; preview(); });
$('#play').addEventListener('click', () => { frame.contentWindow.postMessage({ kind: 'job', job: job(), seq: ++seq, mode: 'anim' }, '*'); setTimeout(() => frame.contentWindow.postMessage({ kind: 'play' }, '*'), 400); });
window.addEventListener('resize', () => fitFrame());

async function busy(btn, fn) {
  btn.disabled = true; const t = btn.textContent; btn.textContent = '⏳ ثانية…';
  try { await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; btn.textContent = t; }
}
const showFiles = (files, sheet) => {
  $('#results').innerHTML = (sheet ? `<a class="wide" href="${sheet}" target="_blank"><img src="${sheet}?v=${Date.now()}"><span>${sheet.split('/').pop()}</span></a>` : '')
    + files.map(u => `<a href="${u}" target="_blank" download><img src="${u}?v=${Date.now()}"><span>${u.split('/').pop()}</span></a>`).join('');
};
$('#exportOne').onclick = e => busy(e.target, async () => { const r = await api('/api/render', { job: job() }); showFiles(r.files); toast('✅ اتصدرت'); });
$('#exportAll').onclick = e => busy(e.target, async () => { const r = await api('/api/render', { job: job(), formats: ['square', 'portrait', 'story'] }); showFiles(r.files); toast('✅ 3 مقاسات'); });
$('#sheetType').onclick = e => busy(e.target, async () => {
  const jobs = META.templates.filter(t => t.type === S.type).map(t => ({ template: t.id, skin: S.skin, format: S.format, data: buildData(), name: `${t.id}-${S.skin}` }));
  const r = await api('/api/sheet', { jobs, cols: Math.min(jobs.length, 4) }); showFiles(r.files, r.sheet);
});
$('#sheetSkins').onclick = e => busy(e.target, async () => {
  const jobs = META.skins.map(s => ({ template: S.template, skin: s.id, format: S.format, data: buildData(), name: `${S.template}-${s.id}` }));
  const r = await api('/api/sheet', { jobs, cols: 4 }); showFiles(r.files, r.sheet);
});
$('#copyJob').onclick = async () => {
  const t = JSON.stringify(shortJob(), null, 2);
  try { await navigator.clipboard.writeText(t); toast('📋 اتنسخ أمر التصميم'); } catch { prompt('انسخ أمر التصميم:', t); }
};

// ── اقتراح جمل (توكن قليل، ولو مفيش مفتاح: من ملف التسويق وبنك الجمل ببلاش) ──
$('#aiSuggest').onclick = e => busy(e.target, async () => {
  if (!S.productId) throw new Error('اختار منتج الأول');
  const r = await api('/api/ai/copy', { ids: [S.productId], slots: { headline: 30, sub: 40, hook: 60 } });
  const x = r.result[S.productId] || {};
  const src = { gemini: 'جيميناي', openrouter: 'أوبن راوتر', bank: 'بنك الجمل (ببلاش)', mock: 'تجربة' };
  const rows = ['headline', 'sub', 'hook'].filter(k => x[k]).map(k => `<button data-ai-k="${k === 'hook' ? 'headline' : k}" data-ai-v="${esc(x[k])}">${esc(x[k])}<small>${k === 'sub' ? 'سطر صغير' : k === 'hook' ? 'هوك' : 'جملة كبيرة'} · ${src[x.source?.[k]] || x.source?.[k] || ''}${x.cached ? ' · محفوظة' : ''}</small></button>`).join('');
  const rej = Object.entries(x.source || {}).filter(([k]) => k.endsWith('Rejected')).map(([, v]) => `<div class="why">اترفضت: ${esc(v)}</div>`).join('');
  $('#aiBox').hidden = false;
  $('#aiBox').innerHTML = `<b>اقتراحات — المصدر: ${esc(src[r.info.provider] || r.info.provider)}${r.info.provider !== 'bank' ? ' (' + esc(r.info.model) + ')' : ''}</b><div class="opts">${rows || 'مفيش اقتراحات'}</div>${rej}${r.log.length ? `<small>${esc(r.log.join(' · '))}</small>` : ''}`;
});
$('#aiBox').addEventListener('click', e => {
  const b = e.target.closest('[data-ai-k]'); if (!b) return;
  const k = b.dataset.aiK;
  if (!fieldsFor().includes(k)) { toast('الشكل ده مالوش خانة للجملة دي'); return; }
  S.over[k] = b.dataset.aiV; renderFields(); preview();
});

// ── المعرض والقواعد ──
async function loadGallery() {
  const list = await api('/api/outputs');
  $('#gallery').innerHTML = list.map(f => `<a href="${f.url}" target="_blank">${/\.mp4$/i.test(f.name) ? `<video src="${f.url}" muted preload="metadata"></video>` : `<img src="${f.url}" loading="lazy">`}<span>${esc(f.dir)}/${esc(f.name)}</span></a>`).join('') || '<p>لسه مفيش حاجة اتعملت.</p>';
}
$('#refreshGallery').onclick = loadGallery;
function md(s) {
  const inline = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; const lines = s.split('\n'); let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) { const b = []; i++; while (i < lines.length && !lines[i].startsWith('```')) b.push(lines[i++]); out.push(`<pre><code>${esc(b.join('\n'))}</code></pre>`); i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]); const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      out.push('<table>' + rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map((r, k) => `<tr>${cells(r).map(c => k ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join('')}</tr>`).join('') + '</table>'); continue; }
    const h = /^(#{1,3}) (.*)/.exec(l);
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (/^\s*[-*] /.test(l)) { const it = []; while (i < lines.length && /^\s*[-*] /.test(lines[i])) it.push(`<li>${inline(lines[i++].replace(/^\s*[-*] /, ''))}</li>`); out.push(`<ul>${it.join('')}</ul>`); continue; }
    else if (/^\d+\. /.test(l)) { const it = []; while (i < lines.length && /^\d+\. /.test(lines[i])) it.push(`<li>${inline(lines[i++].replace(/^\d+\. /, ''))}</li>`); out.push(`<ol>${it.join('')}</ol>`); continue; }
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    i++;
  }
  return out.join('\n');
}
async function loadRules() { const r = await fetch('/api/doc?name=RULES'); $('#rules').innerHTML = r.ok ? md(await r.text()) : 'ملف القواعد مش موجود'; }

// ── الفيديو ──
const V = { preset: '', skin: 'farah', over: {} };
let PRESETS = [];
async function initVideo() {
  try { PRESETS = (await api('/api/video/presets')).presets; } catch { $('#presets').innerHTML = '<p class="note">محرك الفيديو مش شغال.</p>'; return; }
  V.preset = PRESETS[0]?.id;
  renderVideo();
}
function renderVideo() {
  $('#presets').innerHTML = PRESETS.map(p => `<button data-preset="${p.id}" class="${p.id === V.preset ? 'on' : ''}"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join('');
  $('#vskins').innerHTML = swatchHtml('#vskins', V.skin);
  const p = PRESETS.find(x => x.id === V.preset);
  $('#vfields').innerHTML = (p?.fields || []).length ? '<label>الإعدادات</label>' + p.fields.map(f => {
    if (f.type === 'product') return `<div class="fld"><label>${esc(f.label)}</label><select data-vk="${f.k}">${STORE.products.map(x => `<option value="${x.id}" ${V.over[f.k] === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
    if (f.type === 'select') return `<div class="fld"><label>${esc(f.label)}</label><select data-vk="${f.k}">${f.opts.map(([v, t]) => `<option value="${v}" ${V.over[f.k] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
    if (f.type === 'offer') return `<div class="fld"><label>${esc(f.label)}</label><select data-vk="${f.k}"><option value="">—</option>${STORE.offers.map(o => `<option value="${o.id}" ${V.over[f.k] === o.id ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></div>`;
    return `<div class="fld"><label>${esc(f.label)}</label><input type="${f.type || 'text'}" data-vk="${f.k}" value="${esc(V.over[f.k] ?? '')}" placeholder="${esc(f.ph ?? '')}"></div>`;
  }).join('') : '';
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-preset], #vskins [data-skin]');
  if (!b) return;
  if (b.dataset.preset) { V.preset = b.dataset.preset; V.over = {}; }
  else V.skin = b.dataset.skin;
  renderVideo();
});
$('#vfields').addEventListener('input', e => { const k = e.target.dataset.vk; if (k) V.over[k] = e.target.value; });
$('#vfields').addEventListener('change', e => { const k = e.target.dataset.vk; if (k) V.over[k] = e.target.value; });
$('#makeVideo').onclick = e => busy(e.target, async () => {
  $('#vlog').textContent = 'بنجهز…';
  const p = PRESETS.find(x => x.id === V.preset);
  for (const f of p?.fields || []) if (f.type === 'product' && !V.over[f.k]) V.over[f.k] = STORE.products[0]?.id;
  const { id } = await api('/api/video', { preset: V.preset, skin: V.skin, voice: $('#voice').value, params: V.over });
  for (;;) {
    await new Promise(r => setTimeout(r, 1500));
    const st = await api('/api/video/status?id=' + id);
    $('#vlog').textContent = st.log.join('\n');
    $('#vlog').scrollTop = 1e6;
    if (st.storyboard) $('#vstory').innerHTML = st.storyboard.scenes.map((s, i) => `<div><b>${i + 1} · ${esc(s.template || 'لقطة')}</b>${esc(s.say || s.data?.headline || s.data?.name || s.caption || '')}</div>`).join('');
    if (st.state === 'done') { $('#vplayer').src = st.file + '?v=' + Date.now(); $('#vInfo').textContent = st.file; toast('🎬 الفيديو جاهز'); break; }
    if (st.state === 'error') throw new Error(st.error);
  }
});

// ── البداية ──
(async () => {
  [META, STORE] = await Promise.all([api('/api/meta'), api('/api/store')]);
  S.productId = STORE.products.find(p => p.images.length > 1)?.id || STORE.products[0]?.id;
  renderProducts(); renderOffers(); refreshAll(); initVideo();
})().catch(e => toast('مقدرناش نحمّل: ' + e.message, true));
