import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { parseEnvText } from './env-parser'

export default function EnvParserToolView() {
  const [input, setInput] = useState('APP_NAME=QuickBox\nAPP_ENV=development\nexport API_BASE_URL="https://api.quickbox.local"\n# local only\nFEATURE_FLAGS=tools,plugins,settings')
  const result = useMemo(() => parseEnvText(input), [input])

  return (
    <ToolShell
      title=".env 配置解析器"
      level="L2"
      description="把 .env 文本解析为 JSON 和键值清单，保留注释、空行和错误行统计。"
      notes="- 支持 `KEY=value`、`export KEY=value`、单双引号值和行尾注释。\n- 当前版本不会读取本地文件，也不会写入系统环境变量。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">.env 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">JSON 输出</span>
          <CodeBlock code={result.json} language="json" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">键值清单</span>
          <CodeBlock code={result.table || '// 没有有效配置项'} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
