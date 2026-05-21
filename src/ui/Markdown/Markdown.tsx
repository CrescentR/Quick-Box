import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import './Markdown.css'

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; content: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'paragraph'; content: string }

export interface MarkdownProps extends HTMLAttributes<HTMLDivElement> {
  content: string
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? ''

    if (!line) {
      index += 1
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    if (/^- /.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const current = lines[index]?.trim() ?? ''
        if (!/^- /.test(current)) {
          break
        }
        items.push(current.replace(/^- /, '').trim())
        index += 1
      }
      blocks.push({ type: 'unordered-list', items })
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const current = lines[index]?.trim() ?? ''
        if (!/^\d+\.\s/.test(current)) {
          break
        }
        items.push(current.replace(/^\d+\.\s/, '').trim())
        index += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const current = lines[index]?.trim() ?? ''
      if (!current || /^(#{1,3})\s+/.test(current) || /^- /.test(current) || /^\d+\.\s/.test(current)) {
        break
      }
      paragraphLines.push(current)
      index += 1
    }
    blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') })
  }

  return blocks
}

function renderInline(content: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match = pattern.exec(content)

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={`${token}-${match.index}`}>{token.slice(1, -1)}</em>)
    }

    lastIndex = match.index + token.length
    match = pattern.exec(content)
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex))
  }

  return nodes
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === 'heading') {
    if (block.level === 1) {
      return <h1 key={index}>{renderInline(block.content)}</h1>
    }
    if (block.level === 2) {
      return <h2 key={index}>{renderInline(block.content)}</h2>
    }
    return <h3 key={index}>{renderInline(block.content)}</h3>
  }

  if (block.type === 'unordered-list') {
    return (
      <ul key={index}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>
    )
  }

  if (block.type === 'ordered-list') {
    return (
      <ol key={index}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ol>
    )
  }

  return <p key={index}>{renderInline(block.content)}</p>
}

export function Markdown({ content, className, ...props }: MarkdownProps) {
  const blocks = parseBlocks(content)

  return (
    <div className={clsx('qb-markdown', className)} {...props}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  )
}

export default Markdown
