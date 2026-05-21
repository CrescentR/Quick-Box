import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'
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
  placeholder = 'Search commands or tools',
  isLoading = false,
  className,
  ...props
}: CommandInputProps) {
  return (
    <div className={clsx('qb-command-input', className)}>
      <input
        className="qb-command-input__field"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
