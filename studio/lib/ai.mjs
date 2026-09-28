// طبقة الذكاء الاصطناعي الموفّرة: بتملا خانات نص قصيرة بس (مش تصميم ولا صور).
//   المصادر: gemini (GEMINI_API_KEY) · openrouter (OPENROUTER_API_KEY) · bank (من غير أي موديل: بنك الجمل + ملفات التسويق)
//   AI_PROVIDER بيختار؛ لو مفيش مفتاح بيشتغل bank أوتوماتيك.
// كل رد بيتحفظ (cache/ai) ومابيتطلبش تاني، وأي جملة مخالفة بتتبدل بجملة من البنك من غير ما نطلب تاني.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './paths.mjs';

const CACHE = path.join(ROOT, 'cache', 'ai');
const PHRASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'copy', 'phrases.json'), 'utf8'));

function promptBlocks() {
  const md = fs.readFileSync(path.join(ROOT, 'ai', 'PROMPTS.md'), 'utf8');
  const out = {};
  for (const m of md.matchAll(/```text ([\w-]+)\n([\s\S]*?)```/g)) out[m[1]] = m[2].trim();
  return out;
}

export function providerInfo() {
  const p = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENROUTER_API_KEY ? 'openrouter' : 'bank');
  const model = p === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite') : p === 'openrouter' ? (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite') : p;
  return { provider: p, model, keys: { gemini: !!process.env.GEMINI_API_KEY, openrouter: !!process.env.OPENROUTER_API_KEY, elevenlabs: !!process.env.ELEVENLABS_API_KEY } };
}

const plain = s => String(s || '').replace(/\*\*/g, '');
export function check(text, max) {
  const t = String(text || '').trim();
  if (!t) return 'فاضية';
  if (plain(t).length > max) return `أطول من ${max} حرف`;
  const bad = PHRASES.forbidden.find(w => t.includes(w));
  if (bad) return `فيها كلمة ممنوعة: ${bad}`;
  if (/[a-z]{4,}/i.test(plain(t)) && !/[؀-ۿ]/.test(t)) return 'مش عربي';
  return '';
}

// جملة من غير موديل (ملف التسويق أو البنك)
function fromBank(item, slot, max) {
  const cands = {
    headline: [...(item.hooks || []), ...(item.headlines || []).slice(1), ...(item.headlines || []), ...PHRASES.brand.hook],
    sub: [item.sub, ...(item.headlines || []).slice(1)],
    hook: [...(item.hooks || []), ...(item.headlines || [])],
    say: [...(item.hooks || []), item.sub],
  }[slot] || [item.sub];
  return cands.filter(Boolean).find(c => !check(c, max)) || '';
}

function usageToday() {
  const f = path.join(CACHE, 'usage.jsonl');
  if (!fs.existsSync(f)) return 0;
  const d = new Date().toISOString().slice(0, 10);
  return fs.readFileSync(f, 'utf8').split('\n').filter(l => l.includes(`"day":"${d}"`)).length;
}
function logUsage(o) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.appendFileSync(path.join(CACHE, 'usage.jsonl'), JSON.stringify({ day: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), ...o }) + '\n');
}

