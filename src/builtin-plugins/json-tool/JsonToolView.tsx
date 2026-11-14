import { useToolOption } from '../../core/tool/use-tool-option'
import { useToolInput } from '../../core/tool/tool-context'
import { useMemo } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

export default function JsonToolView() {
  const tr = useT()
  const [input, setInput] = useToolInput('{\n  "name": "QuickBox",\n  "mode": "design-system"\n}')
  const { copyText, clipboardToast } = useClipboardToast()

  const [indent, setIndent] = useToolOption<number>('json.indent', 2)
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input), null, indent === 4 ? 4 : 2)
    } catch (error) {
      return error instanceof Error ? error.message : tr('JSON 无效', 'Invalid JSON')
    }
  }, [input, indent, tr])

  const minified = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input))
    } catch {
      return ''
    }
  }, [input])

  return (
    <ToolShell
      title={tr('JSON 工具', 'JSON Formatter')}
      description={tr(
        '在统一的 QuickBox 工具面板中格式化、校验和压缩 JSON，输入与结果保持清晰分区。',
        'Format, validate, and minify JSON in a unified workspace with chained output actions.',
      )}
      badge={tr('格式化', 'Formatter')}
    >

      <label className="qb-tool-field">{tr('缩进（自动保存预设）', 'Indent (saved automatically)')}<select className="qb-tool-input" value={indent === 4 ? 4 : 2} onChange={(event) => setIndent(Number(event.target.value))}><option value={2}>{tr('2 空格', '2 spaces')}</option><option value={4}>{tr('4 空格', '4 spaces')}</option></select></label>
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea
            id="json-tool-input"
            name="json-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('格式化结果', 'Formatted')}</span>
          <CodeBlock code={formatted} language="json" wrap copyable={Boolean(minified)} resultType={minified ? 'json' : undefined} />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('压缩结果', 'Minified')}</span>
          <CodeBlock code={minified || tr('// JSON 无效', '// Invalid JSON')} language="json" wrap copyable={Boolean(minified)} resultType={minified ? 'json' : undefined} />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          disabled={!minified} onClick={() => void copyText(formatted, 'Formatted JSON result')}
        >
          {tr('复制格式化结果', 'Copy Formatted')}
        </button>
        <button className="qb-tool-button" type="button" disabled={!minified} onClick={() => void copyText(minified, 'Minified JSON result')}>
          {tr('复制压缩结果', 'Copy Minified')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 支持任意合法 JSON 对象或数组。\n- 输入无效时，会在格式化区域直接显示错误信息。\n- 结果区保持等宽字体，方便开发调试和复制。',
          '- Accepts any valid JSON value, object, or array.\n- Syntax errors are displayed directly in the formatted output area.\n- Send valid JSON directly into TypeScript, Rust, Java Bean, Schema, or CSV tools.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('格式化 / 校验 / 压缩', 'Format / Validate / Minify') },
          { label: tr('输出', 'Output'), value: tr('JSON 文本', 'JSON Text') },
          { label: tr('操作', 'Action'), value: tr('支持复制到剪贴板', 'Copy to clipboard') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
