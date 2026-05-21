import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import './ListItem.css'

export interface ListItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id' | 'onClick' | 'title'> {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  accessory?: ReactNode
  selected?: boolean
  disabled?: boolean
  height?: 'compact' | 'comfortable'
  onClick?: (id: string) => void
}

export function ListItem({
  id,
  title,
  subtitle,
  icon,
  accessory,
  selected = false,
  disabled = false,
  height = subtitle ? 'comfortable' : 'compact',
  className,
  style,
  onClick,
  ...props
}: ListItemProps) {
  const itemStyle = {
    '--qb-list-item-height':
      height === 'comfortable'
        ? 'var(--qb-list-item-height-comfortable)'
        : 'var(--qb-list-item-height-compact)',
    ...style,
  } as CSSProperties

  return (
    <button
      type="button"
      aria-selected={selected}
      aria-disabled={disabled}
      className={clsx('qb-list-item', {
        'qb-list-item--selected': selected,
        'qb-list-item--disabled': disabled,
      }, className)}
      disabled={disabled}
      style={itemStyle}
      onClick={() => {
        if (!disabled) {
          onClick?.(id)
        }
      }}
      {...props}
    >
      {icon ? <span className="qb-list-item__icon">{icon}</span> : null}
      <span className="qb-list-item__content">
        <span className="qb-list-item__title">{title}</span>
        {subtitle ? <span className="qb-list-item__subtitle">{subtitle}</span> : null}
      </span>
      {accessory ? <span className="qb-list-item__accessory">{accessory}</span> : null}
    </button>
  )
}

export default ListItem
