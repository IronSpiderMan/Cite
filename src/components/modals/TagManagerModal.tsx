import { useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DbTag } from '../../types'

export function TagManagerModal({
  open,
  tags,
  t,
  onClose,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: {
  open: boolean
  tags: DbTag[]
  t: (key: string) => string
  onClose: () => void
  onCreateTag: (name: string, color: string) => void | Promise<void>
  onUpdateTag: (id: number, updates: { name: string; color: string }) => void | Promise<void>
  onDeleteTag: (id: number) => void | Promise<void>
}) {
  const [editingTagId, setEditingTagId] = useState<number | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#60a5fa')

  const resetEditor = () => {
    setEditingTagId(null)
    setTagName('')
    setTagColor('#60a5fa')
  }

  const close = () => {
    resetEditor()
    onClose()
  }

  const submit = async () => {
    const name = tagName.trim()
    if (!name) return
    if (editingTagId == null) await onCreateTag(name, tagColor)
    else await onUpdateTag(editingTagId, { name, color: tagColor })
    resetEditor()
  }

  const startEdit = (tag: DbTag) => {
    setEditingTagId(tag.id)
    setTagName(tag.name)
    setTagColor(tag.color || '#60a5fa')
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold">{t('modal.tagManager.title')}</h2>
          <button onClick={close} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {editingTagId == null ? t('modal.tagManager.create') : t('modal.tagManager.edit')}
            </div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-8">
                <input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder={t('modal.tagManager.namePlaceholder')}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div className="col-span-2">
                <input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} className="w-full h-10 p-1 rounded-md border border-border bg-background" />
              </div>
              <div className="col-span-2 flex justify-end">
                <button onClick={submit} disabled={!tagName.trim()} className={cn('px-3 py-2 text-xs rounded-md transition-colors', tagName.trim() ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
                  {editingTagId == null ? t('modal.tagManager.add') : t('modal.tagManager.save')}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">{t('modal.tagManager.existing')}</div>
              {editingTagId != null ? (
                <button onClick={resetEditor} className="text-xs text-muted-foreground hover:text-foreground">
                  {t('modal.tagManager.cancelEdit')}
                </button>
              ) : null}
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {tags.length ? (
                tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#60a5fa' }} />
                    <span className="text-sm flex-1 truncate">{t.name}</span>
                    <button onClick={() => startEdit(t)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => onDeleteTag(t.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">{t('modal.tagManager.empty')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
