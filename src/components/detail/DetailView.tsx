import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FolderOpen, Pencil, Star, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { expandToSentence, expandToWord, extractParagraphsFromHtml, extractParagraphsFromText, safeParseTextSelector } from '../../lib/reader'
import { htmlToMarkdown } from '../../lib/htmlToMarkdown'
import type { Annotation, AnnotationMode, DbTag, Item, TextSelector } from '../../types'
import { Markdown } from '../Markdown'
import { EditItemModal } from '../modals/EditItemModal'

export function DetailView({
  item,
  activeTab,
  tags,
  t,
  onBack,
  onOpenTagManager,
  onRefreshItems,
  onRefreshTags,
  onToggleFavorite,
  onUpdateItem,
}: {
  item: Item
  activeTab: string
  tags: DbTag[]
  t: (key: string) => string
  onBack: () => void
  onOpenTagManager: () => void
  onRefreshItems: () => void | Promise<void>
  onRefreshTags: () => void | Promise<void>
  onToggleFavorite: (item: Item) => void | Promise<void>
  onUpdateItem: (next: Item) => void
}) {
  const isWebUrl = /^https?:\/\//.test(item.url)
  const [detailView, setDetailView] = useState<'source' | 'snapshot' | 'reader'>(() => {
    if (item.snapshot_path) return 'snapshot'
    if (isWebUrl) return 'source'
    return 'reader'
  })
  const [readerMode, setReaderMode] = useState<'markdown' | 'text'>('markdown')
  const [readerParagraphs, setReaderParagraphs] = useState<string[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('sentence')
  const [pendingSelection, setPendingSelection] = useState<{ p: number; start: number; end: number; quote: string } | null>(null)
  const [annotationDraft, setAnnotationDraft] = useState('')
  const [itemTags, setItemTags] = useState<DbTag[]>([])
  const [tagQuery, setTagQuery] = useState('')
  const [isTagSuggestOpen, setIsTagSuggestOpen] = useState(false)
  const contentFormat = item.content_format || 'html'
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFormat, setEditFormat] = useState<'markdown' | 'text'>('markdown')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setDetailView(item.snapshot_path ? 'snapshot' : 'reader')
      setReaderMode('markdown')
      setPendingSelection(null)
      setAnnotationDraft('')
      setTagQuery('')
      setIsTagSuggestOpen(false)
      setReaderParagraphs(contentFormat === 'html' ? extractParagraphsFromHtml(item.content || '') : extractParagraphsFromText(item.content || ''))
      try {
        const rows = await window.electronAPI?.db?.getAnnotations?.(item.id)
        if (!cancelled) setAnnotations((rows as Annotation[]) || [])
      } catch {
        if (!cancelled) setAnnotations([])
      }
      try {
        const rows = await window.electronAPI?.db?.getItemTags?.(item.id)
        if (!cancelled) setItemTags((rows as DbTag[]) || [])
      } catch {
        if (!cancelled) setItemTags([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [item.id, contentFormat])

  useEffect(() => {
    setEditTitle(item.title || '')
    setEditUrl(item.url || '')
    setEditContent(item.content || '')
    setEditFormat((item.content_format === 'text' ? 'text' : 'markdown') as 'markdown' | 'text')
    setIsEditOpen(false)
    setIsSavingEdit(false)
  }, [item.id])

  const refreshAnnotations = async () => {
    const rows = await window.electronAPI.db.getAnnotations(item.id)
    setAnnotations((rows as Annotation[]) || [])
  }

  const refreshItemTags = async () => {
    const rows = await window.electronAPI.db.getItemTags(item.id)
    setItemTags((rows as DbTag[]) || [])
  }

  const handleAddAnnotation = async () => {
    if (!pendingSelection) return
    const selector: TextSelector = {
      kind: 'text',
      mode: annotationMode,
      p: pendingSelection.p,
      start: pendingSelection.start,
      end: pendingSelection.end,
      quote: pendingSelection.quote,
    }
    await window.electronAPI.db.addAnnotation({
      item_id: item.id,
      content: annotationDraft || '',
      selector: JSON.stringify(selector),
      color: '#fde68a',
    })
    setAnnotationDraft('')
    await refreshAnnotations()
  }

  const handleDeleteAnnotation = async (id: number) => {
    await window.electronAPI.db.deleteAnnotation(id)
    await refreshAnnotations()
  }

  const handleReaderMouseUp = () => {
    if (detailView !== 'reader') return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)

    const findParagraphEl = (node: Node | null): HTMLElement | null => {
      let cur: Node | null = node
      while (cur) {
        if (cur instanceof HTMLElement) {
          const v = cur.getAttribute('data-p-index')
          if (v !== null) return cur
        }
        cur = cur.parentNode
      }
      return null
    }

    const startEl = findParagraphEl(range.startContainer)
    const endEl = findParagraphEl(range.endContainer)
    if (!startEl || !endEl) return
    const pIndex = Number(startEl.getAttribute('data-p-index') || 'NaN')
    if (Number.isNaN(pIndex) || startEl !== endEl) {
      setPendingSelection(null)
      return
    }

    const fullText = readerParagraphs[pIndex] || ''
    const r0 = range.cloneRange()
    r0.selectNodeContents(startEl)
    r0.setEnd(range.startContainer, range.startOffset)
    const s0 = r0.toString().length

    const r1 = range.cloneRange()
    r1.selectNodeContents(startEl)
    r1.setEnd(range.endContainer, range.endOffset)
    const e0 = r1.toString().length

    let s = Math.max(0, Math.min(s0, e0))
    let e = Math.max(0, Math.max(s0, e0))

    if (annotationMode === 'paragraph') {
      s = 0
      e = fullText.length
    } else if (annotationMode === 'word') {
      const w = expandToWord(fullText, s, e)
      s = w.start
      e = w.end
    } else {
      const sen = expandToSentence(fullText, s, e)
      s = sen.start
      e = sen.end
    }

    if (e <= s || s < 0 || e > fullText.length) {
      setPendingSelection(null)
      return
    }

    const quote = fullText.slice(s, e).trim()
    if (!quote) {
      setPendingSelection(null)
      return
    }
    const sAdj = fullText.indexOf(quote, s)
    const eAdj = sAdj >= 0 ? sAdj + quote.length : e
    setPendingSelection({ p: pIndex, start: sAdj >= 0 ? sAdj : s, end: eAdj, quote })
  }

  const renderHighlightedParagraph = (pText: string, pIndex: number) => {
    const ranges = annotations
      .map((a) => ({ a, s: safeParseTextSelector(a.selector) }))
      .filter((x) => x.s && x.s.kind === 'text' && x.s.p === pIndex)
      .map((x) => ({
        id: x.a.id,
        start: (x.s as TextSelector).start,
        end: (x.s as TextSelector).end,
        color: x.a.color || '#fde68a',
      }))
      .filter((r) => r.start >= 0 && r.end > r.start && r.end <= pText.length)
      .sort((x, y) => x.start - y.start)

    if (!ranges.length) return pText

    const parts: React.ReactNode[] = []
    let cursor = 0
    for (const r of ranges) {
      if (r.start < cursor) continue
      if (r.start > cursor) parts.push(pText.slice(cursor, r.start))
      parts.push(
        <mark key={`${pIndex}-${r.id}`} style={{ backgroundColor: r.color }} className="px-0.5 rounded">
          {pText.slice(r.start, r.end)}
        </mark>
      )
      cursor = r.end
    }
    if (cursor < pText.length) parts.push(pText.slice(cursor))
    return parts
  }

  const availableTagSuggestions = useMemo(
    () =>
      tags
        .filter((t) => !itemTags.some((it) => it.id === t.id))
        .filter((t) => t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()))
        .slice(0, 8),
    [tags, itemTags, tagQuery]
  )

  const readerMarkdown = useMemo(() => {
    if (contentFormat === 'markdown' || contentFormat === 'text') return item.content || ''
    return htmlToMarkdown(item.content || '', item.url)
  }, [item.content, item.url, contentFormat])

  const handleAddOrCreateTagToItem = async () => {
    const q = tagQuery.trim()
    if (!q) return
    try {
      let tag = tags.find((t) => t.name.toLowerCase() === q.toLowerCase())
      if (!tag) {
        try {
          await window.electronAPI.db.addTag(q, '#60a5fa')
        } catch {}
        const fetched = await window.electronAPI.db.getTagByName(q)
        if (fetched) tag = fetched as DbTag
      }
      if (!tag) return
      await window.electronAPI.db.addItemTag(item.id, tag.id)
      setTagQuery('')
      setIsTagSuggestOpen(false)
      await onRefreshTags()
      await refreshItemTags()
      if (activeTab.startsWith('tag:')) onRefreshItems()
    } catch (error) {
      console.error('Failed to add item tag:', error)
    }
  }

  const handleRemoveTagFromItem = async (tagId: number) => {
    try {
      await window.electronAPI.db.removeItemTag(item.id, tagId)
      await refreshItemTags()
      if (activeTab.startsWith('tag:')) onRefreshItems()
    } catch (error) {
      console.error('Failed to remove item tag:', error)
    }
  }

  const handleOpenSnapshotInFolder = async () => {
    try {
      if (!item.snapshot_path) return
      await window.electronAPI.shell.showSnapshotInFolder(item.snapshot_path)
    } catch (error) {
      console.error('Failed to show snapshot in folder:', error)
    }
  }

  const canEditContent = (item.content_format || 'html') === 'markdown' || (item.content_format || 'html') === 'text'

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingEdit) return
    setIsSavingEdit(true)
    try {
      const updates: any = {
        title: editTitle.trim() || t('items.untitled'),
        url: editUrl.trim() || item.url,
      }
      if (canEditContent) {
        updates.content = editContent
        updates.content_format = editFormat
      }
      await window.electronAPI.db.updateItem(item.id, updates)
      const next: Item = { ...item, ...updates }
      onUpdateItem(next)
      await onRefreshItems()
      setIsEditOpen(false)
    } catch (error) {
      console.error('Failed to update item:', error)
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <>
      <EditItemModal
        open={isEditOpen}
        title={editTitle}
        url={editUrl}
        content={editContent}
        contentFormat={editFormat}
        canEditContent={canEditContent}
        isSaving={isSavingEdit}
        t={t}
        onChangeTitle={setEditTitle}
        onChangeUrl={setEditUrl}
        onChangeContent={setEditContent}
        onChangeContentFormat={setEditFormat}
        onClose={() => {
          if (isSavingEdit) return
          setIsEditOpen(false)
        }}
        onSave={handleSaveEdit}
      />
      <header className="h-11 border-b border-border flex items-center justify-between px-4 drag-region bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="p-1 hover:bg-muted rounded-md -ml-1 no-drag" title="Back">
            <X size={18} />
          </button>
          <h1 className="text-sm font-semibold truncate" title={item.title}>
            {item.title}
          </h1>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => setIsEditOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title={t('modal.editItem.title')}
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onToggleFavorite(item)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              item.is_favorite ? 'text-yellow-500 hover:bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title={item.is_favorite ? 'Unfavorite' : 'Favorite'}
          >
            <Star size={18} fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>
          {/^https?:\/\//.test(item.url) ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Open in Browser">
              <ExternalLink size={18} />
            </a>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDetailView('source')}
            disabled={!isWebUrl}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md border transition-colors',
              !isWebUrl
                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                : detailView === 'source'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {t('detail.sourcePage')}
          </button>
          <button
            onClick={() => setDetailView('snapshot')}
            disabled={!item.snapshot_path}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md border transition-colors',
              !item.snapshot_path
                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                : detailView === 'snapshot'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {t('detail.snapshot')}
          </button>
          <button
            onClick={() => setDetailView('reader')}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md border transition-colors',
              detailView === 'reader' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {t('detail.reader')}
          </button>
          {detailView === 'snapshot' && item.snapshot_path ? (
            <button
              onClick={handleOpenSnapshotInFolder}
              className="ml-auto px-3 py-1.5 text-xs rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <FolderOpen size={14} />
              {t('detail.openInFolder')}
            </button>
          ) : null}
        </div>

        {detailView === 'source' ? (
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20 min-h-[calc(100vh-220px)]">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-background/60">
              {t('detail.sourceEmbedHint')}
            </div>
            <iframe src={item.url} className="w-full h-[calc(100vh-260px)] border-none bg-white" title="Source" />
          </div>
        ) : detailView === 'snapshot' ? (
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20 min-h-[calc(100vh-220px)]">
            {!item.snapshot_path ? (
              <div className="h-[calc(100vh-220px)] flex items-center justify-center text-sm text-muted-foreground">{t('detail.snapshotEmpty')}</div>
            ) : item.snapshot_path.startsWith('snapshot://') || item.snapshot_path.endsWith('.mhtml') || item.snapshot_path.endsWith('.html') ? (
              <iframe
                src={
                  item.snapshot_path.endsWith('.mhtml') || item.snapshot_path.endsWith('.mht')
                    ? item.snapshot_path.replace(/\/[^/]+$/, '/index.html')
                    : item.snapshot_path
                }
                className="w-full h-[calc(100vh-220px)] border-none bg-white"
                title="Snapshot"
              />
            ) : (
              <img src={item.snapshot_path} alt={item.title} className="w-full h-auto" />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('detail.reader.mode')}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setReaderMode('markdown')
                      setPendingSelection(null)
                    }}
                    className={cn(
                      'px-2 py-1 text-[11px] rounded-md border',
                      readerMode === 'markdown' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {t('detail.reader.markdown')}
                  </button>
                  {contentFormat !== 'markdown' ? (
                    <button
                      onClick={() => setReaderMode('text')}
                      className={cn(
                        'px-2 py-1 text-[11px] rounded-md border',
                        readerMode === 'text' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'
                      )}
                    >
                      {t('detail.reader.text')}
                    </button>
                  ) : null}
                </div>
              </div>

              {readerMode === 'markdown' ? (
                <div className="p-4">
                  {readerMarkdown ? (
                    <Markdown value={readerMarkdown} />
                  ) : (
                    <div className="text-sm text-muted-foreground">{t('detail.reader.mdEmpty')}</div>
                  )}
                </div>
              ) : (
                <div onMouseUp={handleReaderMouseUp} className="p-4">
                  <div className="space-y-3 leading-relaxed">
                    {readerParagraphs.length ? (
                      readerParagraphs.map((p, idx) => (
                        <div key={idx} data-p-index={idx} className="text-sm whitespace-pre-wrap select-text">
                          {renderHighlightedParagraph(p, idx)}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('detail.reader.empty')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAnnotationMode('word')}
                    className={cn('px-2 py-1 text-[11px] rounded-md border', annotationMode === 'word' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground')}
                  >
                    {t('detail.annotations.word')}
                  </button>
                  <button
                    onClick={() => setAnnotationMode('sentence')}
                    className={cn('px-2 py-1 text-[11px] rounded-md border', annotationMode === 'sentence' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground')}
                  >
                    {t('detail.annotations.sentence')}
                  </button>
                  <button
                    onClick={() => setAnnotationMode('paragraph')}
                    className={cn('px-2 py-1 text-[11px] rounded-md border', annotationMode === 'paragraph' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground')}
                  >
                    {t('detail.annotations.paragraph')}
                  </button>
                </div>
                <button
                  onClick={handleAddAnnotation}
                  disabled={!pendingSelection || readerMode !== 'text'}
                  className={cn('px-3 py-1.5 text-xs rounded-md border transition-colors', pendingSelection ? 'bg-primary text-primary-foreground border-primary hover:opacity-90' : 'bg-muted text-muted-foreground border-border cursor-not-allowed')}
                >
                  {t('detail.annotations.add')}
                </button>
              </div>

              <div className="p-3 space-y-3">
                {pendingSelection ? (
                  <div className="text-xs text-muted-foreground border border-border rounded-md p-3 bg-muted/10">
                    <div className="font-medium text-foreground mb-1">{t('detail.annotations.selected')}</div>
                    <div className="leading-relaxed">{pendingSelection.quote}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">{t('detail.annotations.selectHint')}</div>
                )}

                <textarea
                  value={annotationDraft}
                  onChange={(e) => setAnnotationDraft(e.target.value)}
                  placeholder={t('detail.annotations.notePlaceholder')}
                  className="w-full h-24 p-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm leading-relaxed"
                />

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{t('detail.annotations')}</h3>
                    <span className="text-xs text-muted-foreground">{annotations.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-470px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {annotations.length ? (
                      annotations.map((a) => {
                        const s = safeParseTextSelector(a.selector)
                        const quote = s?.kind === 'text' ? s.quote : ''
                        return (
                          <div key={a.id} className="border border-border rounded-md p-3 bg-muted/10">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground mb-1">{quote}</div>
                                {a.content ? <div className="text-sm leading-relaxed">{a.content}</div> : null}
                              </div>
                              <button onClick={() => handleDeleteAnnotation(a.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md" title="Delete">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('detail.annotations.none')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('detail.tags')}</div>
            <button onClick={onOpenTagManager} className="text-xs text-muted-foreground hover:text-foreground">
              {t('detail.manageTags')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {itemTags.length ? (
              itemTags.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-border bg-muted/10 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#60a5fa' }} />
                  <span className="max-w-[180px] truncate">{t.name}</span>
                  <button onClick={() => handleRemoveTagFromItem(t.id)} className="p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded" title="Remove">
                    <X size={14} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">{t('detail.tags.none')}</span>
            )}
          </div>

          <div className="mt-3 relative">
            <div className="flex items-center gap-2">
              <input
                value={tagQuery}
                onChange={(e) => {
                  setTagQuery(e.target.value)
                  setIsTagSuggestOpen(true)
                }}
                onFocus={() => setIsTagSuggestOpen(true)}
                onBlur={() => setTimeout(() => setIsTagSuggestOpen(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddOrCreateTagToItem()
                  }
                }}
                placeholder={t('detail.tags.inputPlaceholder')}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
              <button
                onClick={handleAddOrCreateTagToItem}
                disabled={!tagQuery.trim()}
                className={cn(
                  'px-3 py-2 text-xs rounded-md border transition-colors',
                  tagQuery.trim() ? 'bg-primary text-primary-foreground border-primary hover:opacity-90' : 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                )}
              >
                {t('detail.tags.add')}
              </button>
            </div>
            {isTagSuggestOpen && tagQuery.trim() && availableTagSuggestions.length ? (
              <div className="absolute left-0 right-0 mt-2 rounded-md border border-border bg-background shadow-lg overflow-hidden z-20">
                {availableTagSuggestions.map((t) => (
                  <button
                    key={t.id}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setTagQuery(t.name)
                      setIsTagSuggestOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#60a5fa' }} />
                    <span className="flex-1 truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          <p>
            {t('detail.source')}: {item.url}
          </p>
          <p>
            {t('detail.captured')}: {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
      </main>
    </>
  )
}
