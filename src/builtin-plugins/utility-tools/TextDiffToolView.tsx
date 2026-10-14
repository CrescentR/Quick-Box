import { useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { ToolShell } from './ToolShell'
type DiffMode = 'lines' | 'words' | 'json'
function getDiffMethod(mode: DiffMode) {
  if (mode === 'json') return DiffMethod.JSON
  if (mode === 'words') return DiffMethod.WORDS_WITH_SPACE
  return DiffMethod.LINES
}

export default function TextDiffToolView() {
  const [left, setLeft] = useState('{\n  "name": "QuickBox",\n  "version": "0.5",\n  "enabled": true\n}')
  const [right, setRight] = useState('{\n  "name": "QuickBox",\n  "version": "0.6",\n  "enabled": true,\n  "tools": 50\n}')
  const [mode, setMode] = useState<DiffMode>('json')
  const [splitView, setSplitView] = useState(true)

  return (
    <ToolShell title="文本/代码差异对比" level="L2" description="左右粘贴 JSON 或文本，使用 React Diff 组件高亮差异。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">左侧文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={left} onChange={(event) => setLeft(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">右侧文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={right} onChange={(event) => setRight(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">对比方式</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as DiffMode)}>
            <option value="json">JSON</option>
            <option value="lines">按行</option>
            <option value="words">按词</option>
          </select>
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">视图</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={splitView} onChange={(event) => setSplitView(event.target.checked)} />
            <span>左右分栏</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">差异</span>
          <div className="qb-tool-diff-view">
            <ReactDiffViewer
              oldValue={left}
              newValue={right}
              splitView={splitView}
              compareMethod={getDiffMethod(mode)}
              showDiffOnly={false}
              useDarkTheme
              disableWorker
              leftTitle="旧文本"
              rightTitle="新文本"
            />
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
