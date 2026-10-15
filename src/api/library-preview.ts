import type { LibraryItem } from './library-api'

// 浏览器预览使用 IndexedDB 保存文件，避免 localStorage 的容量限制。
export async function libraryPreview(command: string, args?: Record<string, unknown>): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('quickbox-library', 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('items', { keyPath: 'item.id' }) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('无法打开浏览器资料存储'))
  })
  try {
    const readAll = () => new Promise<Array<{ item: LibraryItem; bytes?: number[] }>>((resolve, reject) => {
      const tx = db.transaction('items', 'readonly')
      const request = tx.objectStore('items').getAll()
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
    })
    if (command === 'read_library_file') {
      const entry = (await readAll()).find(({ item }) => item.id === args?.id)
      if (!entry?.bytes) throw new Error('文件不存在')
      return entry.bytes
    }
    if (command !== 'load_library') {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('items', 'readwrite'), store = tx.objectStore('items')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(new Error('保存失败，请检查浏览器存储空间'))
        tx.onabort = () => reject(new Error('保存失败，原数据已保留'))
        if (command === 'delete_library_item') store.delete(String(args?.id))
        else {
          const item = { ...(args?.item as LibraryItem), updatedAt: new Date().toISOString() }
          const request = store.get(item.id)
          request.onsuccess = () => store.put({ item, bytes: args?.bytes ?? request.result?.bytes })
        }
      })
    }
    return (await readAll()).map(({ item }) => item).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally { db.close() }
}
