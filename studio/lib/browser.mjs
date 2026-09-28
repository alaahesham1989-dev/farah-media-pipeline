// المتصفح اللي بيرسم (من غير شاشة). بيدوّر على كروم/إيدج الموجود على الجهاز أو السيرفر.
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { FORMATS } from '../engine/formats.js';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

let browserP = null;
export function getBrowser() {
  if (!browserP) {
    const exe = CANDIDATES.find(p => fs.existsSync(p));
    browserP = chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  }
  return browserP;
}
export async function closeBrowser() {
  if (browserP) { const b = await browserP; browserP = null; await b.close(); }
}

// صفحة مسرح جاهزة (بنعيد استخدامها بدل ما نفتح صفحة لكل صورة)
export async function openStage(baseUrl, fmt = 'portrait') {
  const b = await getBrowser();
  const { W, H } = FORMATS[fmt] || FORMATS.portrait;
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('خطأ في المسرح:', e.message));
  await page.goto(baseUrl + '/engine/stage.html');
  await page.waitForFunction(() => window.__stageReady === true);
  return page;
}

export async function mountOn(page, job, mode = 'static') {
  const { W, H } = FORMATS[job.format] || FORMATS.portrait;
  const vp = page.viewportSize();
  if (vp.width !== W || vp.height !== H) await page.setViewportSize({ width: W, height: H });
  await page.evaluate(({ job, mode }) => window.STAGE.mount(job, { mode }), { job, mode });
  return { W, H };
}

// صورة واحدة
export async function shoot(page, job, file, { type } = {}) {
  const { W, H } = await mountOn(page, job, 'static');
  const t = type || (file.endsWith('.jpg') ? 'jpeg' : 'png');
  await page.screenshot({ path: file, type: t, quality: t === 'jpeg' ? 92 : undefined, clip: { x: 0, y: 0, width: W, height: H }, omitBackground: !!job.transparent });
  return file;
}
