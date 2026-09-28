// واجهة الذكاء الاصطناعي للوحة: حالة المفاتيح (من غير ما نرجّع المفتاح نفسه) + كتابة خانات لمنتج
import { providerInfo, writeCopy } from './ai.mjs';
import { load } from './data.mjs';

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, bad) => { let s = ''; req.on('data', d => (s += d)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });

export function register(hooks) {
  hooks['/api/ai/status'] = (req, res) => json(res, 200, providerInfo());
  hooks['/api/ai/copy'] = async (req, res) => {
    const b = await readBody(req);
    const store = await load();
    const items = (b.ids || []).map(id => store.products.find(p => p.id === id)).filter(Boolean);
    const log = [];
    const r = await writeCopy(items, b.slots || { headline: 30, sub: 40, hook: 60 }, { force: !!b.force, onLog: m => log.push(m) });
    json(res, 200, { info: providerInfo(), result: r, log });
  };
}
