import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

function decodeQuotedPrintable(input: string) {
  const s = input.replace(/=\r?\n/g, '')
  const bytes: number[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '=' && i + 2 < s.length) {
      const hex = s.slice(i + 1, i + 3)
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16))
        i += 2
        continue
      }
    }
    bytes.push(s.charCodeAt(i) & 0xff)
  }
  return Buffer.from(bytes)
}

function parseHeaderBlock(block: string) {
  const lines = block.split(/\r?\n/)
  const headers: Record<string, string> = {}
  let currentKey: string | null = null
  for (const line of lines) {
    if (!line.trim()) continue
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] = `${headers[currentKey]} ${line.trim()}`
      continue
    }
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const val = line.slice(idx + 1).trim()
    headers[key] = val
    currentKey = key
  }
  return headers
}

function extFromContentType(contentType: string) {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim()
  if (ct === 'text/css') return '.css'
  if (ct === 'text/html') return '.html'
  if (ct === 'text/javascript' || ct === 'application/javascript') return '.js'
  if (ct === 'application/json') return '.json'
  if (ct === 'image/png') return '.png'
  if (ct === 'image/jpeg') return '.jpg'
  if (ct === 'image/gif') return '.gif'
  if (ct === 'image/webp') return '.webp'
  if (ct === 'image/svg+xml') return '.svg'
  if (ct === 'font/woff') return '.woff'
  if (ct === 'font/woff2') return '.woff2'
  if (ct === 'font/ttf') return '.ttf'
  if (ct === 'font/otf') return '.otf'
  return ''
}

