export interface Snippet { id: string; title: string; content: string; language: string; tags: string; updatedAt: string }
export interface WorkspaceData {
  version: 1
  quickCommandIds: string[]
  clipboardSuggestions: boolean
  presets: Record<string, string | number | boolean>
  snippets: Snippet[]
}
export const emptyWorkspace = (): WorkspaceData => ({ version: 1, quickCommandIds: [], clipboardSuggestions: false, presets: {}, snippets: [] })
export function validateWorkspace(value: unknown): WorkspaceData {
  if (!value || typeof value !== 'object') throw new Error('工作台数据无效')
  const data = value as WorkspaceData
  if (data.version !== 1) throw new Error('不支持的工作台版本')
  if (!Array.isArray(data.quickCommandIds) || data.quickCommandIds.length > 8 || data.quickCommandIds.some((id) => typeof id !== 'string' || id.length > 200) || new Set(data.quickCommandIds).size !== data.quickCommandIds.length) throw new Error('常用工具列表无效')
  if (typeof data.clipboardSuggestions !== 'boolean' || !data.presets || typeof data.presets !== 'object' || Array.isArray(data.presets)) throw new Error('偏好数据无效')
  const presets = Object.entries(data.presets)
  if (presets.length > 200 || presets.some(([key, item]) => key.length > 200 || !['string', 'number', 'boolean'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item)) || String(item).length > 1000)) throw new Error('工具预设无效')
  if (!Array.isArray(data.snippets) || data.snippets.length > 500) throw new Error('片段数量无效（最多 500 条）')
  const ids = new Set<string>()
  for (const item of data.snippets) {
    if (!item || ['id', 'title', 'content', 'language', 'tags', 'updatedAt'].some((key) => typeof item[key as keyof Snippet] !== 'string')) throw new Error('片段格式无效')
    if (!item.id || item.id.length > 100 || ids.has(item.id) || !item.title.trim() || item.title.length > 200 || item.content.length > 100_000 || item.tags.length > 500 || item.language.length > 50 || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error('片段内容或标识无效')
    ids.add(item.id)
  }
  if (JSON.stringify(data).length > 2_000_000) throw new Error('工作台数据不能超过 2 MB')
  return { version: 1, quickCommandIds: [...data.quickCommandIds], clipboardSuggestions: data.clipboardSuggestions, presets: Object.fromEntries(presets), snippets: data.snippets.map(({ id, title, content, language, tags, updatedAt }) => ({ id, title, content, language, tags, updatedAt })) }
}
async function digest(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export async function createBackup(data: WorkspaceData) {
  const payload = JSON.stringify(validateWorkspace(data))
  return JSON.stringify({ format: 'quickbox-workspace', version: 1, createdAt: new Date().toISOString(), checksum: await digest(payload), payload }, null, 2)
}
export async function readBackup(text: string) {
  if (text.length > 4_000_000) throw new Error('备份文件过大')
  const backup = JSON.parse(text)
  if (backup.format !== 'quickbox-workspace' || backup.version !== 1 || typeof backup.payload !== 'string') throw new Error('备份格式或版本不支持')
  if (await digest(backup.payload) !== backup.checksum) throw new Error('备份校验失败，文件可能已损坏')
  return validateWorkspace(JSON.parse(backup.payload))
}
export function mergeWorkspace(current: WorkspaceData, incoming: WorkspaceData): WorkspaceData {
  const snippets = new Map(current.snippets.map((item) => [item.id, item]))
  for (const item of incoming.snippets) snippets.set(item.id, item)
  return validateWorkspace({ ...current, quickCommandIds: [...new Set([...incoming.quickCommandIds, ...current.quickCommandIds])].slice(0, 8), presets: { ...current.presets, ...incoming.presets }, snippets: [...snippets.values()] })
}
