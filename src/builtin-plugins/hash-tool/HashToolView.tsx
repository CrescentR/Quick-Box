import { useEffect, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'

type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

const algorithms: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-512']

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function createDigest(input: string, algorithm: HashAlgorithm) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest(algorithm, data)
  return toHex(digest)
}

export default function HashToolView() {
  const [input, setInput] = useState('QuickBox')
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256')
  const [digest, setDigest] = useState('')
  const [error, setError] = useState('')
  const { copyText, clipboardToast } = useClipboardToast()

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const nextDigest = await createDigest(input, algorithm)
        if (!cancelled) {
          setDigest(nextDigest)
          setError('')
        }
      } catch (nextError) {
        if (!cancelled) {
          setDigest('')
          setError(nextError instanceof Error ? nextError.message : '无法生成摘要')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [algorithm, input])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">Hash 工具</div>
          <div className="qb-tool-view__description">
            为文本生成 SHA 系列摘要，适合校验 payload、签名调试和比对短文本指纹。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{algorithm}</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入文本</span>
          <textarea
            id="hash-tool-input"
            name="hash-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">算法</span>
          <select
            id="hash-tool-algorithm"
            name="hash-tool-algorithm"
            className="qb-tool-input"
            value={algorithm}
            onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}
          >
            {algorithms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">摘要结果</span>
          <CodeBlock code={error || digest || '// 等待输入'} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void copyText(digest, `${algorithm} digest`)}
          disabled={!digest}
        >
          复制摘要
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 使用浏览器 Web Crypto API 生成摘要。\n- 支持 SHA-1、SHA-256 和 SHA-512。\n- 摘要以十六进制小写字符串输出。"
        metadata={[
          { label: '输入', value: 'UTF-8 文本' },
          { label: '算法', value: algorithms.join(' / ') },
          { label: '剪贴板', value: '支持复制' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
