import type { TextSelector } from '../types'

export function safeParseTextSelector(selector: string): TextSelector | null {
  try {
    const obj = JSON.parse(selector) as Partial<TextSelector>
    if (
      obj &&
      obj.kind === 'text' &&
      (obj.mode === 'word' || obj.mode === 'sentence' || obj.mode === 'paragraph') &&
      typeof obj.p === 'number' &&
      typeof obj.start === 'number' &&
      typeof obj.end === 'number' &&
      typeof obj.quote === 'string'
    ) {
      return obj as TextSelector
    }
    return null
  } catch {
    return null
  }
}

export function extractParagraphsFromHtml(html: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove())
    const ps = Array.from(doc.querySelectorAll('p'))
      .map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (ps.length >= 3) return ps
    const bodyText = (doc.body?.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean)
    const merged: string[] = []
    for (const line of bodyText) {
      if (!merged.length) merged.push(line)
      else if (merged[merged.length - 1].length < 60) merged[merged.length - 1] = `${merged[merged.length - 1]} ${line}`
      else merged.push(line)
    }
    return merged.filter((s) => s.length >= 2)
  } catch {
    return []
  }
}

export function extractParagraphsFromText(text: string): string[] {
  const raw = (text || '').replace(/\r\n/g, '\n')
  const blocks = raw
    .split(/\n\s*\n+/)
    .map((s) => s.replace(/[ \t]+\n/g, '\n').trim())
    .filter(Boolean)
  if (blocks.length) return blocks
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isWordChar(ch: string) {
  if (!ch) return false
  try {
    return /[\p{L}\p{N}\p{Script=Han}_]/u.test(ch)
  } catch {
    return /[A-Za-z0-9_]/.test(ch) || /[\u4e00-\u9fff]/.test(ch)
  }
}

export function expandToWord(text: string, start: number, end: number) {
  let s = Math.min(start, end)
  let e = Math.max(start, end)
  if (s === e) {
    if (s > 0 && isWordChar(text[s - 1])) s = s - 1
    if (!isWordChar(text[s])) return { start: s, end: e }
    e = s + 1
  }
  while (s > 0 && isWordChar(text[s - 1])) s -= 1
  while (e < text.length && isWordChar(text[e])) e += 1
  return { start: s, end: e }
}

export function expandToSentence(text: string, start: number, end: number) {
  const s0 = Math.min(start, end)
  const e0 = Math.max(start, end)
  const before = text.slice(0, s0)
  const after = text.slice(e0)
  const delims = /[.!?。！？\n]/g
  let left = 0
  let m: RegExpExecArray | null = null
  while ((m = delims.exec(before)) !== null) left = m.index + m[0].length
  const next = /[.!?。！？\n]/.exec(after)
  let right = next ? e0 + next.index + next[0].length : text.length
  while (left < right && /\s/.test(text[left])) left += 1
  while (right > left && /\s/.test(text[right - 1])) right -= 1
  return { start: left, end: right }
}
