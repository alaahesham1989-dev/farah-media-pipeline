// أوامر الاستوديو من الترمينال (نفس اللي بيشتغل على الكمبيوتر السحابي):
//   node cli.mjs data                                   ← يحدّث نسخة بيانات المتجر (قراية بس)
//   node cli.mjs render jobs/مثال.json [--formats portrait,story,square]
//   node cli.mjs sheet --type sale --product code0005 [--skin farah] [--format portrait]   ← كل أشكال النوع في لوحة واحدة
//   node cli.mjs skins --template sale-ribbon --product code0005                          ← قالب واحد بكل المواسم
//   node cli.mjs video storyboards/مثال.json | --preset why-farah [--skin farah]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, renderJobs } from './server.mjs';
import { load, refresh } from './lib/data.mjs';
import { resolveJob } from './lib/resolve.mjs';
import { TEMPLATES } from './engine/templates/index.js';
import { SKINS } from './engine/skins.js';
import { makeSheet } from './lib/sheet.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const args = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) { const k = rest[i].slice(2); args[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; } else pos.push(rest[i]);
}
const list = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : null);

if (cmd === 'data') {
  const s = await refresh();
  console.log(`✅ ${s.products.length} منتج منشور، ${s.offers.length} عرض — اتحفظوا في data/store.json`);
  process.exit(0);
}

const srv = await startServer(0);
try {
  const store = await load();
  if (cmd === 'render') {
    const raw = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
    const jobs = (Array.isArray(raw) ? raw : raw.jobs || [raw]).map(j => resolveJob(j, store));
    const fmts = list(args.formats);
    const all = jobs.flatMap(j => (fmts || j.formats || [j.format || 'portrait']).map(f => ({ ...j, format: f })));
    const files = await renderJobs(srv.url, all, { dir: args.dir || path.basename(pos[0], '.json') });
    files.forEach(f => console.log('🖼️ ', path.relative(process.cwd(), f.file)));
  } else if (cmd === 'sheet' || cmd === 'skins') {
    const fmt = args.format || 'portrait';
    const base = { product: args.product, offer: args.offer, data: args.data ? JSON.parse(args.data) : {} };
    const jobs = cmd === 'sheet'
      ? TEMPLATES.filter(t => !args.type || t.type === args.type).map(t => ({ ...base, template: t.id, skin: args.skin || 'farah', format: fmt, name: `${t.id}-${args.skin || 'farah'}` }))
      : SKINS.map(s => ({ ...base, template: args.template, skin: s.id, format: fmt, name: `${args.template}-${s.id}` }));
    const files = await renderJobs(srv.url, jobs.map(j => resolveJob(j, store)), { dir: args.dir || 'sheets' });
    const out = await makeSheet(srv.url, files, path.join('out', args.dir || 'sheets', `${cmd}-${args.type || args.template || 'all'}-${args.skin || ''}-${fmt}.jpg`), { cols: Number(args.cols) || 4 });
    console.log('🧾 ', out);
  } else if (cmd === 'video') {
    const { makeVideo } = await import('./lib/video.mjs');
    const { preset } = await import('./lib/presets.mjs');
    const voice = args.voice === 'none' ? null : args.voice ? { name: args.voice, rate: '+10%' } : undefined;
    const sb = args.preset ? await preset(args.preset, { store, skin: args.skin, voice, params: args.params ? JSON.parse(args.params) : {}, product: args.product, offer: args.offer })
      : JSON.parse(fs.readFileSync(pos[0], 'utf8'));
    const file = await makeVideo(srv.url, sb, { store, onLog: m => console.log(m) });
    console.log('🎬 ', file);
  } else {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n'));
  }
} finally {
  await srv.close();
}
