// سيرفر الاستوديو التجريبي (منفصل تماماً عن المتجر ولوحته).
//   npm start  →  http://localhost:4455
// بيعرض اللوحة، وبيرسم الصور والفيديوهات، وبيقرا بيانات المتجر العامة (قراية بس).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { ROOT, OUT } from './lib/paths.mjs';
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch {}
import { load, refresh } from './lib/data.mjs';
import { openStage, shoot, closeBrowser } from './lib/browser.mjs';
import { makeSheet } from './lib/sheet.mjs';
import { TEMPLATES, TYPES } from './engine/templates/index.js';
import { SKINS } from './engine/skins.js';
import { FORMATS } from './engine/formats.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const PUBLIC = ['engine', 'assets', 'brand', 'web', 'out'];

const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = req => new Promise((ok, bad) => { let s = ''; req.on('data', d => (s += d)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });

export const slug = s => String(s || 'x').toLowerCase().replace(/[^a-z0-9؀-ۿ-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const stamp = () => new Date().toISOString().slice(0, 10);

// صفحة مسرح واحدة لكل عملية رسم في نفس الوقت (بالدور)
let chain = Promise.resolve();
const queue = fn => (chain = chain.then(fn, fn));
let stagePage = null;

export async function renderJobs(baseUrl, jobs, { dir = stamp(), ext = 'png' } = {}) {
  return queue(async () => {
    if (!stagePage || stagePage.isClosed()) stagePage = await openStage(baseUrl);
    const outDir = path.join(OUT, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const files = [];
    for (const job of jobs) {
      const name = `${slug(job.name || [job.template, job.skin, job.data?.id].filter(Boolean).join('-'))}-${job.format || 'portrait'}.${job.transparent ? 'png' : ext}`;
      const file = path.join(outDir, name);
      await shoot(stagePage, job, file);
      files.push({ file, url: '/out/' + dir + '/' + name, job });
    }
    return files;
  });
}

function listOutputs() {
  if (!fs.existsSync(OUT)) return [];
  const all = [];
  for (const d of fs.readdirSync(OUT)) {
    const p = path.join(OUT, d);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p)) if (/\.(png|jpe?g|mp4)$/i.test(f)) all.push({ url: `/out/${d}/${f}`, name: f, dir: d, t: fs.statSync(path.join(p, f)).mtimeMs });
  }
  return all.sort((a, b) => b.t - a.t).slice(0, 300);
}

export function startServer(port = Number(process.env.PORT) || 4455) {
  let base = '';
  const hooks = {};
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    try {
      if (u.pathname === '/' ) { res.writeHead(302, { location: '/web/' }); return res.end(); }
      if (u.pathname === '/favicon.ico') return send(res, 200, fs.readFileSync(path.join(ROOT, 'brand', 'mark.png')), 'image/png');
      if (u.pathname === '/api/meta') {
        const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand', 'brand.json'), 'utf8'));
        return send(res, 200, {
          types: TYPES, formats: FORMATS, brand,
          templates: TEMPLATES.map(t => ({ id: t.id, type: t.type, name: t.name, desc: t.desc, fields: t.fields || null, defaults: t.defaults || {} })),
          skins: SKINS.map(s => ({ id: s.id, name: s.name, label: s.label, swatch: [s.vars.bg, s.vars.acc, s.vars.ink] })),
        });
      }
      if (u.pathname === '/api/store') return send(res, 200, u.searchParams.get('refresh') ? await refresh() : await load());
      if (u.pathname === '/api/outputs') return send(res, 200, listOutputs());
      if (u.pathname === '/api/qr') {
        const svg = await QRCode.toString(u.searchParams.get('text') || 'https://farahegypt.com', { type: 'svg', margin: 0, color: { dark: u.searchParams.get('c') || '#0B1929', light: '#0000' } });
        return send(res, 200, svg, 'image/svg+xml');
      }
      if (u.pathname === '/api/render' && req.method === 'POST') {
        const b = await readBody(req);
        const jobs = (b.jobs || [b.job]).filter(Boolean).flatMap(j => (b.formats || [j.format || 'portrait']).map(f => ({ ...j, format: f })));
        const files = await renderJobs(base, jobs, { ext: b.ext || 'png' });
        return send(res, 200, { files: files.map(f => f.url) });
      }
      if (u.pathname === '/api/doc') {
        const n = { RULES: 'RULES.md', README: 'README.md', PROMPTS: 'ai/PROMPTS.md' }[u.searchParams.get('name')];
        const f = n && path.join(ROOT, n);
        return f && fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), MIME['.md']) : send(res, 404, { error: 'مش موجود' });
      }
      if (u.pathname === '/api/sheet' && req.method === 'POST') {
        const b = await readBody(req);
        const files = await renderJobs(base, b.jobs, { dir: 'sheets' });
        const name = 'sheet-' + Date.now() + '.jpg';
        const rel = await queue(() => makeSheet(base, files, path.join('out', 'sheets', name), { cols: b.cols || 4 }));
        return send(res, 200, { sheet: '/out/sheets/' + name, files: files.map(f => f.url) });
      }
      for (const [p, fn] of Object.entries(hooks)) if (u.pathname === p) return await fn(req, res, u, base);

      // ملفات ثابتة
      const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
      const top = rel.split('/')[0];
      let file = path.join(ROOT, rel);
      if (!PUBLIC.includes(top) || !file.startsWith(ROOT)) return send(res, 404, { error: 'مش موجود' });
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) return send(res, 404, { error: 'مش موجود' });
      const stat = fs.statSync(file);
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
      if (range && type.startsWith('video')) {
        const s = Number(range[1] || 0), e = range[2] ? Number(range[2]) : stat.size - 1;
        res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${e}/${stat.size}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 });
        return fs.createReadStream(file, { start: s, end: e }).pipe(res);
      }
      res.writeHead(200, { 'content-type': type, 'content-length': stat.size, 'cache-control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      console.error(e);
      send(res, 500, { error: String(e.message || e) });
    }
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    ok({ url: base, server, hooks, close: async () => { await closeBrowser(); server.close(); } });
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'server.mjs')) {
  const { url, hooks } = await startServer();
  (await import('./lib/video-api.mjs')).register(hooks);
  (await import('./lib/ai-api.mjs')).register(hooks);
  console.log(`🎨 استوديو فرح التجريبي شغال: ${url}/web/`);
}
