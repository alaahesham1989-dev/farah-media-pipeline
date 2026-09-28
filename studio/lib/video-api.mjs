// واجهة الفيديو للوحة: قايمة الأنواع + تشغيل + متابعة
import { PRESETS, preset } from './presets.mjs';
import { makeVideo } from './video.mjs';
import { load } from './data.mjs';

const jobs = new Map();
let running = Promise.resolve();
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, bad) => { let s = ''; req.on('data', d => (s += d)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });

export function register(hooks) {
  hooks['/api/video/presets'] = (req, res) => json(res, 200, { presets: PRESETS.map(({ id, name, desc, fields }) => ({ id, name, desc, fields })) });
  hooks['/api/video/status'] = (req, res, u) => {
    const j = jobs.get(u.searchParams.get('id'));
    return j ? json(res, 200, j) : json(res, 404, { error: 'مش موجود' });
  };
  hooks['/api/video'] = async (req, res, u, base) => {
    const b = await readBody(req);
    const id = Date.now().toString(36);
    const j = { id, state: 'queued', log: ['⏳ في الدور…'], file: '', storyboard: null };
    jobs.set(id, j);
    running = running.then(async () => {
      try {
        j.state = 'running';
        const store = await load();
        const sb = b.storyboard || await preset(b.preset, { store, skin: b.skin, voice: !b.voice ? null : ['elevenlabs', 'gemini'].includes(b.voice) ? { provider: b.voice } : { name: b.voice, rate: '+10%' }, params: b.params || {} });
        j.storyboard = sb;
        j.log.push(`🎬 ${sb.scenes.length} مشهد — بنرسم…`);
        const rel = await makeVideo(base, sb, { store, onLog: m => j.log.push(m) });
        j.file = '/' + rel;
        j.state = 'done';
      } catch (e) { j.state = 'error'; j.error = String(e.message || e); j.log.push('❌ ' + j.error); console.error(e); }
    });
    json(res, 200, { id });
  };
}
