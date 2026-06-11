import { Sparkles } from 'lucide-react'
import { Icon, KeyboardShortcut, Tag, WindowControls } from '../ui'
import type { AppPage, PageNavigationProps } from './page-types'

const pageLabels: Record<AppPage, string> = {
  launcher: '启动器',
  plugins: '插件',
  settings: '设置',
}

export interface PageHeaderProps extends PageNavigationProps {
  eyebrow: string
  title: string
  description: string
}

export default function PageHeader({
  currentPage,
  onPageChange,
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="qb-page-title" data-tauri-drag-region>
      <div className="qb-page-title__brand">
        <div className="qb-page-title__controls">
          <WindowControls />
        </div>
        <div className="qb-page-title__badge">
          <Icon icon={Sparkles} size={16} />
        </div>
        <div className="qb-page-title__copy">
          <div className="qb-page-title__eyebrow">{eyebrow}</div>
          <div className="qb-page-title__name">{title}</div>
          <div className="qb-page-title__hint">{description}</div>
        </div>
      </div>

      <div className="qb-page-title__meta">
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
        <Tag tone="primary">QuickBox</Tag>
        <KeyboardShortcut keys={currentPage === 'settings' ? ['Ctrl', ','] : ['Alt', 'Space']} />
      </div>
    </div>
  )
}
