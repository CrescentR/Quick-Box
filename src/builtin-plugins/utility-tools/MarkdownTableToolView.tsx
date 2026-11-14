import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

function parseDelimitedRows(input: string) {
  const delimiter = input.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)
  return rows.filter((item) => item.some((value) => value.trim()))
}

function escapeMarkdownCell(value: string) {
  return value.trim().replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function toMarkdownTable(input: string, hasHeader: boolean, locale: ResolvedLocale) {
  const rows = parseDelimitedRows(input).map((row) => row.map(escapeMarkdownCell))
  if (!rows.length) return ''
  const columnCount = Math.max(...rows.map((row) => row.length))
  const normalizedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
  const header = hasHeader ? normalizedRows[0] : normalizedRows[0].map((_, index) => lt(`列 ${index + 1}`, `Column ${index + 1}`, locale))
  const body = hasHeader ? normalizedRows.slice(1) : normalizedRows
  const widths = header.map((cell, index) =>
    Math.max(cell.length, 3, ...body.map((row) => row[index].length)),
  )
  const formatRow = (row: string[]) => `| ${row.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`
  const divider = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`
  return [formatRow(header), divider, ...body.map(formatRow)].join('\n')
}

export default function MarkdownTableToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('name\trole\nQuickBox\tlauncher\nPlugin\ttool view')
  const [hasHeader, setHasHeader] = useState(true)
  const output = useMemo(() => toMarkdownTable(input, hasHeader, locale), [hasHeader, input, locale])

  return (
    <ToolShell
      title={tr('Markdown 表格转换器', 'Markdown Table Converter')}
      level="L1"
      description={tr('把 Excel 粘贴文本、TSV 或 CSV 转成对齐的 Markdown 表格。', 'Convert Excel pastes, TSV, or CSV text into aligned Markdown tables.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('表格文本', 'Table Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={hasHeader} onChange={(event) => setHasHeader(event.target.checked)} />
          <span>{tr('第一行作为表头', 'First row as header')}</span>
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Markdown</span>
          <CodeBlock code={output || tr('// 等待表格输入', '// Waiting for table input')} language="md" showLineNumbers copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)} disabled={!output}>
          {tr('复制 Markdown 表格', 'Copy Markdown Table')}
        </button>
      </div>
    </ToolShell>
  )
}
