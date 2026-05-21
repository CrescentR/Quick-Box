import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import './KeyboardShortcut.css'

export interface KeyboardShortcutProps extends HTMLAttributes<HTMLSpanElement> {
  keys: string | string[]
  separator?: string
}

export function KeyboardShortcut({
  keys,
  separator = '+',
  className,
  ...props
}: KeyboardShortcutProps) {
  const keyList = Array.isArray(keys) ? keys : keys.split('+').map((key) => key.trim())

  return (
    <span className={clsx('qb-keyboard-shortcut', className)} {...props}>
      {keyList.map((key, index) => (
        <span key={`${key}-${index}`} className="qb-keyboard-shortcut__group">
          {index > 0 ? (
            <span className="qb-keyboard-shortcut__separator">{separator}</span>
          ) : null}
          <span className="qb-keyboard-shortcut__key">{key}</span>
        </span>
      ))}
    </span>
  )
}

export default KeyboardShortcut
