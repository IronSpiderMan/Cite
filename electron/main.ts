import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { materializeMhtmlToDir } from './mhtml';
// @ts-ignore
import { initDb, resetDb, dbOps } from './db';
// @ts-ignore
import { captureSnapshot } from './snapshot';
import { getEffectiveSnapshotDir, getSettings, updateSettings } from './settings';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'snapshot',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

if (!app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(process.cwd(), '.cite-user-data'));
}

if (process.platform === 'win32') {
  try {
    if (require('electron-squirrel-startup')) app.quit();
  } catch (e) {}
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // macOS style
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: app.isPackaged,
    },
  });

  if (!app.isPackaged) {
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5175');
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  const ensureHtmlFromMhtml = async (mhtmlPath: string, outDir: string, originUrl?: string) => {
    const htmlPath = path.join(outDir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      try {
        const fd = fs.openSync(htmlPath, 'r');
        try {
          const buf = Buffer.alloc(8192);
          const n = fs.readSync(fd, buf, 0, buf.length, 0);
          const head = buf.slice(0, n).toString('utf8');
          const looksBroken = head.includes('@mhtml.blink') || head.includes('assets/local/assets/local') || head.includes('cid:');
          if (!looksBroken) return htmlPath;
        } finally {
          fs.closeSync(fd);
        }
      } catch {
        return htmlPath;
      }
    }
    await materializeMhtmlToDir(mhtmlPath, outDir, originUrl);
    return htmlPath;
  };

  const resolveSnapshotFile = (requestUrl: string) => {
    const u = new URL(requestUrl);
    const id = u.hostname;
    const rel = decodeURIComponent(u.pathname || '/').replace(/^\/+/, '');

    const roots = Array.from(new Set([getEffectiveSnapshotDir(), path.join(app.getPath('userData'), 'snapshots')].filter(Boolean)));
    for (const root of roots) {
      const base = path.join(root, id);
      const resolved = path.join(base, rel);

      const baseResolved = path.resolve(base) + path.sep;
      const resolvedResolved = path.resolve(resolved);
      if (!resolvedResolved.startsWith(baseResolved)) continue;
      if (fs.existsSync(resolvedResolved)) return resolvedResolved;
    }
    return null;
  };

  const extToMime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  };

  const getMhtmlMimeFromFile = (filePath: string) => {
    try {
      const fd = fs.openSync(filePath, 'r');
      try {
        const buf = Buffer.alloc(4096);
        const n = fs.readSync(fd, buf, 0, buf.length, 0);
        const head = buf.slice(0, n).toString('utf8');
      const m = head.match(/Content-Type:\s*([^\r\n;]+\/[^\r\n;]+(?:;[^\r\n]+)*)/i);
      if (m && m[1]) return m[1].trim();
      } finally {
        fs.closeSync(fd);
      }
    } catch {}
    return 'multipart/related';
  };

  protocol.handle('snapshot', async (request) => {
    try {
      const u = new URL(request.url);
      const id = u.hostname;
      const rel = decodeURIComponent(u.pathname || '/').replace(/^\/+/, '');

      let resolved = resolveSnapshotFile(request.url);
      if (!resolved && (rel === 'index.html' || rel === 'index.htm')) {
        const roots = Array.from(new Set([getEffectiveSnapshotDir(), path.join(app.getPath('userData'), 'snapshots')].filter(Boolean)));
        for (const root of roots) {
          const base = path.join(root, id);
          const baseResolved = path.resolve(base) + path.sep;
          const mhtmlCandidate = path.resolve(path.join(base, 'snapshot.mhtml'));
          const htmlCandidate = path.resolve(path.join(base, 'index.html'));
          if (!mhtmlCandidate.startsWith(baseResolved) || !htmlCandidate.startsWith(baseResolved)) continue;
          if (!fs.existsSync(mhtmlCandidate)) continue;
          await ensureHtmlFromMhtml(mhtmlCandidate, base, undefined);
          if (fs.existsSync(htmlCandidate)) {
            resolved = htmlCandidate;
            break;
          }
        }
      }

      if (!resolved) return new Response('Not Found', { status: 404 });

      const ext = path.extname(resolved).toLowerCase();
      const mime = ext === '.mhtml' || ext === '.mht' ? getMhtmlMimeFromFile(resolved) : extToMime[ext] || 'application/octet-stream';

      const stream = fs.createReadStream(resolved);
      return new Response(Readable.toWeb(stream) as any, {
        status: 200,
        headers: {
          'Content-Type': mime,
        },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });

  try {
    initDb();
  } catch (e) {
    console.error(e);
  }
  
  // Register IPC handlers
  ipcMain.handle('db:getItems', (_, filter) => dbOps.getItems(filter));
  ipcMain.handle('db:addItem', (_, item) => dbOps.addItem(item));
  ipcMain.handle('db:addUrlItem', async (event, url: string) => {
    const info = dbOps.addItem({
      url,
      title: url,
      description: '',
      content: '',
      content_format: 'html',
      status: 'pending'
    });
    const id = info.lastInsertRowid as number;
    const sender = event.sender;

    // Async capture
    (async () => {
      try {
        const result = await captureSnapshot(url);
        const updates = {
          title: result.title || url,
          content: result.content,
          snapshot_path: result.snapshot_path,
          status: 'completed'
        };
        dbOps.updateItem(id, updates);
        if (!sender.isDestroyed()) {
           sender.send('item:updated', { id, ...updates });
        }
      } catch (e) {
        console.error('Capture failed for', url, e);
        dbOps.updateItem(id, { status: 'failed' });
        if (!sender.isDestroyed()) {
           sender.send('item:updated', { id, status: 'failed' });
        }
      }
    })();

    return {
      id,
      url,
      title: url,
      description: '',
      content: '',
      content_format: 'html',
      status: 'pending',
      created_at: new Date().toISOString()
    };
  });
  ipcMain.handle('db:updateItem', (_, id, updates) => dbOps.updateItem(id, updates));
  ipcMain.handle('db:deleteItem', (_, id) => dbOps.deleteItem(id));

  ipcMain.handle('db:getAnnotations', (_, itemId) => dbOps.getAnnotations(itemId));
  ipcMain.handle('db:addAnnotation', (_, annotation) => dbOps.addAnnotation(annotation));
  ipcMain.handle('db:updateAnnotation', (_, id, updates) => dbOps.updateAnnotation(id, updates));
  ipcMain.handle('db:deleteAnnotation', (_, id) => dbOps.deleteAnnotation(id));
  
  ipcMain.handle('db:getCollections', () => dbOps.getCollections());
  ipcMain.handle('db:addCollection', (_, name) => dbOps.addCollection(name));
  ipcMain.handle('db:addItemToCollection', (_, itemId, collectionId) => dbOps.addItemToCollection(itemId, collectionId));
  
  ipcMain.handle('db:getTags', () => dbOps.getTags());
  ipcMain.handle('db:getTagByName', (_, name) => dbOps.getTagByName(name));
  ipcMain.handle('db:addTag', (_, name, color) => dbOps.addTag(name, color));
  ipcMain.handle('db:updateTag', (_, id, updates) => dbOps.updateTag(id, updates));
  ipcMain.handle('db:deleteTag', (_, id) => dbOps.deleteTag(id));
  ipcMain.handle('db:getItemTags', (_, itemId) => dbOps.getItemTags(itemId));
  ipcMain.handle('db:addItemTag', (_, itemId, tagId) => dbOps.addItemTag(itemId, tagId));
  ipcMain.handle('db:removeItemTag', (_, itemId, tagId) => dbOps.removeItemTag(itemId, tagId));

  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:update', (_, patch) => {
    const before = getSettings();
    const next = updateSettings(patch);
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'snapshotDir') && before.snapshotDir !== next.snapshotDir) resetDb();
    return next;
  });
  ipcMain.handle('settings:selectSnapshotDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return null;
    const dir = result.filePaths?.[0];
    if (!dir) return null;
    updateSettings({ snapshotDir: dir });
    resetDb();
    return dir;
  });

  ipcMain.handle('file:openTextFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['txt', 'md', 'markdown'] }],
    });
    if (result.canceled) return null;
    const filePath = result.filePaths?.[0];
    if (!filePath) return null;
    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) throw new Error('File too large');
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, name: path.basename(filePath), content };
  });

  ipcMain.handle('snapshot:capture', (_, url) => captureSnapshot(url));
  ipcMain.handle('snapshot:deleteLocal', async (_, snapshotPath: string) => {
    try {
      if (typeof snapshotPath !== 'string' || !snapshotPath) return false;

      let removed = false;

      if (snapshotPath.startsWith('snapshot://')) {
        const u = new URL(snapshotPath);
        const id = u.hostname;
        if (!id) return false;

        const roots = Array.from(new Set([getEffectiveSnapshotDir(), path.join(app.getPath('userData'), 'snapshots')].filter(Boolean)));
        for (const root of roots) {
          const base = path.join(root, id);
          const baseResolved = path.resolve(base);
          const rootResolved = path.resolve(root) + path.sep;
          if (!baseResolved.startsWith(rootResolved)) continue;
          if (!fs.existsSync(baseResolved)) continue;
          fs.rmSync(baseResolved, { recursive: true, force: true });
          removed = true;
        }
        return removed;
      }

      if (path.isAbsolute(snapshotPath)) {
        const p = path.resolve(snapshotPath);
        if (fs.existsSync(p)) {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
          else fs.rmSync(p, { force: true });
          removed = true;
        }
      }

      return removed;
    } catch {
      return false;
    }
  });

  ipcMain.handle('shell:showSnapshotInFolder', async (_, snapshotPath: string) => {
    try {
      if (typeof snapshotPath !== 'string' || !snapshotPath) return false;
      let resolved: string | null = null;
      if (snapshotPath.startsWith('snapshot://')) {
        resolved = resolveSnapshotFile(snapshotPath);
        if (!resolved && (snapshotPath.endsWith('/index.html') || snapshotPath.endsWith('/index.htm'))) {
          try {
            const u = new URL(snapshotPath);
            const id = u.hostname;
            const roots = Array.from(new Set([getEffectiveSnapshotDir(), path.join(app.getPath('userData'), 'snapshots')].filter(Boolean)));
            for (const root of roots) {
              const base = path.join(root, id);
              const mhtmlCandidate = path.join(base, 'snapshot.mhtml');
              if (!fs.existsSync(mhtmlCandidate)) continue;
              await ensureHtmlFromMhtml(mhtmlCandidate, base, undefined);
              resolved = resolveSnapshotFile(snapshotPath);
              if (resolved) break;
            }
          } catch {}
        }
      } else if (fs.existsSync(snapshotPath)) {
        resolved = snapshotPath;
      }

      if (!resolved) return false;
      shell.showItemInFolder(resolved);
      return true;
    } catch {
      return false;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
