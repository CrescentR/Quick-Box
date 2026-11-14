import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatXml } from './xml'

export default function XmlToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('<tool id="quickbox"><name>QuickBox</name><enabled>true</enabled></tool>')
  const result = useMemo(() => formatXml(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('XML 格式化与校验', 'XML Formatter & Validator')}
      level="L2"
      description={tr(
        '解析 XML 文本，输出缩进后的结构和基础校验信息。',
        'Parse XML markup, pretty-print nested tags, and report structural errors.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('XML 输入', 'XML input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('格式化结果', 'Formatted XML')}</span>
          <CodeBlock code={result.formatted} language="xml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('解析报告', 'Parse report')}</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
