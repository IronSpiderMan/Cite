import { useState } from 'react'
import { LayoutGrid, Star, Trash2, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Item } from '../types'

export function ItemCard({
  item,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  item: Item
  onSelect: (item: Item) => void
  onDelete: (id: number) => void
  onToggleFavorite: (item: Item) => void
}) {
  const [thumbFailed, setThumbFailed] = useState(false)

  const snapshotPath = item.snapshot_path || ''
  const isWebSnapshot = !!snapshotPath && (snapshotPath.startsWith('snapshot://') || snapshotPath.endsWith('.mhtml') || snapshotPath.endsWith('.html'))
  const isPending = item.status === 'pending'
  const thumbSrc = isWebSnapshot
    ? snapshotPath
        .replace(/\/index\.html?$/i, '/thumb.png')
        .replace(/\/snapshot\.mhtml?$/i, '/thumb.png')
        .replace(/\/[^/]+\.html?$/i, '/thumb.png')
    : null

  return (
    <div
      key={item.id}
      onClick={() => !isPending && onSelect(item)}
      draggable={!isPending}
      onDragStart={(e) => {
        if (isPending) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData('application/x-item-id', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={cn(
        'group border border-border/60 rounded-xl overflow-hidden bg-card hover:shadow-lg hover:border-border/80 transition-all duration-300 cursor-pointer flex flex-col h-[280px]',
        isPending && 'opacity-80 cursor-wait'
      )}
    >
      <div className="h-36 bg-muted/50 relative overflow-hidden flex items-center justify-center">
        {isPending ? (
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        ) : isWebSnapshot ? (
          !thumbFailed && thumbSrc ? (
            <img
              src={thumbSrc}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
              <div className="p-3 rounded-full bg-background shadow-sm">
                <LayoutGrid size={24} />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">Webpage Snapshot</span>
            </div>
          )
        ) : item.snapshot_path ? (
          <img src={item.snapshot_path} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-medium">No Preview</div>
        )}
        {!isPending && <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm mb-1.5 line-clamp-2 leading-tight flex items-center gap-2" title={item.title}>
          {item.title}
          {isPending && <span className="text-xs text-muted-foreground font-normal italic">Processing...</span>}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-3 mb-auto leading-relaxed">{item.url}</p>
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
          {!isPending && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(item)
              }}
              className={cn(
                'p-1.5 rounded-md border border-border bg-background/80 shadow-sm transition-colors no-drag',
                item.is_favorite ? 'text-yellow-500 hover:bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-background'
              )}
              title={item.is_favorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star size={16} fill={item.is_favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
            className="p-1.5 rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-colors no-drag"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
