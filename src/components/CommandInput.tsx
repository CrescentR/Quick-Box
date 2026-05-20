interface CommandInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function CommandInput({ value, onChange, onKeyDown }: CommandInputProps) {
  return (
    <input
      autoFocus
      className="command-input"
      placeholder="搜索命令或工具"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}
