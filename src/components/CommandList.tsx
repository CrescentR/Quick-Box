import type { CommandSearchResult } from '../core/command/command-types'
import CommandListItem from './CommandListItem'

interface CommandListProps {
  results: CommandSearchResult[]
  selectedIndex: number
  onRun: (result: CommandSearchResult) => void
}

export default function CommandList({ results, selectedIndex, onRun }: CommandListProps) {
  if (results.length === 0) {
    return <div className="command-list empty-state">没有匹配的命令</div>
  }

  return (
    <div className="command-list">
      {results.map((result, index) => (
        <CommandListItem
          key={result.command.id}
          result={result}
          selected={index === selectedIndex}
          onSelect={() => onRun(result)}
        />
      ))}
    </div>
  )
}
