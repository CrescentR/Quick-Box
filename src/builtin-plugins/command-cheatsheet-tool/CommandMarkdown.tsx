import { Children, isValidElement } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from '../../ui/CodeBlock/CodeBlock'
import './CommandMarkdown.css'

export interface CommandMarkdownProps {
  content: string
  onCommandLink?: (command: string) => void
}

function commandFromHref(href: string): string | undefined {
  const match = /^(?:\.\/|\/command\/)?([^/?#]+)\.md(?:[?#].*)?$/i.exec(href)
  if (!match) return undefined
  try {
    const command = decodeURIComponent(match[1])
    return command && !/[\\/\s\x00-\x1f]/.test(command) && command !== '.' && command !== '..'
      ? command
      : undefined
  } catch {
    return undefined
  }
}

function externalHref(href: string | undefined): string | undefined {
  if (!href || !/^https?:\/\//i.test(href)) return undefined
  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

function codeText(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (isValidElement<{ children?: ReactNode }>(child)) return codeText(child.props.children)
    return ''
  }).join('')
}

/** Offline documentation reader: Markdown is rendered without executing HTML or loading images. */
export function CommandMarkdown({ content, onCommandLink }: CommandMarkdownProps) {
  return (
    <div className="qb-command-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          pre({ children }) {
            const codeElement = Children.toArray(children).find((child) => isValidElement(child))
            const className = isValidElement<{ className?: string }>(codeElement)
              ? codeElement.props.className
              : undefined
            const language = /(?:^|\s)language-([^\s]+)/.exec(className ?? '')?.[1]
            return <CodeBlock code={codeText(children).replace(/\n$/, '')} language={language} copyable />
          },
          a({ href, children, title }) {
            const command = commandFromHref(href ?? '')
            if (command && onCommandLink) {
              return (
                <button
                  type="button"
                  className="qb-command-markdown__command-link"
                  title={title ?? `查看 ${command} 命令`}
                  onClick={() => onCommandLink(command)}
                >
                  {children}
                </button>
              )
            }
            const external = externalHref(href)
            return external
              ? <a href={external} title={title} target="_blank" rel="noopener noreferrer">{children}</a>
              : <span>{children}</span>
          },
          img({ src, alt }) {
            const external = externalHref(src)
            const label = alt ? `图片：${alt}` : '查看图片'
            return external
              ? <a href={external} target="_blank" rel="noopener noreferrer">{label} ↗</a>
              : <span className="qb-command-markdown__image-label">{label}</span>
          },
          table({ children }) {
            return (
              <div className="qb-command-markdown__table qb-scrollbar" role="region" aria-label="命令文档表格" tabIndex={0}>
                <table>{children}</table>
              </div>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default CommandMarkdown
