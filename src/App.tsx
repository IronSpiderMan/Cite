import { useState, useEffect } from 'react'
import type { DbCollection, DbTag, Item } from './types'
import { t, type Language } from './i18n'
import type { ThemeMode } from './settingsTypes'
import { Sidebar } from './components/Sidebar'
import { ItemsView } from './components/ItemsView'
import { DetailView } from './components/detail/DetailView'
import { AddItemModal } from './components/modals/AddItemModal'
import { CollectionModal } from './components/modals/CollectionModal'
import { DeleteItemModal } from './components/modals/DeleteItemModal'
import { TagManagerModal } from './components/modals/TagManagerModal'
import { SettingsModal } from './components/modals/SettingsModal'

function App() {
  const [activeTab, setActiveTab] = useState('all')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [itemsViewMode, setItemsViewMode] = useState<'grid' | 'list'>('grid')
  const [tags, setTags] = useState<DbTag[]>([])
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [collections, setCollections] = useState<DbCollection[]>([])
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  
  // Add Item State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newItemUrl, setNewItemUrl] = useState('')
  const [newItemMode, setNewItemMode] = useState<'url' | 'text'>('url')
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemContent, setNewItemContent] = useState('')
  const [newItemContentFormat, setNewItemContentFormat] = useState<'markdown' | 'text'>('markdown')
  const [isAdding, setIsAdding] = useState(false)

  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [deleteAlsoLocal, setDeleteAlsoLocal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<{ snapshotDir: string | null; theme: ThemeMode; language: Language }>({
    snapshotDir: null,
    theme: 'system',
    language: 'zh',
  })
  const tt = (key: string) => t(settings.language, key)

  useEffect(() => {
    fetchTags()
    fetchCollections()
    loadSettings()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && !!mq?.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    if (settings.theme !== 'system' || !mq) return
    const onChange = () => apply()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [settings.theme])

  useEffect(() => {
    if (selectedItem) setSelectedItem(null)
    fetchItems()
  }, [activeTab])

  const fetchTags = async () => {
    try {
      if (!window.electronAPI?.db?.getTags) {
        setTags([])
        return
      }
      const rows = await window.electronAPI.db.getTags()
      setTags((rows as DbTag[]) || [])
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      setTags([])
    }
  }

  const fetchCollections = async () => {
    try {
      if (!window.electronAPI?.db?.getCollections) {
        setCollections([])
        return
      }
      const rows = await window.electronAPI.db.getCollections()
      setCollections((rows as DbCollection[]) || [])
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      setCollections([])
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI?.db) {
        setItems([])
        return
      }
      let data: any[] = []
      if (activeTab.startsWith('tag:')) {
        const tagId = Number(activeTab.slice('tag:'.length))
        data = await window.electronAPI.db.getItems({ tagId })
      } else if (activeTab.startsWith('collection:')) {
        const collectionId = Number(activeTab.slice('collection:'.length))
        data = await window.electronAPI.db.getItems({ collectionId })
      } else if (activeTab === 'favorites') {
        data = await window.electronAPI.db.getItems('favorites')
      } else {
        data = await window.electronAPI.db.getItems('all')
      }
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredItems = normalizedQuery
    ? items.filter((item) => {
        const title = (item.title || '').toLowerCase()
        const url = (item.url || '').toLowerCase()
        const description = (item.description || '').toLowerCase()
        const rawContent = (item.content || '').toLowerCase()
        const plainContent = item.content_format === 'html' ? rawContent.replace(/<[^>]+>/g, ' ') : rawContent
        return (
          title.includes(normalizedQuery) ||
          url.includes(normalizedQuery) ||
          description.includes(normalizedQuery) ||
          plainContent.includes(normalizedQuery)
        )
      })
    : items

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI?.settings?.get?.()
      if (s) setSettings(s)
    } catch {}
  }

  const updateSettings = async (patch: Partial<{ snapshotDir: string | null; theme: ThemeMode; language: Language }>) => {
    try {
      const next = await window.electronAPI?.settings?.update?.(patch)
      if (next) setSettings(next)
    } catch {}
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
    setNewItemMode('url')
    setNewItemUrl('')
    setNewItemTitle('')
    setNewItemContent('')
    setNewItemContentFormat('markdown')
  }

  const importTextFile = async () => {
    try {
      const res = await window.electronAPI?.file?.openTextFile?.()
      if (!res) return
      setNewItemMode('text')
      setNewItemContent(res.content || '')
      const lower = (res.name || '').toLowerCase()
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) setNewItemContentFormat('markdown')
      else setNewItemContentFormat('text')
      if (!newItemTitle.trim()) {
        const base = (res.name || '').replace(/\.(md|markdown|txt)$/i, '')
        setNewItemTitle(base || '')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newItemMode === 'url' && !newItemUrl) return
    if (newItemMode === 'text' && !newItemContent.trim()) return

    setIsAdding(true)
    try {
      if (!window.electronAPI?.snapshot || !window.electronAPI?.db) {
        throw new Error('electronAPI is not available. Please run inside Electron.')
      }
      if (newItemMode === 'url') {
        const snapshot = await window.electronAPI.snapshot.capture(newItemUrl)
        await window.electronAPI.db.addItem({
          url: newItemUrl,
          title: (newItemTitle || '').trim() || snapshot.title || newItemUrl,
          description: '',
          content: snapshot.content,
          content_format: 'html',
          snapshot_path: snapshot.snapshot_path,
        })
      } else {
        await window.electronAPI.db.addItem({
          url: `note://${Date.now()}`,
          title: (newItemTitle || '').trim() || tt('items.untitled'),
          description: '',
          content: newItemContent,
          content_format: newItemContentFormat,
          snapshot_path: null,
        })
      }

      // 3. Refresh list
      setIsAddModalOpen(false)
      setNewItemUrl('')
      setNewItemTitle('')
      setNewItemContent('')
      fetchItems()
    } catch (error) {
      console.error('Failed to add item:', error)
      const msg = (error as any)?.message ? `${tt('alert.addItemFailed')}\n${String((error as any).message)}` : tt('alert.addItemFailed')
      alert(msg)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteItem = (id: number) => {
    setDeleteTargetId(id)
    setDeleteAlsoLocal(false)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteItem = async () => {
    if (deleteTargetId == null) return
    const target = items.find((i) => i.id === deleteTargetId) || (selectedItem?.id === deleteTargetId ? selectedItem : null)
    setIsDeleting(true)
    try {
      await window.electronAPI.db.deleteItem(deleteTargetId)
      if (deleteAlsoLocal && target?.snapshot_path) {
        await window.electronAPI.snapshot.deleteLocal(target.snapshot_path)
      }
      if (selectedItem?.id === deleteTargetId) setSelectedItem(null)
      fetchItems()
      setIsDeleteModalOpen(false)
      setDeleteTargetId(null)
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert(tt('alert.deleteFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleFavorite = async (item: Item) => {
    const next = item.is_favorite ? 0 : 1
    try {
      await window.electronAPI.db.updateItem(item.id, { is_favorite: next })
      setItems((prev) => {
        if (activeTab === 'favorites' && next === 0) return prev.filter((i) => i.id !== item.id)
        return prev.map((i) => (i.id === item.id ? { ...i, is_favorite: next } : i))
      })
      if (selectedItem?.id === item.id) setSelectedItem({ ...selectedItem, is_favorite: next })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleCreateCollection = async () => {
    const name = collectionName.trim()
    if (!name) return
    try {
      await window.electronAPI.db.addCollection(name)
      setCollectionName('')
      setIsCollectionModalOpen(false)
      fetchCollections()
    } catch (error) {
      console.error('Failed to add collection:', error)
      alert(tt('alert.createCollectionFailed'))
    }
  }

  const handleDropOnCollection = async (collectionId: number, itemId: number) => {
    try {
      await window.electronAPI.db.addItemToCollection(itemId, collectionId)
      if (activeTab === `collection:${collectionId}`) fetchItems()
    } catch (error) {
      console.error('Failed to add item to collection:', error)
      alert(tt('alert.addToCollectionFailed'))
    }
  }

  const handleCreateTag = async (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await window.electronAPI.db.addTag(trimmed, color)
      fetchTags()
    } catch (error) {
      console.error('Failed to add tag:', error)
      alert(tt('alert.addTagFailed'))
    }
  }

  const handleUpdateTag = async (id: number, updates: { name: string; color: string }) => {
    const name = updates.name.trim()
    if (!name) return
    try {
      await window.electronAPI.db.updateTag(id, { name, color: updates.color })
      fetchTags()
    } catch (error) {
      console.error('Failed to update tag:', error)
      alert(tt('alert.updateTagFailed'))
    }
  }

  const handleDeleteTag = async (id: number) => {
    const ok = window.confirm(tt('confirm.deleteTag'))
    if (!ok) return
    try {
      await window.electronAPI.db.deleteTag(id)
      if (activeTab === `tag:${id}`) setActiveTab('all')
      fetchTags()
      fetchItems()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      alert(tt('alert.deleteTagFailed'))
    }
  }

  const listTitle =
    activeTab === 'favorites'
      ? tt('sidebar.favorites')
      : activeTab.startsWith('tag:')
        ? tags.find((t) => t.id === Number(activeTab.slice('tag:'.length)))?.name || 'Tag'
        : activeTab.startsWith('collection:')
          ? collections.find((c) => c.id === Number(activeTab.slice('collection:'.length)))?.name || tt('sidebar.collections')
          : tt('sidebar.allItems')


  if (!window.electronAPI) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground font-sans">
        <div className="max-w-md w-full p-6 border border-border rounded-xl bg-card">
          <h1 className="text-lg font-semibold mb-2">需要在 Electron 中运行</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            请使用 <span className="text-foreground font-medium">npm run dev</span> 启动并在弹出的桌面窗口中使用本应用。
            如果你是在浏览器里打开了 <span className="text-foreground font-medium">http://localhost:5173</span>，这里不会有 electronAPI。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans select-none relative pt-8">
      <div className="absolute top-0 left-0 right-0 h-8 drag-region z-40" />
      <AddItemModal
        open={isAddModalOpen}
        mode={newItemMode}
        title={newItemTitle}
        url={newItemUrl}
        content={newItemContent}
        contentFormat={newItemContentFormat}
        isAdding={isAdding}
        t={tt}
        onChangeMode={setNewItemMode}
        onChangeTitle={setNewItemTitle}
        onChangeUrl={setNewItemUrl}
        onChangeContent={setNewItemContent}
        onChangeContentFormat={setNewItemContentFormat}
        onImportFile={importTextFile}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddItem}
      />

      <DeleteItemModal
        open={isDeleteModalOpen}
        itemTitle={(items.find((i) => i.id === deleteTargetId)?.title || (selectedItem?.id === deleteTargetId ? selectedItem?.title : '') || '').trim() || tt('items.untitled')}
        hasSnapshot={!!(items.find((i) => i.id === deleteTargetId)?.snapshot_path || (selectedItem?.id === deleteTargetId ? selectedItem?.snapshot_path : null))}
        deleteLocal={deleteAlsoLocal}
        isDeleting={isDeleting}
        t={tt}
        onChangeDeleteLocal={setDeleteAlsoLocal}
        onClose={() => {
          if (isDeleting) return
          setIsDeleteModalOpen(false)
          setDeleteTargetId(null)
        }}
        onConfirm={confirmDeleteItem}
      />

      <CollectionModal
        open={isCollectionModalOpen}
        name={collectionName}
        t={tt}
        onChangeName={setCollectionName}
        onClose={() => {
          setIsCollectionModalOpen(false)
          setCollectionName('')
        }}
        onCreate={handleCreateCollection}
      />

      <TagManagerModal
        open={isTagModalOpen}
        tags={tags}
        t={tt}
        onClose={() => setIsTagModalOpen(false)}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      <SettingsModal
        open={isSettingsOpen}
        snapshotDir={settings.snapshotDir}
        theme={settings.theme}
        language={settings.language}
        t={tt}
        onClose={() => setIsSettingsOpen(false)}
        onSelectSnapshotDir={async () => {
          const dir = await window.electronAPI?.settings?.selectSnapshotDirectory?.()
          if (typeof dir === 'string') setSettings((prev) => ({ ...prev, snapshotDir: dir }))
          else if (dir === null) await loadSettings()
        }}
        onClearSnapshotDir={() => updateSettings({ snapshotDir: null })}
        onChangeTheme={(v) => updateSettings({ theme: v })}
        onChangeLanguage={(v) => updateSettings({ language: v })}
      />

      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        tags={tags}
        collections={collections}
        t={tt}
        onOpenTagManager={() => setIsTagModalOpen(true)}
        onOpenAddItem={openAddModal}
        onOpenNewCollection={() => setIsCollectionModalOpen(true)}
        onDropItemToCollection={handleDropOnCollection}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
        {selectedItem ? (
          <DetailView
            item={selectedItem}
            activeTab={activeTab}
            tags={tags}
            t={tt}
            onBack={() => setSelectedItem(null)}
            onOpenTagManager={() => setIsTagModalOpen(true)}
            onRefreshItems={fetchItems}
            onRefreshTags={fetchTags}
            onToggleFavorite={handleToggleFavorite}
            onUpdateItem={(next) => setSelectedItem(next)}
          />
        ) : (
          <>
            <ItemsView
              title={listTitle}
              items={filteredItems}
              loading={loading}
              viewMode={itemsViewMode}
              onToggleViewMode={() => setItemsViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
              onOpenAddItem={openAddModal}
              onOpenSettings={() => setIsSettingsOpen(true)}
              t={tt}
              onSelectItem={setSelectedItem}
              onDeleteItem={handleDeleteItem}
              onToggleFavorite={handleToggleFavorite}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default App
