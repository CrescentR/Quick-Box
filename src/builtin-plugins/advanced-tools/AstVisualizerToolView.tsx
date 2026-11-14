import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { visualizeAst } from './ast-visualizer'

export default function AstVisualizerToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('const total = items.reduce((sum, item) => sum + item.price, 0)')
  const tree = useMemo(() => visualizeAst(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('AST 可视化工具', 'AST Visualizer')}
      level="L4"
      description={tr(
        '把代码片段拆成 token 树形视图，用来快速观察标识符、数字和符号层级。',
        'Break code snippets into an indented token tree to inspect identifiers, literals, and nesting depth.',
      )}
      notes={tr(
        '- 当前实现偏轻量，适合代码结构观察和教学演示。\n- 后续可替换为完整 JavaScript/TypeScript 解析器，输出真正 AST。',
        '- Lightweight tokenizer suited for quick structural inspection and demos.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('代码片段', 'Code snippet')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('结构视图', 'Structure tree')}</span>
          <CodeBlock code={tree} language="txt" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
