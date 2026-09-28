// المحوّل: سكريبت فيديو من ملف التسويق (kit) → سيناريو (storyboard) للمحرك — صفر توكن.
// كل فيديو بيتبني على «زاوية تسويق» مختلفة من الـ5 اللي في الملف: الافتتاحية والرسالة والنهاية بتتغير حسب الزاوية.
//   buildKitStoryboard(product, kit, { length: 15|30|60, angle: 0..4 })
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';

export const KITS_DIR = path.resolve(ROOT, '..', 'catalog', 'content', 'kits');
export const readKit = code => { try { return JSON.parse(fs.readFileSync(path.join(KITS_DIR, code + '.json'), 'utf8')); } catch { return null; } };

const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;
// الدفع عند الاستلام مش متاح في 13 محافظة → بيتشال من الكلام. واسم المتجر الرسمي «فرح مصر».
export function cleanLine(s) {
  return String(s || '')
    .replace(EMOJI, '')
    .replace(/[،,•\-–]?\s*و?الدفع عند الاستلام/g, '')
    .replace(/متجر فرح(?! مصر)/g, 'فرح مصر')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([،.؟!])/g, '$1')
    .replace(/^[\s•،\-–]+|[\s•،\-–]+$/g, '')
    .trim();
}
// عنوان قصير على الشاشة، وآخر كلمة دهبي
function headline(s, max = 30) {
  let t = cleanLine(s).replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').replace(/[.!]+$/, '');
  if (t.length > max) t = t.split(/…|\.\.\./)[0].trim();
  if (t.length > max) t = t.split(/[،:—-]/)[0].trim();
  if (t.length > max) t = t.split(/\s+/).slice(0, 4).join(' ');
  const w = t.split(/\s+/);
  if (w.length > 1) w[w.length - 1] = `**${w[w.length - 1]}**`;
  return w.join(' ');
}
const firstSentence = s => cleanLine(s).split(/(?<=[.!؟])\s+/)[0];
// رسالة الزاوية أحياناً مكتوبة كتعليمات للمصوّر/المسوّق مش كلام للزبون — دي مابتتقالش
const isDirection = s => /خلي(ها|ه|هم)?\s|لقطة|المحتوى|الإعلان|اعرض|ركّز|ركز|صوّر|المشاهد|الفيديو|تيك توك|فيسبوك|ريلز/.test(String(s || ''));

const MOVES = ['orbit', 'punch', 'pan', 'dolly', 'float'];
const TRANS = ['smoothleft', 'zoomin', 'hblur', 'slideleft', 'smoothright'];

export async function mediaAvailable(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

export async function buildKitStoryboard(p, kit, { length = 15, angle = 0, voice = { name: 'ar-EG-SalmaNeural', rate: '+12%' }, skin = 'farah', site = 'https://farahegypt.com' } = {}) {
  const script = kit.videoScripts.find(v => v.length === length) || kit.videoScripts[0];
  const ang = kit.angles?.[angle % (kit.angles?.length || 1)] || null;
  const hooks = kit.hooks || [];
  // الهوكات اللي فيها أرقام أسعار بنسيبها (السعر ممكن يكون اتغير من وقت ما الملف اتكتب)؛ السعر الحقيقي بييجي من المتجر في مشهد السعر
  const safeHooks = hooks.filter(h => !/\d+\s*(ج|جنيه)|بدل\s*\d/.test(h.text));
  const hook = safeHooks[(angle * 2) % Math.max(1, safeHooks.length)] || null;
  const imgs = p.images || [];
  let imgIdx = 0;
  const nextImage = () => (imgs.length ? imgs[(imgIdx++) % imgs.length] : '');
  const clipUrl = async key => {
    if (key === 'real' && p.video) return p.video;
    if (/^clip\d$/.test(key)) { const u = `${site}/media/catalog/${p.id}/${key}.mp4`; return (await mediaAvailable(u)) ? u : ''; }
    return '';
  };

  const scenes = [];
  const shots = [];
  const src = script.scenes;
  for (const [k, s] of src.entries()) {
    const isFirst = k === 0, isLast = k === src.length - 1;
    const media = String(s.media || 'img');
    const newShot = media.startsWith('لقطة جديدة') ? media.replace(/^لقطة جديدة:\s*/, '') : '';
    if (newShot) shots.push({ scene: k + 1, what: newShot, visual: s.visual });
    let say = cleanLine(s.voice);
    let head = headline(s.onScreen || s.visual);

    if (isFirst) {
      // الافتتاحية حسب الزاوية: هوك من ملف التسويق
      if (hook) { say = cleanLine(hook.text); head = headline(hook.text, 28); }
      scenes.push({ template: 'v-hook', product: p.id, data: { image: nextImage(), headline: head, move: 'snap' }, say, dur: 2.2, sfx: [{ s: 'hit', at: 0.1, v: 0.7 }], newShot });
      continue;
    }
    if (isLast) {
      // قبل النهاية: رسالة الزاوية + السعر، وبعدين كارت الطلب
      // الزاوية كمشهد لوحدها في الـ30 والـ60 بس (الـ15 قصير — الزاوية فيه في الافتتاحية)
      if (ang && script.length > 15) {
        const benefits = kit.benefits || [];
        const line = isDirection(ang.message) ? cleanLine(benefits[angle % Math.max(1, benefits.length)] || '') : firstSentence(ang.message);
        if (line) scenes.push({ template: 'v-shot', product: p.id, data: { image: nextImage(), headline: headline(ang.name, 26), move: 'dolly' }, say: line, sfx: [{ s: 'pop', at: 0.2, v: 0.35 }] });
      }
      scenes.push({ template: 'v-price', product: p.id, data: { image: nextImage(), badge: 'شحن لكل المحافظات' }, say: `${p.oldPrice ? `بدل ${Math.round(p.oldPrice)}، ` : ''}بـ ${Math.round(p.price)} جنيه بس.`, sfx: [{ s: 'ding', at: p.oldPrice ? 2.05 : 1.5, v: 0.6 }] });
      let ctaSay = /اطلب/.test(say) ? say.split(/(?=اطلب)/).pop() : 'اطلب دلوقتي من فرح مصر.';
      if (!/فرح مصر/.test(ctaSay)) ctaSay = ctaSay.replace(/[.!]*$/, '') + ' من فرح مصر.';
      scenes.push({ template: 'brand-cta', data: { cta: /اطلبي/.test(say + s.onScreen) ? 'اطلبيها دلوقتي' : 'اطلب دلوقتي' }, say: cleanLine(ctaSay), dur: 2.8, sfx: [{ s: 'riser', at: -1.1, v: 0.45 }, { s: 'hit', at: 0.55, v: 0.5 }] });
      continue;
    }
    const clip = !newShot && media !== 'img' ? await clipUrl(media) : '';
    if (clip) scenes.push({ clip, from: 1 + k * 2, dur: 3, caption: head, say, overlay: 'v-overlay' });
    else scenes.push({ template: 'v-shot', product: p.id, data: { image: nextImage(), headline: head, move: MOVES[k % MOVES.length] }, say, sfx: [{ s: 'pop', at: 0.2, v: 0.35 }], newShot });
  }
  return {
    storyboard: {
      name: `${p.id}-${script.length}s-a${angle + 1}`,
      product: p.id, angle: ang?.name || '', script: script.title,
      format: 'story', skin, fps: 30, voice, transitions: TRANS, transitionDur: 0.28, scenes,
    },
    shots,
  };
}