async function callModel(info, system, user, maxOut) {
  if (info.provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${info.model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: maxOut, temperature: 0.7 } }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error('جيميناي: ' + (j.error?.message || r.status));
    return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '', tin: j.usageMetadata?.promptTokenCount || 0, tout: j.usageMetadata?.candidatesTokenCount || 0 };
  }
  if (info.provider === 'openrouter') {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'x-title': 'Farah Studio' },
      body: JSON.stringify({ model: info.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' }, max_tokens: maxOut, temperature: 0.7 }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error('أوبن راوتر: ' + (j.error?.message || r.status));
    return { text: j.choices?.[0]?.message?.content || '', tin: j.usage?.prompt_tokens || 0, tout: j.usage?.completion_tokens || 0 };
  }
  if (info.provider === 'mock') { // للتجربة من غير مفاتيح: بيرجّع رد ثابت (وفيه غلطة عمداً عشان نتأكد إن المراجعة شغالة)
    const ids = [...user.matchAll(/"id":"([^"]+)"/g)].map(m => m[1]);
    return { text: JSON.stringify({ items: ids.map((id, i) => ({ id, headline: i % 2 ? 'الأفضل في مصر ومضمون 100%' : 'شعرك **مظبوط** في دقايق', sub: 'تنشيف وتصفيف في خطوة', hook: 'جربت تصفّفي شعرك في 5 دقايق؟', say: 'اطلبيها دلوقتي.' })) }), tin: 0, tout: 0 };
  }
  throw new Error('مفيش موديل');
}

// items: [{ id, name, price, oldPrice, category, sub, facts[] , headlines[], hooks[] }]
// slots: { headline: 30, sub: 40, hook: 60, say: 90 }
export async function writeCopy(items, slots, { force = false, onLog = () => {} } = {}) {
  const info = providerInfo();
  const P = promptBlocks();
  const out = {};
  const need = [];
  fs.mkdirSync(CACHE, { recursive: true });
  const keyOf = it => crypto.createHash('sha1').update(JSON.stringify([info.model, P['system-copy'], P['user-copy'], slots, it.id, it.name, it.price, it.facts])).digest('hex').slice(0, 16);
  for (const it of items) {
    const f = path.join(CACHE, keyOf(it) + '.json');
    if (!force && fs.existsSync(f)) { out[it.id] = { ...JSON.parse(fs.readFileSync(f, 'utf8')), cached: true }; continue; }
    need.push(it);
  }
  const limit = Number(process.env.AI_DAILY_LIMIT || 200);
  const useModel = info.provider !== 'bank' && need.length && usageToday() < limit;
  let raw = {};
  if (useModel) {
    for (let i = 0; i < need.length; i += 20) {
      const batch = need.slice(i, i + 20);
      const slotTxt = Object.entries(slots).map(([k, n]) => `- ${k}: ${n} حرف`).join('\n');
      const itemsTxt = batch.map(it => JSON.stringify({ id: it.id, name: it.name, price: it.price, oldPrice: it.oldPrice || undefined, category: it.category, facts: (it.facts || []).slice(0, 3) })).join('\n');
      const user = P['user-copy'].replace('{{SLOTS}}', slotTxt).replace('{{ITEMS}}', itemsTxt);
      try {
        const r = await callModel(info, P['system-copy'], user, 80 + batch.length * Object.keys(slots).length * 45);
        logUsage({ provider: info.provider, model: info.model, items: batch.length, tin: r.tin, tout: r.tout });
        onLog(`🤖 ${info.model}: ${batch.length} منتج — ${r.tin} توكن داخل / ${r.tout} خارج`);
        const j = JSON.parse(r.text.replace(/^```json|```$/g, '').trim());
        for (const x of j.items || []) raw[x.id] = x;
      } catch (e) { onLog('⚠️ ' + e.message + ' — هنكمّل من بنك الجمل'); }
    }
  }
  for (const it of need) {
    const res = { source: {} };
    for (const [slot, max] of Object.entries(slots)) {
      const cand = raw[it.id]?.[slot];
      const why = cand ? check(cand, max) : 'مفيش رد';
      if (!why) { res[slot] = cand.trim(); res.source[slot] = info.provider; }
      else { res[slot] = fromBank(it, slot, max); res.source[slot] = 'bank'; if (cand) res.source[slot + 'Rejected'] = `${cand} ← ${why}`; }
    }
    if (useModel && raw[it.id] && info.provider !== 'mock') fs.writeFileSync(path.join(CACHE, keyOf(it) + '.json'), JSON.stringify(res));
    out[it.id] = res;
  }
  return out;
}
