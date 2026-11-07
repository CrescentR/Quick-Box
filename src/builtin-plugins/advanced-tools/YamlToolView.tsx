import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatYaml } from './yaml'

export default function YamlToolView() {
  const [input, setInput] = useState('name: QuickBox\nfeatures:\n  - 启动器\n  - 工具箱\nversion: 0.1.0')
  const result = useMemo(() => formatYaml(input), [input])

  return (
    <ToolShell title="YAML 格式化与校验" level="L2" description="整理 YAML 缩进和键值间距，并提示常见结构问题。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">YAML 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={result.formatted} language="yaml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">校验报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
