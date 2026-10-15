import type { ReactNode } from 'react'
import { WindowControls } from '../ui'
import type { AppPage, PageNavigationProps } from './page-types'

const pageLabels: Record<AppPage, string> = {
  launcher: '启动器',
  plugins: '插件',
  settings: '设置',
}

export interface PageHeaderProps extends PageNavigationProps {
  eyebrow?: string
  title?: string
  description?: string
  /** 启动器顶栏：窗口按钮 + 名称 + 搜索 + 页面切换 */
  compact?: boolean
  children?: ReactNode
}

export default function PageHeader({
  currentPage,
  onPageChange,
  eyebrow,
  title,
  description,
  compact = false,
  children,
}: PageHeaderProps) {
  const pageNav = (
    <div className="qb-page-nav">
      {(['launcher', 'plugins', 'settings'] as AppPage[]).map((page) => (
        <button
          key={page}
          type="button"
          className={`qb-page-nav__button${page === currentPage ? ' is-active' : ''}`}
          onClick={() => onPageChange(page)}
        >
          {pageLabels[page]}
        </button>
      ))}
    </div>
  )

  if (compact) {
    return (
      <div className="qb-page-title qb-page-title--compact" data-tauri-drag-region>
        <div className="qb-page-title__lead">
          <div className="qb-page-title__controls">
            <WindowControls />
          </div>
          <span className="qb-page-title__mark">
            <img className="qb-page-title__icon" src="/app-icon.png" width="24" height="24" alt="" draggable={false} />
            QuickBox
          </span>
        </div>
        {children ? <div className="qb-page-title__search">{children}</div> : null}
        {pageNav}
      </div>
    )
  }

  return (
    <div className="qb-page-title" data-tauri-drag-region>
      <div className="qb-page-title__brand">
        <div className="qb-page-title__controls">
          <WindowControls />
        </div>
        <img className="qb-page-title__icon" src="/app-icon.png" width="24" height="24" alt="QuickBox" draggable={false} />
        <div className="qb-page-title__copy">
          <div className="qb-page-title__eyebrow">{eyebrow}</div>
          <div className="qb-page-title__name">{title}</div>
          <div className="qb-page-title__hint">{description}</div>
        </div>
      </div>
      <div className="qb-page-title__meta">{pageNav}</div>
    </div>
  )
}
