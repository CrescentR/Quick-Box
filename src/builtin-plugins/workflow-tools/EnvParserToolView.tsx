import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { parseEnvText } from './env-parser'

export default function EnvParserToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('APP_NAME=QuickBox\nAPP_ENV=development\nexport API_BASE_URL="https://api.quickbox.local"\n# local only\nFEATURE_FLAGS=tools,plugins,settings')
  const result = useMemo(() => parseEnvText(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('.env 配置解析器', '.env Config Parser')}
      level="L2"
      description={tr(
        '把 .env 文本解析为 JSON 和键值清单，保留注释、空行和错误行统计。',
        'Parse .env files into JSON and key-value lists while tracking comments, blank lines, and invalid entries.',
      )}
      notes={tr(
        '- 支持 `KEY=value`、`export KEY=value`、单双引号值和行尾注释。\n- 当前版本不会读取本地文件，也不会写入系统环境变量。',
        '- Supports `KEY=value`, `export KEY=value`, quoted strings, and trailing comments.\n- Operates purely on pasted text without modifying environment variables.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('.env 输入', '.env input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('JSON 输出', 'JSON output')}</span>
          <CodeBlock code={result.json} language="json" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('键值清单', 'Key-value list')}</span>
          <CodeBlock code={result.table || tr('// 没有有效配置项', '// No valid entries')} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('统计', 'Summary')}</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
