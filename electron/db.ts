import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getEffectiveSnapshotDir } from './settings';

let _db: Database.Database | null = null;

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      content TEXT,
      snapshot_path TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      item_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_collections (
      item_id INTEGER,
      collection_id INTEGER,
      PRIMARY KEY (item_id, collection_id),
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      content TEXT,
      selector TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec('ALTER TABLE items ADD COLUMN content_format TEXT DEFAULT "html"');
  } catch {}
  try {
    db.exec('ALTER TABLE items ADD COLUMN status TEXT DEFAULT "completed"');
  } catch {}
  try {
    db.exec('UPDATE items SET content_format = "html" WHERE content_format IS NULL');
  } catch {}
  
  // Reset pending items to failed on startup to avoid stuck spinners
  try {
    db.exec("UPDATE items SET status = 'failed' WHERE status = 'pending'");
  } catch {}
}

function legacyDbCandidates() {
  return [
    path.join(app.getPath('userData'), 'cite.db'),
    path.join(process.cwd(), '.cite-data', 'cite.db'),
    path.join(app.getPath('temp'), 'cite.db'),
    path.join(process.cwd(), 'cite.db'),
  ];
}

function ensureWritableDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, '.probe');
  fs.writeFileSync(probe, '1');
  fs.unlinkSync(probe);
}

function resolveDbPath() {
  const root = getEffectiveSnapshotDir();
  ensureWritableDir(root);
  const target = path.join(root, 'cite.db');

  if (!fs.existsSync(target)) {
    for (const legacy of legacyDbCandidates()) {
      if (!fs.existsSync(legacy)) continue;
      try {
        fs.copyFileSync(legacy, target);
        const wal = `${legacy}-wal`;
        const shm = `${legacy}-shm`;
        if (fs.existsSync(wal)) fs.copyFileSync(wal, `${target}-wal`);
        if (fs.existsSync(shm)) fs.copyFileSync(shm, `${target}-shm`);
        break;
      } catch {}
    }
  }

  return target;
}

function getDb() {
  if (_db) return _db;
  _db = new Database(resolveDbPath());
  initSchema(_db);
  return _db;
}

export function initDb() {
  getDb();
}

export function resetDb() {
  if (!_db) return;
  try {
    _db.close();
  } catch {}
  _db = null;
}

export const dbOps = {
  // Items
  getItems: (filter: 'all' | 'favorites' | { collectionId?: number, tagId?: number } = 'all') => {
    const db = getDb();
    if (filter === 'all') {
      return db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    } else if (filter === 'favorites') {
      return db.prepare('SELECT * FROM items WHERE is_favorite = 1 ORDER BY created_at DESC').all();
    } else if (typeof filter === 'object') {
        if (filter.collectionId) {
             return db.prepare(`
                SELECT i.* FROM items i
                JOIN item_collections ic ON i.id = ic.item_id
                WHERE ic.collection_id = ?
                ORDER BY i.created_at DESC
            `).all(filter.collectionId);
        }
        if (filter.tagId) {
             return db.prepare(`
                SELECT i.* FROM items i
                JOIN item_tags it ON i.id = it.item_id
                WHERE it.tag_id = ?
                ORDER BY i.created_at DESC
            `).all(filter.tagId);
        }
    }
    return [];
  },
  addItem: (item: { url: string, title: string, description?: string, content?: string, content_format?: 'html' | 'markdown' | 'text', snapshot_path?: string | null, status?: string }) => {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO items (url, title, description, content, content_format, snapshot_path, status) VALUES (@url, @title, @description, @content, @content_format, @snapshot_path, @status)'
    );
    return stmt.run({ content_format: 'html', snapshot_path: null, status: 'completed', description: '', ...item });
  },
  updateItem: (id: number, updates: any) => {
     const db = getDb();
     // Dynamic update query
     const keys = Object.keys(updates);
     const setClause = keys.map(key => `${key} = @${key}`).join(', ');
     const stmt = db.prepare(`UPDATE items SET ${setClause} WHERE id = @id`);
     return stmt.run({ ...updates, id });
  },
  deleteItem: (id: number) => {
    const db = getDb();
    return db.prepare('DELETE FROM items WHERE id = ?').run(id);
  },

  // Annotations
  getAnnotations: (itemId: number) => {
    const db = getDb();
    return db
      .prepare('SELECT * FROM annotations WHERE item_id = ? ORDER BY created_at ASC')
      .all(itemId);
  },
  addAnnotation: (annotation: { item_id: number; content?: string; selector: string; color?: string }) => {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO annotations (item_id, content, selector, color) VALUES (@item_id, @content, @selector, @color)'
    );
    return stmt.run(annotation);
  },
  updateAnnotation: (id: number, updates: any) => {
    const db = getDb();
    const keys = Object.keys(updates);
    const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`UPDATE annotations SET ${setClause} WHERE id = @id`);
    return stmt.run({ ...updates, id });
  },
  deleteAnnotation: (id: number) => {
    const db = getDb();
    return db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
  },

  // Collections
  getCollections: () => getDb().prepare('SELECT * FROM collections').all(),
  addCollection: (name: string) => getDb().prepare('INSERT INTO collections (name) VALUES (?)').run(name),

  // Tags
  getTags: () => getDb().prepare('SELECT * FROM tags').all(),
  getTagByName: (name: string) => getDb().prepare('SELECT * FROM tags WHERE name = ?').get(name),
  addTag: (name: string, color?: string) => getDb().prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color),
  updateTag: (id: number, updates: { name?: string; color?: string | null }) => {
    const db = getDb();
    const keys = Object.keys(updates);
    const setClause = keys.map((key) => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`UPDATE tags SET ${setClause} WHERE id = @id`);
    return stmt.run({ ...updates, id });
  },
  deleteTag: (id: number) => {
    const db = getDb();
    return db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },
  
  // Relations
  addItemToCollection: (itemId: number, collectionId: number) => {
      return getDb().prepare('INSERT OR IGNORE INTO item_collections (item_id, collection_id) VALUES (?, ?)').run(itemId, collectionId);
  },
  addItemTag: (itemId: number, tagId: number) => {
      return getDb().prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tagId);
  },
  removeItemTag: (itemId: number, tagId: number) => {
      return getDb().prepare('DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?').run(itemId, tagId);
  },
  getItemTags: (itemId: number) => {
      return getDb().prepare(`
        SELECT t.* FROM tags t
        JOIN item_tags it ON t.id = it.tag_id
        WHERE it.item_id = ?
        ORDER BY t.name ASC
      `).all(itemId);
  }
};
