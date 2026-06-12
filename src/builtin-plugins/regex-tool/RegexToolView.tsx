import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import { CodeBlock, Detail, Tag } from '../../ui'

const supportedFlags = new Set(['g', 'i', 'm', 's', 'u', 'y'])

function normalizeFlags(flags: string) {
  const normalized: string[] = []

  for (const flag of flags.trim()) {
    if (!supportedFlags.has(flag)) {
      throw new Error(`暂不支持标记 "${flag}"`)
    }

    if (!normalized.includes(flag)) {
      normalized.push(flag)
    }
  }

  return normalized.join('')
}

function collectMatches(pattern: string, flags: string, text: string) {
  try {
    const normalizedFlags = normalizeFlags(flags)
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
    return error instanceof Error ? error.message : '正则表达式无效'
  }
}

function getStringParam(params: PluginViewProps['params'], key: string, fallback: string) {
  const value = params?.[key]
  return typeof value === 'string' ? value : fallback
}

export default function RegexToolView({ params }: PluginViewProps) {
  const [pattern, setPattern] = useState(() => getStringParam(params, 'pattern', '\\b\\w+box\\b'))
  const [flags, setFlags] = useState(() => getStringParam(params, 'flags', 'gi'))
  const [text, setText] = useState(() =>
    getStringParam(params, 'text', 'QuickBox is a focused desktop toolbox.\nquickbox keeps tools close.'),
  )
  const result = useMemo(() => collectMatches(pattern, flags, text), [flags, pattern, text])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">正则测试</div>
          <div className="qb-tool-view__description">
            在启动器中快速验证正则表达式，查看匹配位置、捕获组和匹配数量。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">RegExp</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">表达式</span>
          <input
            id="regex-tool-pattern"
            name="regex-tool-pattern"
            className="qb-tool-input qb-mono"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">标记</span>
          <input
            id="regex-tool-flags"
            name="regex-tool-flags"
            className="qb-tool-input qb-mono"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
          />
        </label>

        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">测试文本</span>
          <textarea
            id="regex-tool-text"
            name="regex-tool-text"
            className="qb-tool-textarea qb-mono"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">匹配结果</span>
          <CodeBlock code={result} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(result)}
        >
          复制匹配结果
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 支持 JavaScript RegExp 常用标记：`g`、`i`、`m`、`s`、`u`、`y`。\n- 输出最多展示 50 条匹配，避免超长文本卡住界面。\n- 未输入 `g` 时会自动追加全局匹配标记用于结果列表。"
        metadata={[
          { label: '模式', value: '正则匹配测试' },
          { label: '输出', value: '匹配数量、位置、捕获组' },
          { label: '剪贴板', value: '支持复制' },
        ]}
      />
    </section>
  )
}
