import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function CollectionModal({
  open,
  name,
  t,
  onChangeName,
  onClose,
  onCreate,
}: {
  open: boolean
  name: string
  t: (key: string) => string
  onChangeName: (next: string) => void
  onClose: () => void
  onCreate: () => void | Promise<void>
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('modal.collection.title')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('modal.collection.name')}</label>
            <input
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder={t('modal.collection.placeholder')}
              className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-muted transition-colors">
              {t('modal.cancel')}
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={!name.trim()}
              className={cn(
                'px-4 py-2 text-sm rounded-md transition-colors',
                name.trim() ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {t('modal.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
