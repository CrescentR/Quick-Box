import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { gitignoreTemplates, buildGitignore } from './gitignore-generator'
import type { GitignoreTemplateKey } from './gitignore-generator'

export default function GitignoreGeneratorToolView() {
  const [selectedTemplates, setSelectedTemplates] = useState<GitignoreTemplateKey[]>(['node', 'rust', 'tauri', 'os'])
  const [customLines, setCustomLines] = useState('.codex-logs/\n*.log')
  const result = useMemo(() => buildGitignore(selectedTemplates, customLines), [customLines, selectedTemplates])

  const toggleTemplate = (key: GitignoreTemplateKey, checked: boolean) => {
    setSelectedTemplates((current) => (checked ? [...current, key] : current.filter((item) => item !== key)))
  }

  return (
    <ToolShell
      title="Gitignore 片段生成器"
      level="L1"
      description="按项目类型组合 .gitignore 片段，并附加自定义忽略规则。"
      notes="- 模板输出只生成文本，不修改仓库文件。\n- 自定义规则会追加到输出底部。"
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">模板</span>
          <div className="qb-tool-options">
            {Object.entries(gitignoreTemplates).map(([key, template]) => (
              <label className="qb-tool-checkbox" key={key}>
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(key as GitignoreTemplateKey)}
                  onChange={(event) => toggleTemplate(key as GitignoreTemplateKey, event.target.checked)}
                />
                <span>{template.label}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="qb-tool-field">
          <span className="qb-tool-label">自定义规则</span>
          <textarea className="qb-tool-textarea qb-mono" value={customLines} onChange={(event) => setCustomLines(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">.gitignore 输出</span>
          <CodeBlock code={result.output || '# 未选择模板'} language="gitignore" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
