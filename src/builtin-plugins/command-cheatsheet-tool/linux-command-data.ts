import dataUrl from './data/linux-commands.json?url'
import { indexLinuxCommands, type IndexedLinuxCommand, type LinuxCommandManual } from './search-linux-commands'

// 手册数据约 1.9MB，作为独立静态资源按需 fetch：直接 import 会被编进 JS 分块，
// 每次打开都要按 JS 解析一遍，JSON.parse 快得多，也不再拖大主包。
let pending: Promise<IndexedLinuxCommand[]> | undefined

export function loadLinuxCommands(): Promise<IndexedLinuxCommand[]> {
  pending ??= fetch(dataUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<LinuxCommandManual[]>
    })
    .then(indexLinuxCommands)
    .catch((error: unknown) => {
      pending = undefined
      throw error
    })
  return pending
}
