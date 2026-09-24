// Google Drive (public "anyone with the link" folders) — list and download without a login.
// Listing uses the public embedded folder view; downloads use the public download endpoint.

const UA = 'Mozilla/5.0 (farah-media-pipeline)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function folderIdFromUrl(url) {
  const m = String(url || '').match(/\/folders\/([A-Za-z0-9_-]{10,})/) || String(url || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function fetchText(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.text();
      if (i >= tries - 1 || (r.status < 500 && r.status !== 429)) throw new Error(`HTTP ${r.status} ${url}`);
    } catch (e) { if (i >= tries - 1) throw e; }
    await sleep(1500 * (i + 1));
  }
}

// One folder level: [{ id, name, kind: 'folder'|'file' }]
export async function listFolder(folderId) {
  const html = await fetchText(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`);
  const out = [];
  const re = /<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const href = decode(m[1]);
    const name = decode(m[2]).trim();
    const folder = href.match(/\/folders\/([A-Za-z0-9_-]+)/);
    const file = href.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || href.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (folder) out.push({ id: folder[1], name, kind: 'folder' });
    else if (file) out.push({ id: file[1], name, kind: 'file' });
  }
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  return { title: title ? decode(title).trim() : '', items: out };
}

// Whole tree: [{ id, name, path: 'صور/x.jpg' }]
export async function listTree(folderId, prefix = '', depth = 0, seen = new Set()) {
  if (depth > 4 || seen.has(folderId)) return [];
  seen.add(folderId);
  const { items } = await listFolder(folderId);
  const files = [];
  for (const it of items) {
    const path = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.kind === 'folder') { await sleep(300); files.push(...await listTree(it.id, path, depth + 1, seen)); }
    else files.push({ id: it.id, name: it.name, path });
  }
  return files;
}

export const kindOf = name => /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(name) ? 'video'
  : /\.(jpe?g|jfif|png|webp|avif|heic|gif|bmp)$/i.test(name) ? 'image' : 'other';

// Download a public file as a web stream (handles the "can't scan for viruses" page of big files)
export async function download(fileId) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const type = r.headers.get('content-type') || '';
    if (r.ok && !type.startsWith('text/html')) return { body: r.body, type, size: Number(r.headers.get('content-length')) || null };
    if (r.ok && type.startsWith('text/html')) {
      // Confirmation form with a uuid → retry with it
      const html = await r.text();
      const uuid = (html.match(/name="uuid" value="([^"]+)"/) || [])[1];
      if (uuid) {
        const r2 = await fetch(`${url}&uuid=${uuid}`, { headers: { 'User-Agent': UA } });
        if (r2.ok && !(r2.headers.get('content-type') || '').startsWith('text/html')) return { body: r2.body, type: r2.headers.get('content-type') || '', size: Number(r2.headers.get('content-length')) || null };
      }
    }
    await sleep(2000 * (i + 1));
  }
  throw new Error('download failed ' + fileId);
}
