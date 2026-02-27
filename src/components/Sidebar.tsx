import { useState } from 'react'
import { Folder, LayoutGrid, Pencil, Plus, PlusCircle, Search, Tag } from 'lucide-react'
import { cn } from '../lib/cn'
import type { DbCollection, DbTag } from '../types'
import { SidebarItem } from './SidebarItem'

export function Sidebar({
  activeTab,
  onChangeTab,
  searchQuery,
  onChangeSearchQuery,
  tags,
  collections,
  t,
  onOpenTagManager,
  onOpenAddItem,
  onOpenNewCollection,
  onDropItemToCollection,
}: {
  activeTab: string
  onChangeTab: (tab: string) => void
  searchQuery: string
  onChangeSearchQuery: (next: string) => void
  tags: DbTag[]
  collections: DbCollection[]
  t: (key: string) => string
  onOpenTagManager: () => void
  onOpenAddItem: () => void
  onOpenNewCollection: () => void
  onDropItemToCollection: (collectionId: number, itemId: number) => void | Promise<void>
}) {
  const [dragOverCollectionId, setDragOverCollectionId] = useState<number | null>(null)

  return (
    <div className="w-64 bg-secondary/20 border-r border-border flex flex-col pt-2 drag-region">
      <div className="px-4 mb-4 no-drag">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto no-drag">
        <SidebarItem icon={<LayoutGrid size={16} />} label={t('sidebar.allItems')} active={activeTab === 'all'} onClick={() => onChangeTab('all')} />
        <SidebarItem icon={<Folder size={16} />} label={t('sidebar.favorites')} active={activeTab === 'favorites'} onClick={() => onChangeTab('favorites')} />

        <div className="pt-4 pb-2 px-2 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider flex justify-between items-center group">
          <span>{t('sidebar.collections')}</span>
          <button onClick={onOpenNewCollection} className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity" title={t('sidebar.newCollection')}>
            <Plus size={12} />
          </button>
        </div>

        {collections.map((c) => (
          <div
            key={c.id}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCollectionId(c.id)
            }}
            onDragLeave={() => setDragOverCollectionId((prev) => (prev === c.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault()
              const raw = e.dataTransfer.getData('application/x-item-id')
              const itemId = Number(raw)
              setDragOverCollectionId(null)
              if (!itemId) return
              onDropItemToCollection(c.id, itemId)
            }}
            className={cn(dragOverCollectionId === c.id && 'rounded-md bg-primary/10')}
          >
            <SidebarItem icon={<Folder size={16} />} label={c.name} active={activeTab === `collection:${c.id}`} onClick={() => onChangeTab(`collection:${c.id}`)} />
          </div>
        ))}

        <div className="pt-4 pb-2 px-2 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider flex justify-between items-center group">
          <span>{t('sidebar.tags')}</span>
          <button onClick={onOpenTagManager} className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity" title={t('sidebar.manageTags')}>
            <Pencil size={12} />
          </button>
        </div>
        {tags.map((t) => (
          <SidebarItem key={t.id} icon={<Tag size={16} />} label={t.name} active={activeTab === `tag:${t.id}`} onClick={() => onChangeTab(`tag:${t.id}`)} />
        ))}
      </nav>

      <div className="p-3 border-t border-border bg-background/50 backdrop-blur-sm no-drag space-y-1">
        <button
          onClick={onOpenTagManager}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-muted"
        >
          <Tag size={16} />
          <span>{t('sidebar.manageTags')}</span>
        </button>
        <button
          onClick={onOpenAddItem}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-muted"
        >
          <PlusCircle size={16} />
          <span>{t('sidebar.addNewItem')}</span>
        </button>
      </div>
    </div>
  )
}
