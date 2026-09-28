// ملفات برخصة مش مسموح تتنشر كملف لوحده (مزيكا Pixabay، صور Pexels…) بتترفع هنا **متشفرة**، والكمبيوتر السحابي بس هو اللي يفكها.
// المفتاح الخاص متخزن في R2 (private/studio/asset-key.pem) ومابيطلعش برا السحابة. العام في assets-enc/asset-key.pub.pem.
//   keygen  (على السحابة): لو المفتاح مش موجود بيعمله ويحط العام في assets-enc/
//   seal <ملف...>  (على الجهاز): بيشفّر كل ملف لـ assets-enc/<المسار>.enc
//   open  (على السحابة): بيفك كل ملفات assets-enc/ لمكانها الأصلي
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENC = path.join(STUDIO, 'assets-enc');
const PUB = path.join(ENC, 'asset-key.pub.pem');
const KEY_R2 = 'private/studio/asset-key.pem';
const BUCKET = process.env.MEDIA_BUCKET || 'farah-media';

// أي خطأ بيطلع كملاحظة في GitHub (annotation) عشان يتقري من غير صلاحيات
const oneLine = e => String((e && (e.stack || e.message)) || e).split('\n').join(' | ').slice(0, 900);
process.on('uncaughtException', e => { console.log(`::error title=assets-crypt::${oneLine(e)}`); process.exit(1); });
process.on('unhandledRejection', e => { console.log(`::error title=assets-crypt::${oneLine(e)}`); process.exit(1); });

async function r2() { return import('../../scripts/storage.mjs'); }
async function getPrivate() {
  if (process.env.ASSET_KEY_FILE) return fs.readFileSync(process.env.ASSET_KEY_FILE, 'utf8');
  const { s3 } = await r2();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  try { const r = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY_R2 })); return await r.Body.transformToString(); }
  // الملف مش موجود: R2 ساعات بيرجّع 403 بدل 404 لو المفتاح مالوش صلاحية عرض القايمة
  catch (e) { if ([403, 404].includes(e.$metadata?.httpStatusCode) || ['NoSuchKey', 'AccessDenied', 'NotFound'].includes(e.name)) return null; throw e; }
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else if (f.name.endsWith('.enc')) out.push(p);
  }
  return out;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'keygen') {
  let pem = await getPrivate();
  if (!pem) {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072 });
    pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const { putFileTo } = await r2();
    await putFileTo(BUCKET, KEY_R2, pem, 'application/x-pem-file');
    console.log('🔑 اتعمل مفتاح جديد واتحفظ في R2');
  } else console.log('🔑 المفتاح موجود في R2');
  fs.mkdirSync(ENC, { recursive: true });
  fs.writeFileSync(PUB, crypto.createPublicKey(pem).export({ type: 'spki', format: 'pem' }));
  console.log('✅ المفتاح العام:', path.relative(STUDIO, PUB));
} else if (cmd === 'seal') {
  const pub = fs.readFileSync(PUB, 'utf8');
  for (const f of args) {
    const abs = path.resolve(f), rel = path.relative(STUDIO, abs).split(path.sep).join('/');
    const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([c.update(fs.readFileSync(abs)), c.final()]);
    const head = Buffer.from(JSON.stringify({ rel, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'),
      ek: crypto.publicEncrypt({ key: pub, oaepHash: 'sha256' }, key).toString('base64') }));
    const len = Buffer.alloc(4); len.writeUInt32BE(head.length);
    const out = path.join(ENC, rel + '.enc');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.concat([len, head, body]));
    console.log('🔒', rel, '→', path.relative(STUDIO, out));
  }
} else if (cmd === 'open') {
  const pem = await getPrivate();
  if (!pem) throw new Error('المفتاح الخاص مش موجود في R2 — شغّل keygen الأول');
  let n = 0;
  for (const f of walk(ENC)) {
    const buf = fs.readFileSync(f), hl = buf.readUInt32BE(0);
    const h = JSON.parse(buf.subarray(4, 4 + hl).toString());
    const key = crypto.privateDecrypt({ key: pem, oaepHash: 'sha256' }, Buffer.from(h.ek, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(h.iv, 'base64'));
    d.setAuthTag(Buffer.from(h.tag, 'base64'));
    const out = path.join(STUDIO, h.rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.concat([d.update(buf.subarray(4 + hl)), d.final()]));
    n++;
  }
  console.log(`🔓 اتفك ${n} ملف`);
} else {
  console.log('استخدام: keygen | seal <files...> | open');
}
