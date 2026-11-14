import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { analyzeSemver } from './semver-helper'

export default function SemverHelperToolView() {
  const tr = useT()
  const locale = useLocale()
  const [version, setVersion] = useState('v1.4.2-beta.1+build.7')
  const result = useMemo(() => analyzeSemver(version, locale), [locale, version])

  return (
    <ToolShell
      title={tr('SemVer 版本助手', 'SemVer Version Helper')}
      level="L1"
      description={tr(
        '解析语义化版本，并生成常见发布递增结果。',
        'Parse Semantic Versioning strings and compute next release bumps.',
      )}
      notes={tr(
        '- 支持 `v` 前缀、prerelease 和 build metadata。\n- 递增结果按 SemVer 常见发布规则重置低位版本号。',
        '- Supports leading `v` prefixes, prerelease identifiers, and build metadata.\n- Increments reset lower segments according to standard SemVer rules.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('版本号', 'Version')}</span>
          <input className="qb-tool-input qb-mono" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('发布建议', 'Release bumps')}</span>
          <CodeBlock code={result.summary} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('结构化结果', 'Structured output')}</span>
          <CodeBlock code={result.output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
