import { Loader2, X } from 'lucide-react'
import { Markdown } from '../Markdown'

export function AddItemModal({
  open,
  mode,
  title,
  url,
  content,
  contentFormat,
  isAdding,
  t,
  onChangeMode,
  onChangeTitle,
  onChangeUrl,
  onChangeContent,
  onChangeContentFormat,
  onImportFile,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'url' | 'text'
  title: string
  url: string
  content: string
  contentFormat: 'markdown' | 'text'
  isAdding: boolean
  t: (key: string) => string
  onChangeMode: (next: 'url' | 'text') => void
  onChangeTitle: (next: string) => void
  onChangeUrl: (next: string) => void
  onChangeContent: (next: string) => void
  onChangeContentFormat: (next: 'markdown' | 'text') => void
  onImportFile: () => void | Promise<void>
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void | Promise<void>
}) {
  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(e)
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('modal.addItem.title')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('modal.addItem.mode')}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeMode('url')}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    mode === 'url' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {t('modal.addItem.modeUrl')}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('text')}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    mode === 'text' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {t('modal.addItem.modeText')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t('modal.addItem.titleLabel')}</label>
              <input
                value={title}
                onChange={(e) => onChangeTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={t('items.untitled')}
                autoFocus={mode !== 'url'}
              />
            </div>

            {mode === 'url' ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('modal.addItem.url')}</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => onChangeUrl(e.target.value)}
                  placeholder={t('modal.addItem.urlPlaceholder')}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5">{t('modal.addItem.formatLabel')}</label>
                    <select
                      value={contentFormat}
                      onChange={(e) => onChangeContentFormat(e.target.value as 'markdown' | 'text')}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    >
                      <option value="markdown">{t('modal.addItem.formatMarkdown')}</option>
                      <option value="text">{t('modal.addItem.formatText')}</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={onImportFile}
                    disabled={isAdding}
                    className="px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {t('modal.addItem.importFile')}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('modal.addItem.contentLabel')}</label>
                  <textarea
                    value={content}
                    onChange={(e) => onChangeContent(e.target.value)}
                    placeholder={t('modal.addItem.contentPlaceholder')}
                    className="w-full h-40 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    required
                  />
                </div>

                {contentFormat === 'markdown' ? (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('modal.addItem.preview')}</div>
                    <div className="rounded-md border border-border bg-muted/20 p-3 max-h-40 overflow-auto">
                      {content.trim() ? (
                        <Markdown value={content} />
                      ) : (
                        <div className="text-sm text-muted-foreground">{t('modal.addItem.previewEmpty')}</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-muted transition-colors">
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {isAdding ? <Loader2 size={14} className="animate-spin" /> : null}
              {mode === 'url' ? (isAdding ? t('modal.addItem.capturing') : t('modal.addItem.add')) : t('modal.addItem.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
