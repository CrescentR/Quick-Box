import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { gitignoreTemplates, buildGitignore } from './gitignore-generator'
import type { GitignoreTemplateKey } from './gitignore-generator'

export default function GitignoreGeneratorToolView() {
  const tr = useT()
  const locale = useLocale()
  const [selectedTemplates, setSelectedTemplates] = useState<GitignoreTemplateKey[]>(['node', 'rust', 'tauri', 'os'])
  const [customLines, setCustomLines] = useState('.codex-logs/\n*.log')
  const result = useMemo(() => buildGitignore(selectedTemplates, customLines, locale), [customLines, locale, selectedTemplates])

  const toggleTemplate = (key: GitignoreTemplateKey, checked: boolean) => {
    setSelectedTemplates((current) => (checked ? [...current, key] : current.filter((item) => item !== key)))
  }

  return (
    <ToolShell
      title={tr('Gitignore 片段生成器', 'Gitignore Generator')}
      level="L1"
      description={tr(
        '按项目类型组合 .gitignore 片段，并附加自定义忽略规则。',
        'Combine .gitignore snippets by stack and append custom ignore patterns.',
      )}
      notes={tr(
        '- 模板输出只生成文本，不修改仓库文件。\n- 自定义规则会追加到输出底部。',
        '- Generates text only without modifying any files in your repository.\n- Custom rules are appended at the bottom.',
      )}
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('模板', 'Presets')}</span>
          <div className="qb-tool-options">
            {Object.entries(gitignoreTemplates).map(([key, template]) => (
              <label className="qb-tool-checkbox" key={key}>
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(key as GitignoreTemplateKey)}
                  onChange={(event) => toggleTemplate(key as GitignoreTemplateKey, event.target.checked)}
                />
                <span>{locale === 'en-US' ? template.enLabel : template.label}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('自定义规则', 'Custom rules')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={customLines} onChange={(event) => setCustomLines(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('.gitignore 输出', '.gitignore output')}</span>
          <CodeBlock code={result.output || tr('# 未选择模板', '# No presets selected')} language="gitignore" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('统计', 'Summary')}</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
