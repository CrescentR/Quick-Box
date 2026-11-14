import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import { useT } from '../../i18n'
import { Spinner } from '../Spinner/Spinner'
import './CommandInput.css'

export interface CommandInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isLoading?: boolean
}

export function CommandInput({
  value,
  onChange,
  placeholder,
  isLoading = false,
  className,
  ...props
}: CommandInputProps) {
  const tr = useT()
  return (
    <div className={clsx('qb-command-input', className)}>
      <input
        className="qb-command-input__field"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? tr('搜索命令或工具', 'Search commands or tools')}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        {...props}
      />
      {isLoading ? (
        <span className="qb-command-input__spinner">
          <Spinner size={16} />
        </span>
      ) : null}
    </div>
  )
}

export default CommandInput
