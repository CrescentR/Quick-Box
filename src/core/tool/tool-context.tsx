import { createContext, useContext, useEffect, useState, type ReactNode, type SetStateAction } from 'react'

export type ToolDataType = 'text' | 'json' | 'url' | 'csv' | 'timestamp' | 'jwt' | 'cidr'
export interface ToolInput { type: ToolDataType; text: string; source: string; sensitive?: boolean }
export type ToolResult = { ok: true; data: ToolInput } | { ok: false; message: string }
export interface ToolAction { commandId: string; title: string; accepts: ToolDataType[] }
const Context = createContext<{ viewId: string; input?: ToolInput }>({ viewId: '' })
const drafts = new Map<string, string>()

export function ToolProvider({ viewId, params, children }: { viewId: string; params?: Record<string, unknown>; children: ReactNode }) {
  const candidate = params?.toolInput as ToolInput | undefined
  const input = candidate && typeof candidate.text === 'string' ? candidate : undefined
  return <Context.Provider value={{ viewId, input }}>{children}</Context.Provider>
}

/** 原文只保存在当前进程内，统一限制单份草稿大小。 */
export function useToolInput(initial: string | (() => string), field = 'input') {
  const { viewId, input } = useContext(Context)
  const key = `${viewId}:${field}`
  const [value, setValue] = useState(() => input?.text ?? drafts.get(key) ?? (typeof initial === 'function' ? initial() : initial))
  useEffect(() => {
    if (value.length <= 1_000_000) drafts.set(key, value)
  }, [key, value])
  const update = (next: SetStateAction<string>) => {
    setValue((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next
      if (resolved.length <= 1_000_000) drafts.set(key, resolved)
      else drafts.delete(key)
      return resolved
    })
  }
  return [value, update] as const
}

export function clearToolDrafts() { drafts.clear() }
export function useToolContext() { return useContext(Context) }

export const TOOL_ACTIONS: ToolAction[] = [
  { commandId: 'official.json-tool.open', title: 'JSON 工具', accepts: ['json', 'text'] },
  { commandId: 'official.utility-tools.json-to-typescript', title: 'TypeScript 类型', accepts: ['json'] },
  { commandId: 'official.json-schema-tool.open', title: 'JSON Schema', accepts: ['json'] },
  { commandId: 'official.utility-tools.query-builder', title: 'Query 参数', accepts: ['url'] },
  { commandId: 'official.workflow-tools.text-cleaner', title: '文本清洗', accepts: ['text', 'csv'] },
  { commandId: 'official.workflow-tools.text-deduplicate', title: '按行去重', accepts: ['text', 'csv'] },
  { commandId: 'official.workflow-tools.csv-to-json', title: 'CSV 转 JSON', accepts: ['csv', 'text'] },
  { commandId: 'official.workflow-tools.json-to-csv', title: 'JSON 转 CSV', accepts: ['json'] },
]
