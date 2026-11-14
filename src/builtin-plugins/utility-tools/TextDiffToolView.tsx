import { useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { ToolShell } from '../../core/tool/ToolShell'
import { useT } from '../../i18n'
type DiffMode = 'lines' | 'words' | 'json'
function getDiffMethod(mode: DiffMode) {
  if (mode === 'json') return DiffMethod.JSON
  if (mode === 'words') return DiffMethod.WORDS_WITH_SPACE
  return DiffMethod.LINES
}

export default function TextDiffToolView() {
  const tr = useT()
  const [left, setLeft] = useState('{\n  "name": "QuickBox",\n  "version": "0.5",\n  "enabled": true\n}')
  const [right, setRight] = useState('{\n  "name": "QuickBox",\n  "version": "0.6",\n  "enabled": true,\n  "tools": 50\n}')
  const [mode, setMode] = useState<DiffMode>('json')
  const [splitView, setSplitView] = useState(true)

  return (
    <ToolShell
      title={tr('文本/代码差异对比', 'Text / Code Diff')}
      level="L2"
      description={tr('左右粘贴 JSON 或文本，使用 React Diff 组件高亮差异。', 'Compare JSON, code, or plain text side by side with inline diff highlighting.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('左侧文本', 'Original Text')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={left} onChange={(event) => setLeft(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('右侧文本', 'Modified Text')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={right} onChange={(event) => setRight(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('对比方式', 'Diff Mode')}</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as DiffMode)}>
            <option value="json">JSON</option>
            <option value="lines">{tr('按行', 'Lines')}</option>
            <option value="words">{tr('按词', 'Words')}</option>
          </select>
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('视图', 'View')}</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={splitView} onChange={(event) => setSplitView(event.target.checked)} />
            <span>{tr('左右分栏', 'Split View')}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('差异', 'Diff')}</span>
          <div className="qb-tool-diff-view">
            <ReactDiffViewer
              oldValue={left}
              newValue={right}
              splitView={splitView}
              compareMethod={getDiffMethod(mode)}
              showDiffOnly={false}
              useDarkTheme
              disableWorker
              leftTitle={tr('旧文本', 'Old')}
              rightTitle={tr('新文本', 'New')}
            />
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
