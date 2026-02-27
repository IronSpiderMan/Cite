import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getEffectiveSnapshotDir } from './settings';
import { materializeMhtmlToDir } from './mhtml';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(win: BrowserWindow, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isLoading = win.webContents.isLoading();
    const readyState = await win.webContents
      .executeJavaScript('document.readyState', true)
      .catch((): any => null);
    if (!isLoading && (readyState === 'complete' || readyState === 'interactive')) return;
    await delay(100);
  }
}

async function waitForReadableContent(win: BrowserWindow, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const len = await win.webContents
      .executeJavaScript(
        `
        (() => {
          const el = document.querySelector('main, article, [role="main"]') || document.body;
          const txt = (el && (el.innerText || el.textContent)) || '';
          return txt.trim().length;
        })()
      `,
        true
      )
      .catch((): any => 0);
    if (typeof len === 'number' && len > 200) return;
    await delay(200);
  }
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number, message: string) {
  let t: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function autoScrollForLazyLoads(win: BrowserWindow, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const done = await win.webContents
      .executeJavaScript(
        `
        (async () => {
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));
          const el = document.scrollingElement || document.documentElement;
          if (!el) return true;
          const step = Math.max(300, Math.floor((window.innerHeight || 800) * 0.8));
          for (let i = 0; i < 80; i++) {
            el.scrollTop = Math.min(el.scrollTop + step, el.scrollHeight);
            window.dispatchEvent(new Event('scroll'));
            await sleep(120);
            if (el.scrollTop + (window.innerHeight || 800) >= el.scrollHeight - 2) break;
          }
          el.scrollTop = 0;
          window.dispatchEvent(new Event('scroll'));
          await sleep(200);
          const imgs = Array.from(document.images || []);
          const pending = imgs.filter(img => !(img.complete && (img.naturalWidth || 0) > 0)).length;
          return pending === 0;
        })()
      `,
        true
      )
      .catch((): any => false);
    if (done) return;
    await delay(250);
  }
}

export async function captureSnapshot(url: string) {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      offscreen: false,
      contextIsolation: true,
      backgroundThrottling: false,
    }
  });

  try {
    let loadFailure: { code: number; description: string; validatedURL: string } | null = null;
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      loadFailure = { code: errorCode, description: errorDescription, validatedURL };
    });

    const extraHeaders = 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\n';
    await win.loadURL(url, { extraHeaders });
    const lf: any = loadFailure;
    if (lf) throw new Error(`Page load failed (${lf.code}): ${lf.description} (${lf.validatedURL})`);
    await waitForReady(win, 30000);
    await delay(500);
    await waitForReadableContent(win, 30000);
    await autoScrollForLazyLoads(win, 30000);
    
    const title = win.getTitle();
    
    const content = await win.webContents.executeJavaScript('document.documentElement.outerHTML', true);
    
    const snapshotsDir = getEffectiveSnapshotDir();
    fs.mkdirSync(snapshotsDir, { recursive: true });
    
    const id = `${crypto.createHash('md5').update(url).digest('hex')}-${Date.now()}`;
    const outDir = path.join(snapshotsDir, id);
    fs.mkdirSync(outDir, { recursive: true });
    const mhtmlPath = path.join(outDir, 'snapshot.mhtml');
    const htmlPath = path.join(outDir, 'index.html');

    try {
      await withTimeout(win.webContents.savePage(mhtmlPath, 'MHTML'), 45000, 'savePage(MHTML) timed out');
      try {
        await materializeMhtmlToDir(mhtmlPath, outDir, url);
        return {
          title,
          content,
          snapshot_path: `snapshot://${id}/index.html`
        };
      } catch {}
    } catch {}

    try {
      await withTimeout(win.webContents.savePage(htmlPath, 'HTMLComplete'), 45000, 'savePage(HTMLComplete) timed out');
      return {
        title,
        content,
        snapshot_path: `snapshot://${id}/index.html`
      };
    } catch {}

    const pngPath = path.join(outDir, 'snapshot.png');
    const image = await withTimeout(win.webContents.capturePage(), 15000, 'capturePage timed out');
    fs.writeFileSync(pngPath, image.toPNG());
    return {
      title,
      content,
      snapshot_path: `snapshot://${id}/snapshot.png`
    };
  } catch (error) {
    console.error('Snapshot failed:', error);
    throw error;
  } finally {
    win.close();
  }
}
