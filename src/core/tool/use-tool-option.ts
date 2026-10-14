import { useWorkspaceStore } from '../../stores/workspace-store'

/** 仅允许显式登记的非敏感选项持久化；原文与密钥不使用此入口。 */
export function useToolOption<T extends string | number | boolean>(key: string, initial: T) {
  const data = useWorkspaceStore((state) => state.data.presets[key])
  const value = typeof data === typeof initial ? data as T : initial
  const setValue = (next: T) => { void useWorkspaceStore.getState().update((current) => ({ ...current, presets: { ...current.presets, [key]: next } })).catch(() => {}) }
  return [value, setValue] as const
}
