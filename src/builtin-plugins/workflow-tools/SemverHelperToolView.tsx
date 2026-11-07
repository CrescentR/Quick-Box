import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { analyzeSemver } from './semver-helper'

export default function SemverHelperToolView() {
  const [version, setVersion] = useState('v1.4.2-beta.1+build.7')
  const result = useMemo(() => analyzeSemver(version), [version])

  return (
    <ToolShell
      title="SemVer 版本助手"
      level="L1"
      description="解析语义化版本，并生成常见发布递增结果。"
      notes="- 支持 `v` 前缀、prerelease 和 build metadata。\n- 递增结果按 SemVer 常见发布规则重置低位版本号。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">版本号</span>
          <input className="qb-tool-input qb-mono" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">发布建议</span>
          <CodeBlock code={result.summary} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">结构化结果</span>
          <CodeBlock code={result.output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
