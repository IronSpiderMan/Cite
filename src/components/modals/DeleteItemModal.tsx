import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function DeleteItemModal({
  open,
  itemTitle,
  hasSnapshot,
  deleteLocal,
  isDeleting,
  t,
  onChangeDeleteLocal,
  onClose,
  onConfirm,
}: {
  open: boolean
  itemTitle: string
  hasSnapshot: boolean
  deleteLocal: boolean
  isDeleting: boolean
  t: (key: string) => string
  onChangeDeleteLocal: (v: boolean) => void
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('modal.delete.title')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-sm">
            <div className="text-muted-foreground">{itemTitle}</div>
          </div>

          <label className={cn('flex items-center gap-2 text-sm', hasSnapshot ? 'cursor-pointer' : 'text-muted-foreground/60 cursor-not-allowed')}>
            <input
              type="checkbox"
              checked={deleteLocal}
              disabled={!hasSnapshot || isDeleting}
              onChange={(e) => onChangeDeleteLocal(e.target.checked)}
              className="accent-primary"
            />
            {t('modal.delete.deleteLocal')}
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className={cn('px-4 py-2 text-sm rounded-md transition-colors', isDeleting ? 'text-muted-foreground/60 cursor-not-allowed' : 'hover:bg-muted')}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className={cn(
                'px-4 py-2 text-sm rounded-md transition-colors',
                isDeleting ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-destructive text-destructive-foreground hover:opacity-90'
              )}
            >
              {t('modal.delete.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

