function resolveUrl(baseUrl: string, raw: string) {
  const v = (raw || '').trim()
  if (!v) return ''
  if (v.startsWith('data:') || v.startsWith('blob:') || v.startsWith('mailto:') || v.startsWith('tel:')) return v
  try {
    return new URL(v, baseUrl).toString()
  } catch {
    return v
  }
}

function textOf(node: Node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim()
}

function escapeInline(s: string) {
  return s.replace(/([\\`*_{}\[\]()#+\-.!>])/g, '\\$1')
}

function inlineToMarkdown(node: Node, baseUrl: string): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeInline((node.textContent || '').replace(/\s+/g, ' '))
  if (!(node instanceof HTMLElement)) return ''

  const tag = node.tagName.toLowerCase()
  if (tag === 'br') return '\n'
  if (tag === 'code') return `\`${(node.textContent || '').replace(/`/g, '\\`')}\``
  if (tag === 'em' || tag === 'i') return `*${Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('')}*`
  if (tag === 'strong' || tag === 'b') return `**${Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('')}**`
  if (tag === 'a') {
    const href = resolveUrl(baseUrl, node.getAttribute('href') || '')
    const label = Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('') || escapeInline(textOf(node))
    if (!href) return label
    return `[${label}](${href})`
  }
  if (tag === 'img') {
    const src = resolveUrl(baseUrl, node.getAttribute('src') || '')
    const alt = escapeInline(node.getAttribute('alt') || '')
    if (!src) return ''
    return `![${alt}](${src})`
  }

  return Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('')
}

function blockToMarkdown(node: Node, baseUrl: string, out: string[]) {
  if (!(node instanceof HTMLElement)) return
  const tag = node.tagName.toLowerCase()

  if (tag === 'script' || tag === 'style' || tag === 'noscript') return

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    const level = Number(tag.slice(1))
    const text = Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('').trim()
    if (text) out.push(`${'#'.repeat(level)} ${text}`)
    return
  }

  if (tag === 'p') {
    const md = Array.from(node.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('').trim()
    if (md) out.push(md)
    return
  }

  if (tag === 'img') {
    const md = inlineToMarkdown(node, baseUrl).trim()
    if (md) out.push(md)
    return
  }

  if (tag === 'pre') {
    const code = node.textContent || ''
    out.push(['```', code.replace(/\s+$/, ''), '```'].join('\n'))
    return
  }

  if (tag === 'blockquote') {
    const inner: string[] = []
    Array.from(node.childNodes).forEach((n) => blockToMarkdown(n, baseUrl, inner))
    const text = (inner.join('\n\n') || textOf(node)).split('\n').map((l) => l.trim()).filter(Boolean)
    if (text.length) out.push(text.map((l) => `> ${l}`).join('\n'))
    return
  }

  if (tag === 'ul' || tag === 'ol') {
    const isOrdered = tag === 'ol'
    const items = Array.from(node.children).filter((c) => c.tagName.toLowerCase() === 'li') as HTMLElement[]
    const lines: string[] = []
    items.forEach((li, idx) => {
      const prefix = isOrdered ? `${idx + 1}. ` : '- '
      const md = Array.from(li.childNodes).map((n) => inlineToMarkdown(n, baseUrl)).join('').trim()
      if (md) lines.push(`${prefix}${md}`)
    })
    if (lines.length) out.push(lines.join('\n'))
    return
  }

  if (tag === 'hr') {
    out.push('---')
    return
  }

  if (tag === 'figure') {
    const img = node.querySelector('img')
    if (img) {
      const md = inlineToMarkdown(img, baseUrl).trim()
      if (md) out.push(md)
    }
    const cap = node.querySelector('figcaption')
    if (cap) {
      const capText = textOf(cap)
      if (capText) out.push(`*${escapeInline(capText)}*`)
    }
    return
  }

  Array.from(node.childNodes).forEach((n) => {
    if (n instanceof HTMLElement) blockToMarkdown(n, baseUrl, out)
  })
}

export function htmlToMarkdown(html: string, baseUrl: string) {
  try {
    const doc = new DOMParser().parseFromString(html || '', 'text/html')
    doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove())
    const out: string[] = []
    const body = doc.body || doc.documentElement
    Array.from(body.childNodes).forEach((n) => {
      if (n instanceof HTMLElement) blockToMarkdown(n, baseUrl, out)
    })
    return out.map((s) => s.trim()).filter(Boolean).join('\n\n')
  } catch {
    return ''
  }
}
