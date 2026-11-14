import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import { lt, useLocale, useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

const supportedFlags = new Set(['g', 'i', 'm', 's', 'u', 'y'])

function normalizeFlags(flags: string, locale: 'zh-CN' | 'en-US') {
  const normalized: string[] = []

  for (const flag of flags.trim()) {
    if (!supportedFlags.has(flag)) {
      throw new Error(lt(`暂不支持标记 "${flag}"`, `Unsupported flag "${flag}"`, locale))
    }

    if (!normalized.includes(flag)) {
      normalized.push(flag)
    }
  }

  return normalized.join('')
}

function collectMatches(pattern: string, flags: string, text: string, locale: 'zh-CN' | 'en-US') {
  try {
    const normalizedFlags = normalizeFlags(flags, locale)
    const globalFlags = normalizedFlags.includes('g') ? normalizedFlags : `${normalizedFlags}g`
    const regex = new RegExp(pattern, globalFlags)
    const matches: Array<{
      index: number
      match: string
      groups: string[]
    }> = []

    let match = regex.exec(text)
    while (match && matches.length < 50) {
      matches.push({
        index: match.index,
        match: match[0],
        groups: match.slice(1),
      })

      if (match[0] === '') {
        regex.lastIndex += 1
      }

      match = regex.exec(text)
    }

    return JSON.stringify(
      {
        matched: matches.length > 0,
        count: matches.length,
        flags: globalFlags,
        matches,
      },
      null,
      2,
    )
  } catch (error) {
    return error instanceof Error ? error.message : lt('正则表达式无效', 'Invalid regular expression', locale)
  }
}

function getStringParam(params: PluginViewProps['params'], key: string, fallback: string) {
  const value = params?.[key]
  return typeof value === 'string' ? value : fallback
}

export default function RegexToolView({ params }: PluginViewProps) {
  const tr = useT()
  const locale = useLocale()
  const [pattern, setPattern] = useState(() => getStringParam(params, 'pattern', '\\b\\w+box\\b'))
  const [flags, setFlags] = useState(() => getStringParam(params, 'flags', 'gi'))
  const [text, setText] = useState(() =>
    getStringParam(params, 'text', 'QuickBox is a focused desktop toolbox.\nquickbox keeps tools close.'),
  )
  const result = useMemo(() => collectMatches(pattern, flags, text, locale), [flags, locale, pattern, text])

  return (
    <ToolShell
      title={tr('正则测试', 'Regex Tester')}
      description={tr(
        '在启动器中快速验证正则表达式，查看匹配位置、捕获组和匹配数量。',
        'Test regular expressions quickly and inspect match offsets, capture groups, and counts.',
      )}
      badge="RegExp"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('表达式', 'Pattern')}</span>
          <input
            id="regex-tool-pattern"
            name="regex-tool-pattern"
            className="qb-tool-input qb-mono"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('标记', 'Flags')}</span>
          <input
            id="regex-tool-flags"
            name="regex-tool-flags"
            className="qb-tool-input qb-mono"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
          />
        </label>

        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('测试文本', 'Test text')}</span>
          <textarea
            id="regex-tool-text"
            name="regex-tool-text"
            className="qb-tool-textarea qb-mono"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('匹配结果', 'Match result')}</span>
          <CodeBlock code={result} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(result)}
        >
          {tr('复制匹配结果', 'Copy match result')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 支持 JavaScript RegExp 常用标记：`g`、`i`、`m`、`s`、`u`、`y`。\n- 输出最多展示 50 条匹配，避免超长文本卡住界面。\n- 未输入 `g` 时会自动追加全局匹配标记用于结果列表。',
          '- Supports common JavaScript RegExp flags: `g`, `i`, `m`, `s`, `u`, `y`.\n- Up to 50 matches are shown to keep the UI responsive.\n- If `g` is omitted, it is appended automatically to collect all matches.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('正则匹配测试', 'Regex matching') },
          { label: tr('输出', 'Output'), value: tr('匹配数量、位置、捕获组', 'Count, index, capture groups') },
          { label: tr('剪贴板', 'Clipboard'), value: tr('支持复制', 'Copy supported') },
        ]}
      />
    </ToolShell>
  )
}
