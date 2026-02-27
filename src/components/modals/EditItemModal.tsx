import { Loader2, X } from 'lucide-react'
import { Markdown } from '../Markdown'

export function EditItemModal({
  open,
  title,
  url,
  content,
  contentFormat,
  canEditContent,
  isSaving,
  t,
  onChangeTitle,
  onChangeUrl,
  onChangeContent,
  onChangeContentFormat,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  url: string
  content: string
  contentFormat: 'markdown' | 'text'
  canEditContent: boolean
  isSaving: boolean
  t: (key: string) => string
  onChangeTitle: (next: string) => void
  onChangeUrl: (next: string) => void
  onChangeContent: (next: string) => void
  onChangeContentFormat: (next: 'markdown' | 'text') => void
  onClose: () => void
  onSave: (e: React.FormEvent) => void | Promise<void>
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('modal.editItem.title')}</h2>
          <button onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSave}>
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('modal.editItem.titleLabel')}</label>
              <input
                value={title}
                onChange={(e) => onChangeTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={t('items.untitled')}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t('modal.editItem.urlLabel')}</label>
              <input
                value={url}
                onChange={(e) => onChangeUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {canEditContent ? (
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5">{t('modal.editItem.formatLabel')}</label>
                    <select
                      value={contentFormat}
                      onChange={(e) => onChangeContentFormat(e.target.value as 'markdown' | 'text')}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    >
                      <option value="markdown">{t('modal.addItem.formatMarkdown')}</option>
                      <option value="text">{t('modal.addItem.formatText')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('modal.editItem.contentLabel')}</label>
                  <textarea
                    value={content}
                    onChange={(e) => onChangeContent(e.target.value)}
                    className="w-full h-56 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {contentFormat === 'markdown' ? (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('modal.addItem.preview')}</div>
                    <div className="rounded-md border border-border bg-muted/20 p-3 max-h-56 overflow-auto">
                      {content.trim() ? <Markdown value={content} /> : <div className="text-sm text-muted-foreground">{t('modal.addItem.previewEmpty')}</div>}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50">
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              {t('modal.editItem.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

