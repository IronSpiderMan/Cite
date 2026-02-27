import { List, PlusCircle, Settings } from 'lucide-react'
import type { Item } from '../types'
import { ItemCard } from './ItemCard'

export function ItemsView({
  title,
  items,
  loading,
  onOpenAddItem,
  onOpenSettings,
  t,
  onSelectItem,
  onDeleteItem,
  onToggleFavorite,
}: {
  title: string
  items: Item[]
  loading: boolean
  onOpenAddItem: () => void
  onOpenSettings: () => void
  t: (key: string) => string
  onSelectItem: (item: Item) => void
  onDeleteItem: (id: number) => void
  onToggleFavorite: (item: Item) => void
}) {
  return (
    <>
      <header className="h-11 border-b border-border flex items-center justify-between px-4 drag-region bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center gap-1 no-drag">
          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <List size={18} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title={t('items.settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {items.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="bg-secondary/50 p-4 rounded-full mb-4">
              <PlusCircle size={32} className="opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-1">{t('items.noItemsTitle')}</h3>
            <p className="text-sm max-w-xs text-center mb-6">{t('items.noItemsDesc')}</p>
            <button onClick={onOpenAddItem} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
              {t('items.addItem')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onSelect={onSelectItem} onDelete={onDeleteItem} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
