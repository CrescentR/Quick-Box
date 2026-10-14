import clsx from 'clsx'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { getToolMeta } from '../launcher-catalog'

export interface ToolIconProps {
  command: QuickBoxCommand
  /** sm 用于列表和磁贴，lg 用于工作台标题 */
  size?: 'sm' | 'lg'
}

/** 工具图标：同一套石墨底，不按分类上色 */
export function ToolIcon({ command, size = 'sm' }: ToolIconProps) {
  const { icon: LucideComponent } = getToolMeta(command)

  return (
    <span className={clsx('qb-tool-icon', `qb-tool-icon--${size}`)} aria-hidden="true">
      <LucideComponent size={size === 'lg' ? 18 : 15} strokeWidth={1.8} />
    </span>
  )
}

export default ToolIcon
