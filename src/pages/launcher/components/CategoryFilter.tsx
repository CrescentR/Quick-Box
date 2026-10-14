import clsx from 'clsx'
import { LayoutGrid, Pin } from 'lucide-react'
import { TOOL_CATEGORIES, type ToolCategoryFilter, type ToolCategoryId } from '../launcher-catalog'

export interface CategoryFilterProps {
  value: ToolCategoryFilter
  /** 各分类下的命令数量，数量为 0 的分类不显示 */
  counts: Partial<Record<ToolCategoryId, number>>
  total: number
  quickCount: number
  onChange: (value: ToolCategoryFilter) => void
}

/** 左侧分类导航 */
export function CategoryFilter({ value, counts, total, quickCount, onChange }: CategoryFilterProps) {
  const categories = TOOL_CATEGORIES.filter((category) => (counts[category.id] ?? 0) > 0)

  return (
    <nav className="qb-launcher-nav" aria-label="工具分类">
      <div className="qb-launcher-nav__label">分类</div>
      <button
        type="button"
        className={clsx('qb-launcher-nav__item', value === 'all' && 'is-active')}
        onClick={() => onChange('all')}
      >
        <LayoutGrid size={15} strokeWidth={1.8} />
        <span className="qb-launcher-nav__name">全部工具</span>
        <span className="qb-launcher-nav__count">{total}</span>
      </button>
      <button
        type="button"
        className={clsx('qb-launcher-nav__item', value === 'quick' && 'is-active')}
        onClick={() => onChange('quick')}
      >
        <Pin size={15} strokeWidth={1.8} />
        <span className="qb-launcher-nav__name">常用置顶</span>
        <span className="qb-launcher-nav__count">{quickCount}</span>
      </button>
      <div className="qb-launcher-nav__label">按用途</div>
      {categories.map((category) => {
        const Icon = category.icon
        return (
          <button
            key={category.id}
            type="button"
            className={clsx('qb-launcher-nav__item', value === category.id && 'is-active')}
            onClick={() => onChange(category.id)}
          >
            <Icon size={15} strokeWidth={1.8} />
            <span className="qb-launcher-nav__name">{category.name}</span>
            <span className="qb-launcher-nav__count">{counts[category.id]}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default CategoryFilter
