import { useState } from 'react'
import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { writeClipboardText } from '../../api/clipboard-api'
import './CodeBlock.css'

export interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  code: string
  language?: string
  showLineNumbers?: boolean
  wrap?: boolean
  copyable?: boolean
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  wrap = false,
  copyable = false,
  className,
  ...props
}: CodeBlockProps) {
  const [copyLabel, setCopyLabel] = useState('复制')
  const lines = code.split('\n')

  const handleCopy = async () => {
    await writeClipboardText(code)
    setCopyLabel('已复制')
    window.setTimeout(() => setCopyLabel('复制'), 1200)
  }

  return (
    <section className={clsx('qb-code-block', className)} {...props}>
      {language || copyable ? (
        <div className="qb-code-block__header">
          <div className="qb-code-block__meta">
            {language ? <span className="qb-code-block__language">{language}</span> : null}
          </div>
          {copyable ? (
            <button className="qb-code-block__copy" type="button" onClick={() => void handleCopy()}>
              {copyLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <pre className={clsx('qb-code-block__body qb-scrollbar', wrap && 'qb-code-block__body--wrap')}>
        {showLineNumbers
          ? lines.map((line, index) => (
              <div key={index} className="qb-code-block__line">
                <span className="qb-code-block__line-number">{index + 1}</span>
                <span>{line || ' '}</span>
              </div>
            ))
          : code}
      </pre>
    </section>
  )
}

export default CodeBlock
