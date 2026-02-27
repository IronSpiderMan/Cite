import { LayoutGrid, Star, Trash2 } from 'lucide-react'
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
  return (
    <div
      key={item.id}
      onClick={() => onSelect(item)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-item-id', String(item.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group border border-border/60 rounded-xl overflow-hidden bg-card hover:shadow-lg hover:border-border/80 transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
    >
      <div className="h-36 bg-muted/50 relative overflow-hidden flex items-center justify-center">
        {item.snapshot_path && (item.snapshot_path.startsWith('snapshot://') || item.snapshot_path.endsWith('.mhtml') || item.snapshot_path.endsWith('.html')) ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
            <div className="p-3 rounded-full bg-background shadow-sm">
              <LayoutGrid size={24} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">Webpage Snapshot</span>
          </div>
        ) : item.snapshot_path ? (
          <img src={item.snapshot_path} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-medium">No Preview</div>
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm mb-1.5 line-clamp-2 leading-tight" title={item.title}>
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-3 mb-auto leading-relaxed">{item.url}</p>
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
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

