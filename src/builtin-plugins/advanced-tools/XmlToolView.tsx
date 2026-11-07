import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatXml } from './xml'

export default function XmlToolView() {
  const [input, setInput] = useState('<tool id="quickbox"><name>工具箱</name><enabled>true</enabled></tool>')
  const result = useMemo(() => formatXml(input), [input])

  return (
    <ToolShell title="XML 格式化与校验" level="L2" description="解析 XML 文本，输出缩进后的结构和基础校验信息。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">XML 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={result.formatted} language="xml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
