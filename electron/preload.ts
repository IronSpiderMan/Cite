import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    getItems: (filter: any) => ipcRenderer.invoke('db:getItems', filter),
    addItem: (item: any) => ipcRenderer.invoke('db:addItem', item),
    updateItem: (id: number, updates: any) => ipcRenderer.invoke('db:updateItem', id, updates),
    deleteItem: (id: number) => ipcRenderer.invoke('db:deleteItem', id),
    getAnnotations: (itemId: number) => ipcRenderer.invoke('db:getAnnotations', itemId),
    addAnnotation: (annotation: any) => ipcRenderer.invoke('db:addAnnotation', annotation),
    updateAnnotation: (id: number, updates: any) => ipcRenderer.invoke('db:updateAnnotation', id, updates),
    deleteAnnotation: (id: number) => ipcRenderer.invoke('db:deleteAnnotation', id),
    getCollections: () => ipcRenderer.invoke('db:getCollections'),
    addCollection: (name: string) => ipcRenderer.invoke('db:addCollection', name),
    addItemToCollection: (itemId: number, collectionId: number) => ipcRenderer.invoke('db:addItemToCollection', itemId, collectionId),
    getTags: () => ipcRenderer.invoke('db:getTags'),
    getTagByName: (name: string) => ipcRenderer.invoke('db:getTagByName', name),
    addTag: (name: string, color?: string) => ipcRenderer.invoke('db:addTag', name, color),
    updateTag: (id: number, updates: any) => ipcRenderer.invoke('db:updateTag', id, updates),
    deleteTag: (id: number) => ipcRenderer.invoke('db:deleteTag', id),
    getItemTags: (itemId: number) => ipcRenderer.invoke('db:getItemTags', itemId),
    addItemTag: (itemId: number, tagId: number) => ipcRenderer.invoke('db:addItemTag', itemId, tagId),
    removeItemTag: (itemId: number, tagId: number) => ipcRenderer.invoke('db:removeItemTag', itemId, tagId),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch: any) => ipcRenderer.invoke('settings:update', patch),
    selectSnapshotDirectory: () => ipcRenderer.invoke('settings:selectSnapshotDirectory'),
  },
  file: {
    openTextFile: () => ipcRenderer.invoke('file:openTextFile'),
  },
  snapshot: {
    capture: (url: string) => ipcRenderer.invoke('snapshot:capture', url),
  },
  shell: {
    showSnapshotInFolder: (snapshotPath: string) => ipcRenderer.invoke('shell:showSnapshotInFolder', snapshotPath),
  }
});
