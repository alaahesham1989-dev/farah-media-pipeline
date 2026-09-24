// المخزن الخام (Cloudflare R2 — bucket منفصل عن مخزن الموقع). المفاتيح من متغيرات البيئة بس:
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (افتراضي farah-raw)
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'node:stream';

const need = k => { const v = process.env[k]; if (!v) throw new Error(`ناقص متغير ${k} (GitHub → Settings → Secrets)`); return v.trim(); };

let client;
export function s3() {
  if (!client) client = new S3Client({
    region: 'auto',
    endpoint: `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: need('R2_ACCESS_KEY_ID'), secretAccessKey: need('R2_SECRET_ACCESS_KEY') },
  });
  return client;
}
export const bucket = () => (process.env.R2_BUCKET || 'farah-raw').trim();

export async function exists(key) {
  try { await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key })); return true; }
  catch (e) { if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false; throw e; }
}

// web ReadableStream (fetch body) → R2، على أجزاء (ملفات الفيديو الكبيرة)
export async function putStream(key, webStream, contentType) {
  const up = new Upload({
    client: s3(),
    params: { Bucket: bucket(), Key: key, Body: Readable.fromWeb(webStream), ContentType: contentType || 'application/octet-stream' },
    partSize: 16 * 1024 * 1024,
    queueSize: 3,
  });
  const r = await up.done();
  return r;
}

export async function getJson(key, fallback) {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return JSON.parse(await r.Body.transformToString());
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey') return fallback;
    throw e;
  }
}
export async function putJson(key, data) {
  await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: JSON.stringify(data, null, 1), ContentType: 'application/json' }));
}
