# Cite

A Cubox-like desktop app for saving and reading web pages. It captures pages locally, supports offline snapshots and a reader view, and provides tags, collections, and annotations.

## Features

- Web capture: extracts page content and generates an offline snapshot (HTML + local assets).
- Snapshot cover: generates a `thumb.png` thumbnail for web snapshots.
- Three view modes for web items: Source / Snapshot / Reader.
- Reader view: Markdown and plain-text modes; Markdown supports GFM + code highlighting.
- Offline snapshots: view in-app and “Open in folder” to locate snapshot files on disk.
- Delete with cleanup: optionally delete local snapshot files when deleting an item.
- Tags and favorites: tag management (with colors), filter by tags, favorites view.
- Collections: create collections and drag items into collections.
- Annotations: highlight text and add notes in Reader (text mode), with word/sentence/paragraph granularity.

## Development

### Requirements

- Node.js (recommended 20+)
- npm

### Clone

```bash
git clone https://github.com/IronSpiderMan/Cite.git
cd Cite
```

### Run in dev

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Icons

App icons are generated from `build/icon.png` (recommended size: 1024×1024).

```bash
npm run icons
```

This writes:

- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows)

### Package

```bash
npm run dist
```

## Data & Snapshot Storage

- The database and snapshots are stored under the app data directory by default. You can change the location via Settings → Snapshot Directory.
- In development mode, Electron `userData` is set to `.cite-user-data/` under the project root for easier debugging and cleanup.

## Known Limitations

- Source mode uses an iframe; some sites may block embedding via `X-Frame-Options`/CSP. Use “Open in Browser” in that case.
- Collections currently support “create + drag-to-add” only; rename/delete/remove are not implemented yet.
- Offline snapshot fidelity depends on site behavior (loading/anti-bot); re-capture may be required for some sites.

## Tech Stack

- Electron + React + TypeScript + Vite
- SQLite (better-sqlite3)
- Tailwind CSS (Typography)

## Buy me a coffee

- China: Alipay / WeChat

  <img src="docs/donate/alipay.png" width="240" alt="Alipay" /> <img src="docs/donate/wechat.png" width="240" alt="WeChat Pay" />

- International: PayPal — https://paypal.me/zacksock
 
