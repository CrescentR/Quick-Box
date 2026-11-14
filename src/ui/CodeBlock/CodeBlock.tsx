import { useState } from 'react'
import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { writeClipboardText } from '../../api/clipboard-api'
import './CodeBlock.css'
import { ToolResultActions } from '../../core/tool/ToolResultActions'
import type { ToolDataType } from '../../core/tool/tool-context'
import { useT } from '../../i18n'

export interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  code: string
  language?: string
  showLineNumbers?: boolean
  wrap?: boolean
  copyable?: boolean
  resultType?: ToolDataType
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  wrap = false,
  copyable = false,
  resultType,
  className,
  ...props
}: CodeBlockProps) {
  const tr = useT()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const lines = code.split('\n')

  const copyLabel =
    copyState === 'copied'
      ? tr('已复制', 'Copied')
      : copyState === 'failed'
        ? tr('复制失败，请重试', 'Copy failed')
        : tr('复制', 'Copy')

  const handleCopy = async () => {
    try {
      await writeClipboardText(code)
      setCopyState('copied')
    } catch { setCopyState('failed') }
    window.setTimeout(() => setCopyState('idle'), 1200)
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
      {resultType && <ToolResultActions text={code} type={resultType} />}
    </section>
  )
}

export default CodeBlock
