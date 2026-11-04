import { useCallback, useEffect, useState } from 'react'
import { loadCommandUsage, recordCommandUsage } from '../../api/command-usage-api'
import type { CommandUsageInfo } from '../../core/command/command-types'

/** 工具使用记录：启动时读取一次，打开工具后更新，用于搜索排序 */
export function useCommandUsage() {
  const [usageByCommandId, setUsageByCommandId] = useState<Record<string, CommandUsageInfo>>({})

  useEffect(() => {
    let cancelled = false
    async function hydrateUsage() {
      try {
        const usage = await loadCommandUsage()
        if (cancelled) return
        setUsageByCommandId(
          Object.fromEntries(
            usage.map((item) => [item.commandId, { runCount: item.runCount, lastRunAt: item.lastRunAt }]),
          ),
        )
      } catch {
        if (!cancelled) setUsageByCommandId({})
      }
    }
    void hydrateUsage()
    return () => {
      cancelled = true
    }
  }, [])

  const recordUsage = useCallback(async (commandId: string) => {
    try {
      const usage = await recordCommandUsage(commandId)
      setUsageByCommandId((current) => ({
        ...current,
        [usage.commandId]: { runCount: usage.runCount, lastRunAt: usage.lastRunAt },
      }))
    } catch {
      // 使用记录不应阻断命令本身执行。
    }
  }, [])

  return { usageByCommandId, recordUsage }
}