function safeRelPath(p: string) {
  const cleaned = p.replace(/^\/*/, '').replace(/\\/g, '/')
  const parts = cleaned.split('/').filter(Boolean).filter((seg) => seg !== '.' && seg !== '..')
  return parts.join(path.sep)
}

function sanitizeSegment(seg: string) {
  return seg
    .replace(/^[.\s]+/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 200)
}

function toPosix(p: string) {
  return p.replace(/\\/g, '/')
}

function rewriteCidEverywhere(urlToRel: Record<string, string>, input: string) {
  let out = input
  for (const [k, rel] of Object.entries(urlToRel)) {
    if (!k.startsWith('cid:')) continue
    out = out.split(k).join(rel)
  }
  return out
}

function resolveToRel(map: Record<string, string>, fileNameToRel: Record<string, string | null>, rawUrl: string) {
  const s = (rawUrl || '').trim()
  if (!s) return null
  if (s.startsWith('data:')) return null
  const direct = map[s]
  if (direct) return direct

  if (s.startsWith('cid:')) {
    return map[s] || null
  }

  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s)
      const candidates = [
        u.toString(),
        `${u.origin}${u.pathname}${u.search || ''}`,
        `${u.origin}${u.pathname}`,
        `${u.pathname}${u.search || ''}`,
        u.pathname,
      ]
      for (const c of candidates) {
        const hit = map[c]
        if (hit) return hit
      }
      const base = path.posix.basename(u.pathname || '')
      if (base) {
        const hit = fileNameToRel[base]
        if (hit) return hit
      }
    } catch {}
  }

  if (s.startsWith('/')) {
    const q = s.indexOf('?')
    const candidates = q !== -1 ? [s, s.slice(0, q)] : [s]
    for (const c of candidates) {
      const hit = map[c]
      if (hit) return hit
    }
    const base = path.posix.basename(candidates[0] || '')
    if (base) {
      const hit = fileNameToRel[base]
      if (hit) return hit
    }
  }

  return null
}

function rewriteHtmlText(map: Record<string, string>, fileNameToRel: Record<string, string | null>, input: string) {
  let out = input

  out = out.replace(/(\b(?:src|href|poster|data-src|data-href)\s*=\s*)(["'])([^"']+)\2/gi, (m, p1, q, url) => {
    const rel = resolveToRel(map, fileNameToRel, url)
    if (!rel) return m
    return `${p1}${q}${rel}${q}`
  })

  out = out.replace(/(\bsrcset\s*=\s*)(["'])([^"']+)\2/gi, (m, p1, q, value) => {
    const parts = String(value)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const segs = p.split(/\s+/).filter(Boolean)
        const u = segs[0]
        const rel = resolveToRel(map, fileNameToRel, u)
        if (!rel) return null
        return [rel, ...segs.slice(1)].join(' ')
      })
      .filter(Boolean) as string[]
    if (parts.length === 0) return m
    return `${p1}${q}${parts.join(', ')}${q}`
  })

  return out
}

function rewriteCssText(map: Record<string, string>, fileNameToRel: Record<string, string | null>, input: string) {
  let out = input

  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, url) => {
    const rel = resolveToRel(map, fileNameToRel, url)
    if (!rel) return m
    return `url(${q || ''}${rel}${q || ''})`
  })

  out = out.replace(/@import\s+(?:url\(\s*)?(["'])([^"']+)\1\s*\)?/gi, (m, q, url) => {
    const rel = resolveToRel(map, fileNameToRel, url)
    if (!rel) return m
    return `@import ${q}${rel}${q}`
  })

  return out
}

function rewriteTextFilesUnder(outDir: string, map: Record<string, string>, fileNameToRel: Record<string, string | null>) {
  const root = path.join(outDir, 'assets')
  const stack = [root]
  while (stack.length) {
    const cur = stack.pop()!
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const abs = path.join(cur, e.name)
      if (e.isDirectory()) {
        stack.push(abs)
        continue
      }
      const ext = path.extname(e.name).toLowerCase()
      if (ext !== '.html' && ext !== '.htm' && ext !== '.css' && ext !== '.svg') continue
      try {
        const buf = fs.readFileSync(abs)
        const text = buf.toString('utf8')
        const rewritten0 = ext === '.css' ? rewriteCssText(map, fileNameToRel, text) : rewriteHtmlText(map, fileNameToRel, text)
        const rewritten = rewriteCidEverywhere(map, rewritten0)
        if (rewritten !== text) fs.writeFileSync(abs, rewritten, 'utf8')
      } catch {}
    }
  }
}

export async function materializeMhtmlToDir(mhtmlPath: string, outDir: string, originUrl?: string) {
  const raw = fs.readFileSync(mhtmlPath)
  const text = raw.toString('utf8')
  const headerEnd = text.indexOf('\r\n\r\n') !== -1 ? text.indexOf('\r\n\r\n') : text.indexOf('\n\n')
  if (headerEnd === -1) throw new Error('Invalid MHTML: missing header')
  const topHeaders = parseHeaderBlock(text.slice(0, headerEnd))
  const baseUrl = originUrl || topHeaders['snapshot-content-location'] || topHeaders['content-location'] || undefined
  const ct = topHeaders['content-type'] || ''
  const boundaryMatch =
    ct.match(/boundary="([^"]+)"/i) ||
    ct.match(/boundary=([^\s;]+)/i)
  const boundary = boundaryMatch?.[1]
  if (!boundary) throw new Error('Invalid MHTML: missing boundary')

  const delim = `--${boundary}`

  const body = text.slice(headerEnd + (text.slice(headerEnd).startsWith('\r\n\r\n') ? 4 : 2))
  const chunks = body.split(delim).map((c) => c.replace(/^\r?\n/, '')).filter((c) => c && c.trim() && !c.trim().startsWith('--'))
  const urlToRel: Record<string, string> = {}
  const fileNameToRel: Record<string, string | null> = {}
  let html: string | null = null

  for (const chunk of chunks) {
    if (chunk.trim().startsWith('--')) continue
    const splitIdx = chunk.indexOf('\r\n\r\n') !== -1 ? chunk.indexOf('\r\n\r\n') : chunk.indexOf('\n\n')
    if (splitIdx === -1) continue
    const headerBlock = chunk.slice(0, splitIdx)
    const partHeaders = parseHeaderBlock(headerBlock)
    const partBody = chunk.slice(splitIdx + (chunk.slice(splitIdx).startsWith('\r\n\r\n') ? 4 : 2)).replace(/\r?\n$/, '')

    const contentType = partHeaders['content-type'] || ''
    const transfer = (partHeaders['content-transfer-encoding'] || '').toLowerCase()
    const contentLocation = partHeaders['content-location'] || ''
    const contentIdRaw = partHeaders['content-id'] || ''
    const contentId = contentIdRaw.replace(/[<>]/g, '').trim()
    const cidKey = contentId ? `cid:${contentId}` : ''
    const primaryKey = contentLocation || cidKey

    let data: Buffer
    if (transfer === 'base64') {
      data = Buffer.from(partBody.replace(/\s+/g, ''), 'base64')
    } else if (transfer === 'quoted-printable') {
      data = decodeQuotedPrintable(partBody)
    } else {
      data = Buffer.from(partBody, 'utf8')
    }

    const isHtml = (contentType || '').toLowerCase().startsWith('text/html')
    if (isHtml && html === null) {
      html = data.toString('utf8')
      continue
    }

    if (!primaryKey) continue

    let u: URL | null = null
    try {
      u = baseUrl ? new URL(primaryKey, baseUrl) : new URL(primaryKey)
    } catch {
      u = null
    }

    const preferredExt = extFromContentType(contentType)
    let rel: string

    if (u && (u.protocol === 'http:' || u.protocol === 'https:')) {
      rel = path.join('assets', safeRelPath(u.hostname || 'local'), safeRelPath(u.pathname || ''))
    } else if (u && u.protocol === 'cid:') {
      const cidPath = (u.pathname || '').replace(/^\/*/, '')
      rel = safeRelPath(cidPath)
      if (!rel) {
        rel = path.join('assets', 'local', sanitizeSegment(u.href.replace(/^cid:/i, '')) || crypto.randomBytes(8).toString('hex'))
      }
      if (!rel.startsWith(`assets${path.sep}`)) rel = path.join('assets', 'local', rel)
    } else {
      rel = safeRelPath(contentLocation)
      if (!rel) rel = path.join('assets', 'local', crypto.randomBytes(8).toString('hex'))
      if (!rel.startsWith(`assets${path.sep}`)) rel = path.join('assets', 'local', rel)
    }

    const curExt = path.extname(rel)
    if (preferredExt && (!curExt || curExt === '.blink')) {
      rel = curExt ? rel.slice(0, -curExt.length) + preferredExt : rel + preferredExt
    }

    const abs = path.join(outDir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, data)

    const relPosix = toPosix(rel)
    const baseName = path.posix.basename(relPosix)
    if (baseName) {
      if (!(baseName in fileNameToRel)) fileNameToRel[baseName] = relPosix
    }
    const add = (k: string) => {
      const key = (k || '').trim()
      if (!key) return
      if (!(key.startsWith('http://') || key.startsWith('https://') || key.startsWith('cid:') || key.startsWith('/'))) return
      urlToRel[key] = relPosix
    }

    add(primaryKey)
    if (cidKey) add(cidKey)
    if (u) {
      add(u.toString())
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        add(`${u.origin}${u.pathname}${u.search || ''}`)
        add(`${u.origin}${u.pathname}`)
        add(`${u.pathname}${u.search || ''}`)
        add(u.pathname)
      }
    }
  }

  const outHtml = path.join(outDir, 'index.html')
  if (!html) throw new Error('Invalid MHTML: missing HTML part')

  const rewritten = rewriteCidEverywhere(urlToRel, rewriteHtmlText(urlToRel, fileNameToRel, html))

  fs.writeFileSync(outHtml, rewritten, 'utf8')
  rewriteTextFilesUnder(outDir, urlToRel, fileNameToRel)
  return outHtml
}
