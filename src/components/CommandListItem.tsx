import type { CommandSearchResult } from '../core/command/command-types'

interface CommandListItemProps {
  result: CommandSearchResult
  selected: boolean
  onSelect: () => void
}

export default function CommandListItem({ result, selected, onSelect }: CommandListItemProps) {
  return (
    <button
      className={`command-item${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={onSelect}
    >
      <span>
        <span className="command-item-title">{result.command.title}</span>
        {result.command.description ? (
          <span className="command-item-description"> {result.command.description}</span>
        ) : null}
      </span>
      <span className="command-item-source">{result.command.source}</span>
    </button>
  )
}
