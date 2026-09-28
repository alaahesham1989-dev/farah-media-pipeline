// السكينات = المواسم. كل سكين = ألوان + خطوط + زخرفة خفيفة + اسم الموسم.
// القالب مابيعرفش حاجة عن الموسم؛ بيستخدم المتغيرات بس، فأي قالب × أي سكين × أي مقاس.
// ضيف موسم جديد = انسخ سكين وغيّر الألوان والزخرفة. مفيش ولا توكن.

const GOLD_FOIL = 'linear-gradient(135deg, #F8E9B8 0%, #E2BE6A 30%, #C99A45 55%, #F1D68E 75%, #A87D2E 100%)';
const svg = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${body}</svg>`;

// نجمة n سنة (للعيد ورمضان والختم)
export function starPath(cx, cy, n, R, r, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (rot + (i * 180) / n) * Math.PI / 180, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
  }
  return d + 'Z';
}
// نقط/نجوم متوزعة بشكل ثابت (مش عشوائي عشان كل رندر يطلع زي التاني)
function scatter(W, H, n, seed, fn) {
  let s = seed, out = '';
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) out += fn(rnd() * W, rnd() * H, rnd(), i);
  return out;
}

export const SKINS = [
  {
    id: 'farah', name: 'فرح — كحلي ودهبي', label: '',
    vars: { 'foil-ink': '#0B1929', bg: '#0B1929', bg2: '#12263F', ink: '#FFFFFF', ink2: '#BBBFC3', acc: '#D4A853', 'acc-ink': '#0B1929',
      foil: GOLD_FOIL, sale: '#E5484D', old: '#8D99AB', line: 'rgba(212,168,83,.38)', card: '#F7F3EA', 'card-ink': '#0B1929', 'card-ink2': '#5E6B7C',
      photo: '#F4F1EA', glow: 'rgba(212,168,83,.14)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <circle cx="${W + 40}" cy="-40" r="330" fill="none" stroke="#D4A853" stroke-opacity=".22" stroke-width="2"/>
      <circle cx="${W + 40}" cy="-40" r="290" fill="none" stroke="#D4A853" stroke-opacity=".12" stroke-width="1.5"/>
      <circle cx="-60" cy="${H + 60}" r="300" fill="none" stroke="#D4A853" stroke-opacity=".16" stroke-width="2"/>`),
  },
  {
    id: 'farah-light', name: 'فرح — كريمي ودهبي', label: '',
    vars: { 'foil-ink': '#FFFFFF', bg: '#F7F3EA', bg2: '#EFE6D3', ink: '#0B1929', ink2: '#5E6B7C', acc: '#12263F', 'acc-ink': '#F0D78C',
      foil: 'linear-gradient(135deg, #D9B462 0%, #B98A36 45%, #8C6420 100%)', sale: '#B42318', old: '#8A8F98', line: 'rgba(154,116,40,.35)',
      card: '#FFFFFF', 'card-ink': '#0B1929', 'card-ink2': '#5E6B7C', photo: '#FFFFFF', glow: 'rgba(212,168,83,.18)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <circle cx="${W + 40}" cy="-40" r="330" fill="none" stroke="#B98A36" stroke-opacity=".30" stroke-width="2"/>
      <circle cx="${W + 40}" cy="-40" r="290" fill="none" stroke="#B98A36" stroke-opacity=".16" stroke-width="1.5"/>
      <circle cx="-60" cy="${H + 60}" r="300" fill="none" stroke="#B98A36" stroke-opacity=".22" stroke-width="2"/>`),
  },
  {
    id: 'white-friday', name: 'الجمعة البيضاء', label: 'الجمعة البيضاء',
    vars: { 'foil-ink': '#FFFFFF', bg: '#FFFFFF', bg2: '#F1F1EF', ink: '#111111', ink2: '#5B5B5B', acc: '#111111', 'acc-ink': '#FFFFFF',
      foil: 'linear-gradient(135deg, #111 0%, #3a3a3a 60%, #111 100%)', sale: '#D92D20', old: '#8A8A8A', line: 'rgba(0,0,0,.14)',
      card: '#111111', 'card-ink': '#FFFFFF', 'card-ink2': '#B8B8B8', photo: '#F4F4F2', glow: 'rgba(0,0,0,.05)',
      'mark-filter': 'brightness(0)', 'season-bg': '#D92D20', 'season-ink': '#FFFFFF' },
    decor: (W, H) => {
      const t = 'الجمعة البيضاء • WHITE FRIDAY • ';
      return svg(W, H, `
      <rect x="0" y="0" width="46" height="${H}" fill="#111"/>
      <text transform="translate(31 ${H / 2}) rotate(-90)" text-anchor="middle" font-family="Alexandria" font-weight="700" font-size="20" fill="#fff" letter-spacing="3">${t.repeat(Math.ceil(H / 380))}</text>
      <circle cx="-120" cy="${H - 120}" r="360" fill="none" stroke="#111" stroke-opacity=".08" stroke-width="2"/>
      <circle cx="-120" cy="${H - 120}" r="300" fill="none" stroke="#111" stroke-opacity=".05" stroke-width="2"/>`);
    },
  },
  {
    id: 'green-friday', name: 'الجمعة الخضراء', label: 'الجمعة الخضراء',
    vars: { 'foil-ink': '#0D3B2E', bg: '#0D3B2E', bg2: '#12503E', ink: '#FFFFFF', ink2: '#C2CECB', acc: '#C6E86B', 'acc-ink': '#0D3B2E',
      foil: 'linear-gradient(135deg, #E9F7B5 0%, #C6E86B 45%, #86B83A 100%)', sale: '#FF7A59', old: '#9DB8AE', line: 'rgba(198,232,107,.35)',
      card: '#F3F8EC', 'card-ink': '#0D3B2E', 'card-ink2': '#476B5E', photo: '#F3F6F1', glow: 'rgba(198,232,107,.14)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <path d="M${W} ${H * .12} C ${W * .72} ${H * .18}, ${W * .78} ${H * .42}, ${W} ${H * .5}" fill="none" stroke="#C6E86B" stroke-opacity=".25" stroke-width="3"/>
      <path d="M0 ${H * .7} C ${W * .25} ${H * .64}, ${W * .2} ${H * .9}, 0 ${H * .95}" fill="none" stroke="#C6E86B" stroke-opacity=".2" stroke-width="3"/>
      <ellipse cx="${W - 80}" cy="${H * .3}" rx="120" ry="44" transform="rotate(-35 ${W - 80} ${H * .3})" fill="#C6E86B" fill-opacity=".10"/>
      <ellipse cx="90" cy="${H * .8}" rx="110" ry="40" transform="rotate(30 90 ${H * .8})" fill="#C6E86B" fill-opacity=".08"/>`),
  },
  {
    id: 'dark-sale', name: 'أوكازيون غامق', label: 'أوكازيون',
    vars: { 'foil-ink': '#0A0A0B', bg: '#0A0A0B', bg2: '#18181B', ink: '#FFFFFF', ink2: '#B6B6B6', acc: '#FFD23F', 'acc-ink': '#0A0A0B',
      foil: 'linear-gradient(135deg, #FFF1A8 0%, #FFD23F 45%, #E8A317 100%)', sale: '#FF4D4D', old: '#8B8B90', line: 'rgba(255,210,63,.3)',
      card: '#18181B', 'card-ink': '#FFFFFF', 'card-ink2': '#BABABB', photo: '#F2F2F2', glow: 'rgba(255,210,63,.12)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <g stroke="#FFD23F" stroke-opacity=".10" stroke-width="18">${Array.from({ length: 9 }, (_, i) => `<line x1="${-200 + i * 180}" y1="${H + 40}" x2="${200 + i * 180}" y2="${H - 360}"/>`).join('')}</g>`),
  },
  {
    id: 'ramadan', name: 'رمضان', label: 'عروض رمضان',
    vars: { 'foil-ink': '#1A1446', bg: '#1A1446', bg2: '#271F63', ink: '#FFFFFF', ink2: '#C4C2CF', acc: '#E8B85A', 'acc-ink': '#1A1446',
      foil: GOLD_FOIL, sale: '#FF7A7A', old: '#A59FCC', line: 'rgba(232,184,90,.38)', card: '#FBF6EA', 'card-ink': '#1A1446', 'card-ink2': '#5B5480',
      photo: '#F7F3EA', glow: 'rgba(232,184,90,.14)', 'mark-filter': 'none' },
    decor: (W, H) => {
      const lantern = (x, len, s) => `<g transform="translate(${x} 0)" fill="none" stroke="#E8B85A" stroke-width="2.5" stroke-opacity=".75">
        <line x1="0" y1="0" x2="0" y2="${len}"/><g transform="translate(0 ${len}) scale(${s})">
        <path d="M-10 0 h20 l6 14 h-32z" fill="#E8B85A" fill-opacity=".85" stroke="none"/>
        <path d="M-26 14 h52 l-8 64 h-36z"/><path d="M-26 14 L0 46 L26 14 M-18 78 L0 46 L18 78"/>
        <path d="M-18 78 h36 l-6 12 h-24z" fill="#E8B85A" fill-opacity=".85" stroke="none"/><circle cx="0" cy="98" r="5" fill="#E8B85A" stroke="none"/></g></g>`;
      return svg(W, H, `
        ${lantern(110, 150, 1.35)}${lantern(210, 70, 1)}${lantern(W - 130, 110, 1.15)}
        <path d="M${W - 260} ${H * .16} a70 70 0 1 0 60 105 a56 56 0 1 1 -60 -105z" fill="#E8B85A" fill-opacity=".5"/>
        ${scatter(W, H, 26, 7, (x, y, r) => `<path d="${starPath(x, y, 4, 8 + r * 8, 2.5 + r * 2)}" fill="#E8B85A" fill-opacity="${(.18 + r * .3).toFixed(2)}"/>`)}`);
    },
  },
  {
    id: 'eid', name: 'العيد', label: 'عروض العيد',
    vars: { 'foil-ink': '#0E4A57', bg: '#0E4A57', bg2: '#135E6E', ink: '#FFFFFF', ink2: '#C5D4D7', acc: '#F2C14E', 'acc-ink': '#0E4A57',
      foil: 'linear-gradient(135deg, #FFF0B8 0%, #F2C14E 45%, #D18E1C 100%)', sale: '#FF8A65', old: '#9CC2C9', line: 'rgba(242,193,78,.38)',
      card: '#FFF8E8', 'card-ink': '#0E4A57', 'card-ink2': '#4F7780', photo: '#F6F4EE', glow: 'rgba(242,193,78,.14)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <path d="${starPath(W - 110, 150, 8, 120, 92, -90)}" fill="none" stroke="#F2C14E" stroke-opacity=".35" stroke-width="3"/>
      <path d="${starPath(W - 110, 150, 8, 70, 54, -67.5)}" fill="#F2C14E" fill-opacity=".12"/>
      <path d="${starPath(90, H - 150, 8, 100, 76, -90)}" fill="none" stroke="#F2C14E" stroke-opacity=".25" stroke-width="3"/>
      ${scatter(W, H, 34, 11, (x, y, r, i) => i % 3 ? `<circle cx="${x}" cy="${y}" r="${3 + r * 5}" fill="${i % 2 ? '#F2C14E' : '#FF8A65'}" fill-opacity=".35"/>`
        : `<rect x="${x}" y="${y}" width="${10 + r * 10}" height="5" rx="2.5" transform="rotate(${r * 180} ${x} ${y})" fill="#F2C14E" fill-opacity=".4"/>`)}`),
  },
  {
    id: 'mothers-day', name: 'عيد الأم', label: 'عيد الأم',
    vars: { 'foil-ink': '#FFFFFF', bg: '#F9E6E8', bg2: '#F2D0D6', ink: '#561A2C', ink2: '#8A4E5E', acc: '#8E2440', 'acc-ink': '#FFFFFF',
      foil: 'linear-gradient(135deg, #F4CDBF 0%, #D59A88 45%, #A8624F 100%)', sale: '#C2185B', old: '#A7828D', line: 'rgba(142,36,64,.22)',
      card: '#FFFFFF', 'card-ink': '#561A2C', 'card-ink2': '#8A4E5E', photo: '#FFFFFF', glow: 'rgba(213,154,136,.22)', 'mark-filter': 'none' },
    decor: (W, H) => {
      const flower = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#D59A88" fill-opacity="${o}">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-26" rx="16" ry="28" transform="rotate(${a})"/>`).join('')}<circle r="10" fill="#8E2440" fill-opacity="${o}"/></g>`;
      return svg(W, H, `${flower(W - 110, 120, 2.1, .35)}${flower(W - 250, 70, 1, .25)}${flower(100, H - 130, 1.8, .3)}${flower(240, H - 60, .9, .22)}`);
    },
  },
  {
    id: 'winter', name: 'الشتا', label: 'عروض الشتا',
    vars: { 'foil-ink': '#FFFFFF', bg: '#EAF2FA', bg2: '#D5E5F4', ink: '#0C2D4E', ink2: '#4A6580', acc: '#1D5C9C', 'acc-ink': '#FFFFFF',
      foil: 'linear-gradient(135deg, #4F8FD0 0%, #1D5C9C 50%, #0C2D4E 100%)', sale: '#D92D20', old: '#8196AB', line: 'rgba(29,92,156,.22)',
      card: '#FFFFFF', 'card-ink': '#0C2D4E', 'card-ink2': '#4A6580', photo: '#FFFFFF', glow: 'rgba(29,92,156,.08)', 'mark-filter': 'none' },
    decor: (W, H) => {
      const flake = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="#1D5C9C" stroke-opacity="${o}" stroke-width="3" stroke-linecap="round" fill="none">${[0, 60, 120].map(a => `<g transform="rotate(${a})"><line x1="0" y1="-40" x2="0" y2="40"/><path d="M-10 -30 L0 -20 L10 -30 M-10 30 L0 20 L10 30"/></g>`).join('')}</g>`;
      return svg(W, H, `${flake(W - 120, 130, 2, .3)}${flake(W - 270, 60, .9, .2)}${flake(110, H - 140, 1.6, .22)}${scatter(W, H, 30, 5, (x, y, r) => `<circle cx="${x}" cy="${y}" r="${2 + r * 4}" fill="#1D5C9C" fill-opacity="${(.08 + r * .12).toFixed(2)}"/>`)}`);
    },
  },
  {
    id: 'summer', name: 'الصيف', label: 'عروض الصيف',
    vars: { 'foil-ink': '#FFFFFF', bg: '#FFF3E3', bg2: '#FFE2BF', ink: '#0B3954', ink2: '#3D6680', acc: '#FF6B35', 'acc-ink': '#FFFFFF',
      foil: 'linear-gradient(135deg, #FFB347 0%, #FF6B35 55%, #E0482A 100%)', sale: '#D92D20', old: '#8AA2B2', line: 'rgba(11,57,84,.16)',
      card: '#FFFFFF', 'card-ink': '#0B3954', 'card-ink2': '#3D6680', photo: '#FFFFFF', glow: 'rgba(255,107,53,.12)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      <circle cx="${W - 120}" cy="120" r="150" fill="#FFB347" fill-opacity=".45"/>
      <circle cx="${W - 120}" cy="120" r="200" fill="none" stroke="#FFB347" stroke-opacity=".35" stroke-width="3" stroke-dasharray="4 18"/>
      ${[0, 1, 2].map(i => `<path d="M0 ${H - 60 - i * 34} ${Array.from({ length: 12 }, (_, k) => `q ${W / 24} ${k % 2 ? 18 : -18} ${W / 12} 0`).join(' ')}" fill="none" stroke="#0B3954" stroke-opacity="${.12 - i * .03}" stroke-width="4"/>`).join('')}`),
  },
  {
    id: 'back-to-school', name: 'المدارس', label: 'عروض المدارس',
    vars: { 'foil-ink': '#FFE066', bg: '#FFF8DA', bg2: '#FFE98A', ink: '#13315C', ink2: '#48618A', acc: '#13315C', 'acc-ink': '#FFE066',
      foil: 'linear-gradient(135deg, #2A5298 0%, #13315C 100%)', sale: '#D92D20', old: '#8C95A8', line: 'rgba(19,49,92,.18)',
      card: '#FFFFFF', 'card-ink': '#13315C', 'card-ink2': '#48618A', photo: '#FFFFFF', glow: 'rgba(255,224,102,.4)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, `
      ${Array.from({ length: Math.ceil(H / 56) }, (_, i) => `<line x1="0" y1="${40 + i * 56}" x2="${W}" y2="${40 + i * 56}" stroke="#13315C" stroke-opacity=".07" stroke-width="2"/>`).join('')}
      <line x1="${W - 90}" y1="0" x2="${W - 90}" y2="${H}" stroke="#D92D20" stroke-opacity=".25" stroke-width="3"/>`),
  },
  {
    id: 'new-year', name: 'راس السنة', label: 'عروض راس السنة',
    vars: { 'foil-ink': '#0D0D1A', bg: '#0D0D1A', bg2: '#1C1C33', ink: '#FFFFFF', ink2: '#BBBBBF', acc: '#E9C46A', 'acc-ink': '#0D0D1A',
      foil: GOLD_FOIL, sale: '#FF6B6B', old: '#8E8EA8', line: 'rgba(233,196,106,.32)', card: '#FBF6EA', 'card-ink': '#0D0D1A', 'card-ink2': '#5C5C74',
      photo: '#F4F1EA', glow: 'rgba(233,196,106,.13)', 'mark-filter': 'none' },
    decor: (W, H) => svg(W, H, scatter(W, H, 40, 3, (x, y, r, i) => i % 4 === 0
      ? `<path d="${starPath(x, y, 4, 14 + r * 14, 3)}" fill="#E9C46A" fill-opacity="${(.35 + r * .4).toFixed(2)}"/>`
      : `<circle cx="${x}" cy="${y}" r="${1.5 + r * 3.5}" fill="#E9C46A" fill-opacity="${(.2 + r * .35).toFixed(2)}"/>`)),
  },
];

export const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];
export function skinStyle(s) {
  return Object.entries(s.vars).map(([k, v]) => `--${k}:${v}`).join(';');
}
