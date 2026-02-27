import { useState } from 'react'
import { LayoutGrid, Star, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Item } from '../types'

export function ItemRow({
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
  const thumbSrc = isWebSnapshot
    ? snapshotPath
        .replace(/\/index\.html?$/i, '/thumb.png')
        .replace(/\/snapshot\.mhtml?$/i, '/thumb.png')
        .replace(/\/[^/]+\.html?$/i, '/thumb.png')
    : null

  return (
    <div
      key={item.id}
      onClick={() => onSelect(item)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-item-id', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group border border-border/60 rounded-xl overflow-hidden bg-card hover:shadow-md hover:border-border/80 transition-all duration-300 cursor-pointer flex items-stretch h-20"
    >
      <div className="w-28 bg-muted/50 relative overflow-hidden flex items-center justify-center shrink-0">
        {isWebSnapshot ? (
          !thumbFailed && thumbSrc ? (
            <img src={thumbSrc} alt={item.title} className="w-full h-full object-cover" onError={() => setThumbFailed(true)} />
          ) : (
            <div className="text-muted-foreground/50">
              <LayoutGrid size={18} />
            </div>
          )
        ) : item.snapshot_path ? (
          <img src={item.snapshot_path} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-muted-foreground/40 text-xs">No Preview</div>
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex-1 px-4 py-3 flex items-center gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate" title={item.title}>
            {item.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">{item.url}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
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

