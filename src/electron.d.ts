export {};

declare global {
  interface Window {
    electronAPI: {
      db: {
        getItems: (filter?: 'all' | 'favorites' | { collectionId?: number, tagId?: number }) => Promise<any[]>;
        addItem: (item: { url: string; title: string; description?: string; content?: string; content_format?: 'html' | 'markdown' | 'text'; snapshot_path?: string | null }) => Promise<any>;
        updateItem: (id: number, updates: any) => Promise<any>;
        deleteItem: (id: number) => Promise<any>;
        getAnnotations: (itemId: number) => Promise<any[]>;
        addAnnotation: (annotation: { item_id: number, content?: string, selector: string, color?: string }) => Promise<any>;
        updateAnnotation: (id: number, updates: any) => Promise<any>;
        deleteAnnotation: (id: number) => Promise<any>;
        getCollections: () => Promise<any[]>;
        addCollection: (name: string) => Promise<any>;
        addItemToCollection: (itemId: number, collectionId: number) => Promise<any>;
        getTags: () => Promise<any[]>;
        getTagByName: (name: string) => Promise<any | undefined>;
        addTag: (name: string, color?: string) => Promise<any>;
        updateTag: (id: number, updates: { name?: string, color?: string | null }) => Promise<any>;
        deleteTag: (id: number) => Promise<any>;
        getItemTags: (itemId: number) => Promise<any[]>;
        addItemTag: (itemId: number, tagId: number) => Promise<any>;
        removeItemTag: (itemId: number, tagId: number) => Promise<any>;
      },
      settings: {
        get: () => Promise<{ snapshotDir: string | null; theme: 'light' | 'dark' | 'system'; language: 'zh' | 'en' }>;
        update: (patch: Partial<{ snapshotDir: string | null; theme: 'light' | 'dark' | 'system'; language: 'zh' | 'en' }>) => Promise<{ snapshotDir: string | null; theme: 'light' | 'dark' | 'system'; language: 'zh' | 'en' }>;
        selectSnapshotDirectory: () => Promise<string | null>;
      },
      file: {
        openTextFile: () => Promise<{ path: string; name: string; content: string } | null>;
      },
      snapshot: {
        capture: (url: string) => Promise<{ title: string, content: string, snapshot_path: string }>;
      },
      shell: {
        showSnapshotInFolder: (snapshotPath: string) => Promise<boolean>;
      }
    };
  }
}
