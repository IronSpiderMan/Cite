import {BrowserWindow} from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {getEffectiveSnapshotDir} from './settings';
import {materializeMhtmlToDir} from './mhtml';

function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(win: BrowserWindow, timeoutMs: number) {
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, timeoutMs);

        const onFinish = () => {
            cleanup();
            resolve();
        };
        const onFail = (_: any, code: number, desc: string) => {
            cleanup();
            reject(new Error(`Page load failed (${code}): ${desc}`));
        };

        const cleanup = () => {
            clearTimeout(timer);
            win.webContents.off('did-finish-load', onFinish);
            win.webContents.off('did-fail-load', onFail);
        };

        win.webContents.once('did-finish-load', onFinish);
        win.webContents.once('did-fail-load', onFail);
    });
}

async function waitForReadableContent(win: BrowserWindow, timeoutMs: number) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const len = await win.webContents
            .executeJavaScript(
                `(() => {
          const el = document.querySelector('main, article, [role="main"]') || document.body;
          return ((el && (el.innerText || el.textContent)) || '').trim().length;
        })()`,
                true
            )
            .catch((): any => 0);
        if (typeof len === 'number' && len > 200) return;
        await delay(300);
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
    await win.webContents
        .executeJavaScript(
            `(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const el = document.scrollingElement || document.documentElement;
        if (!el) return;
        const step = Math.max(300, Math.floor((window.innerHeight || 800) * 0.8));
        for (let i = 0; i < 25; i++) {
          el.scrollTop = Math.min(el.scrollTop + step, el.scrollHeight);
          window.dispatchEvent(new Event('scroll'));
          await sleep(80);
          if (el.scrollTop + (window.innerHeight || 800) >= el.scrollHeight - 2) break;
        }
        el.scrollTop = 0;
        window.dispatchEvent(new Event('scroll'));
        await sleep(150);
      })()`,
            true
        )
        .catch(() => {
        });
}

export async function captureSnapshot(url: string) {
    const win = new BrowserWindow({
        show: false,
        width: 1280,
        height: 800,
        webPreferences: {
            offscreen: true,
            contextIsolation: true,
            backgroundThrottling: false,
        }
    });

    try {
        const extraHeaders = 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\n';
        await win.loadURL(url, {extraHeaders});

        await waitForReadableContent(win, 8000);
        await autoScrollForLazyLoads(win, 8000);

        const title = win.getTitle();
        const content = await win.webContents.executeJavaScript(
            'document.documentElement.outerHTML', true
        );

        const snapshotsDir = getEffectiveSnapshotDir();
        fs.mkdirSync(snapshotsDir, {recursive: true});

        const id = `${crypto.createHash('md5').update(url).digest('hex')}-${Date.now()}`;
        const outDir = path.join(snapshotsDir, id);
        fs.mkdirSync(outDir, {recursive: true});
        const mhtmlPath = path.join(outDir, 'snapshot.mhtml');
        const htmlPath = path.join(outDir, 'index.html');
        const thumbPath = path.join(outDir, 'thumb.png');

        const [thumbResult, saveResult] = await Promise.allSettled([
            withTimeout(
                win.webContents.capturePage({x: 0, y: 0, width: 1200, height: 630} as any),
                8000,
                'capturePage thumb timed out'
            ),
            withTimeout(
                win.webContents.savePage(mhtmlPath, 'MHTML'),
                45000,
                'savePage(MHTML) timed out'
            ),
        ]);

        if (thumbResult.status === 'fulfilled') {
            fs.writeFileSync(thumbPath, thumbResult.value.toPNG());
        }

        if (saveResult.status === 'fulfilled') {
            void materializeMhtmlToDir(mhtmlPath, outDir, url).catch(() => {
            });
            return {title, content, snapshot_path: `snapshot://${id}/index.html`};
        }

        // Fallback to HTMLComplete
        try {
            await withTimeout(
                win.webContents.savePage(htmlPath, 'HTMLComplete'),
                45000,
                'savePage(HTMLComplete) timed out'
            );
            return {title, content, snapshot_path: `snapshot://${id}/index.html`};
        } catch {
        }

        // Fallback to PNG
        const pngPath = path.join(outDir, 'snapshot.png');
        if (fs.existsSync(thumbPath)) {
            fs.copyFileSync(thumbPath, pngPath);
        } else {
            const image = await withTimeout(win.webContents.capturePage(), 15000, 'capturePage timed out');
            fs.writeFileSync(pngPath, image.toPNG());
            fs.writeFileSync(thumbPath, image.toPNG());
        }

        return {title, content, snapshot_path: `snapshot://${id}/snapshot.png`};

    } catch (error) {
        console.error('Snapshot failed:', error);
        throw error;
    } finally {
        win.close();
    }
}