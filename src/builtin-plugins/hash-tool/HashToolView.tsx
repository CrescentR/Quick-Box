import { useEffect, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

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
  const tr = useT()
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
          setError(nextError instanceof Error ? nextError.message : tr('无法生成摘要', 'Failed to compute digest'))
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [algorithm, input, tr])

  return (
    <ToolShell
      title={tr('Hash 工具', 'Hash Digest')}
      description={tr(
        '为文本生成 SHA 系列摘要，适合校验 payload、签名调试和比对短文本指纹。',
        'Generate SHA digests locally for payload verification and signature debugging.',
      )}
      badge={algorithm}
    >

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('输入文本', 'Input Text')}</span>
          <textarea
            id="hash-tool-input"
            name="hash-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('算法', 'Algorithm')}</span>
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
          <span className="qb-tool-label">{tr('摘要结果', 'Digest Output')}</span>
          <CodeBlock code={error || digest || tr('// 等待输入', '// Waiting for input')} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void copyText(digest, `${algorithm} digest`)}
          disabled={!digest}
        >
          {tr('复制摘要', 'Copy Digest')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 使用浏览器 Web Crypto API 生成摘要。\n- 支持 SHA-1、SHA-256 和 SHA-512。\n- 摘要以十六进制小写字符串输出。',
          '- Uses the native Web Crypto API locally.\n- Supports SHA-1, SHA-256, and SHA-512.\n- Outputs lowercase hexadecimal digest strings.',
        )}
        metadata={[
          { label: tr('输入', 'Input'), value: tr('UTF-8 文本', 'UTF-8 Text') },
          { label: tr('算法', 'Algorithms'), value: algorithms.join(' / ') },
          { label: tr('剪贴板', 'Clipboard'), value: tr('支持复制', 'Copy ready') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
