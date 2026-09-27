// رادار عروض الإعلانات (بيشتغل كل يوم على الكمبيوتر السحابي)
//   بيفتح صفحات العروض الرسمية لجوجل وتيك توك وسناب شات وميتا، ويطلّع الجمل اللي فيها رصيد/كوبون/عرض،
//   ويقارنها باليوم اللي قبله. أي تغيير = إنذار في لوحة فرح (الرئيسية ← رادار العروض).
//   النتيجة: <MEDIA_BUCKET>/private/ad-radar.json (مقفولة على الزوار، اللوحة بتقراها عن طريق /api/radar)
//   مفيش أي داتا موردين هنا — كله صفحات عامة.
import crypto from 'node:crypto';
import { getJsonFrom, putJsonTo } from './storage.mjs';

const MEDIA_BUCKET = (process.env.MEDIA_BUCKET || 'farah-media').trim();
const KEY = 'private/ad-radar.json';
const SOURCES = [
  { id: 'google-terms', platform: 'جوجل', name: 'شروط عرض رصيد جوجل للمعلنين الجداد', url: 'https://www.google.com/intl/en_us/ads/coupons/terms/cyoi/' },
  { id: 'google-help', platform: 'جوجل', name: 'صفحة العروض الترويجية في مساعدة جوجل', url: 'https://support.google.com/google-ads/answer/6388096?hl=en' },
  { id: 'tiktok-home', platform: 'تيك توك', name: 'صفحة تيك توك للأعمال', url: 'https://ads.tiktok.com/business/en/' },
  { id: 'tiktok-credits', platform: 'تيك توك', name: 'مساعدة تيك توك: رصيد الإعلانات', url: 'https://ads.tiktok.com/help/article/ad-credits?lang=en' },
  { id: 'snap-home', platform: 'سناب شات', name: 'صفحة سناب شات للأعمال', url: 'https://forbusiness.snapchat.com/' },
];
// ميتا مابتفتحش صفحاتها للسيرفرات — بيغطيها رادار Claude اليومي (بحث حقيقي على النت)
// جمل العروض: رصيد، كوبون، "اصرف كذا وخد كذا"
const OFFER = /(ad credit|free credit|credits? (to|when|worth)|coupon|promo(tional)? (offer|code|credit)|spend [$€£]?\s?\d|get [$€£]?\s?\d[\d,.]*\s?(in )?(ad )?credit|EGP\s?[\d,]+|[\d,]+\s?EGP|رصيد|كوبون|هدية|مجان)/i;

const text = html => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 12 && s.length < 400);

// جمل من JSON جوه الصفحة (تيك توك وسناب بيحطوا الكلام في سكريبت)
const jsonStrings = html => [...html.matchAll(/"([^"\\]{20,300}(?:credit|coupon)[^"\\]{0,200})"/gi)].map(m => m[1].replace(/\\u[\dA-Fa-f]{4}/g, ' ').replace(/\s+/g, ' ').trim());

async function scan(src) {
  try {
    const r = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const html = await r.text();
    if (!r.ok) return { ok: false, status: r.status, lines: [] };
    const lines = [...new Set([...text(html), ...jsonStrings(html)].filter(s => OFFER.test(s) && !/[{}<>]|_contentId|\w+:\w+,/.test(s)))].slice(0, 25);
    return { ok: true, status: r.status, lines };
  } catch (e) {
    return { ok: false, status: 0, error: e.message, lines: [] };
  }
}

// DRY=1 → تجربة من غير المخزن
const DRY = !!process.env.DRY;
const prev = DRY ? { sources: {}, alerts: [] } : await getJsonFrom(MEDIA_BUCKET, KEY, { sources: {}, alerts: [] });
const now = new Date().toISOString();
const out = { checkedAt: now, sources: {}, alerts: prev.alerts || [] };
for (const src of SOURCES) {
  const res = await scan(src);
  const hash = crypto.createHash('sha1').update(res.lines.join('\n')).digest('hex').slice(0, 12);
  const before = prev.sources?.[src.id];
  const added = res.ok ? res.lines.filter(l => !(before?.lines || []).includes(l)) : [];
  const changed = !!(res.ok && before && before.ok && before.hash !== hash && added.length);
  out.sources[src.id] = { ...src, ok: res.ok, status: res.status, error: res.error || '', hash, lines: res.lines, checkedAt: now, changedAt: changed ? now : before?.changedAt || '' };
  if (changed) out.alerts.unshift({ at: now, id: src.id, platform: src.platform, name: src.name, url: src.url, added: added.slice(0, 6) });
  console.log(`${res.ok ? '✓' : '✗'} ${src.platform} · ${src.name} — ${res.ok ? `${res.lines.length} جملة عروض${changed ? ` · 🔔 اتغيرت (${added.length} جديد)` : before ? '' : ' (أول مرة)'}` : `مقدرناش نفتحها (${res.status || res.error})`}`);
}
out.alerts = out.alerts.slice(0, 40);
if (DRY) { for (const x of Object.values(out.sources)) console.log('  ' + x.id + ':', x.lines.slice(0, 3).join(' ‖ ')); } else await putJsonTo(MEDIA_BUCKET, KEY, out);
console.log(`✅ الرادار خلص · إنذارات محفوظة ${out.alerts.length}`);
