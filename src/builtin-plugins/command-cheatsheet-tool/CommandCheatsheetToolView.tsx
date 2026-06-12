import { useMemo, useState } from 'react'
import { BookOpen, Terminal } from 'lucide-react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Icon, List, ListItem, Tag } from '../../ui'
import { searchTldrPages } from './search-tldr-pages'
import { tldrPages } from './tldr-data'
import type { TldrPage, TldrPlatform } from './tldr-types'
import { tldrPlatformLabels } from './tldr-types'

const platformFilters: Array<{ value: TldrPlatform | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'common', label: tldrPlatformLabels.common },
  { value: 'linux', label: tldrPlatformLabels.linux },
  { value: 'osx', label: tldrPlatformLabels.osx },
  { value: 'windows', label: tldrPlatformLabels.windows },
]

function getPlatformTone(platform: TldrPlatform): 'primary' | 'success' | 'warning' | 'default' {
  switch (platform) {
    case 'linux':
      return 'success'
    case 'windows':
      return 'warning'
    case 'osx':
      return 'primary'
    default:
      return 'default'
  }
}

export default function CommandCheatsheetToolView() {
  const [query, setQuery] = useState('tar')
  const [platform, setPlatform] = useState<TldrPlatform | 'all'>('all')
  const [selectedId, setSelectedId] = useState('tar@common')

  const results = useMemo(() => searchTldrPages(tldrPages, query, platform), [platform, query])

  const selectedPage = useMemo<TldrPage | null>(() => {
    const fromSelection = results.find((item) => item.page.id === selectedId)?.page
    if (fromSelection) {
      return fromSelection
    }

    return results[0]?.page ?? null
  }, [results, selectedId])

  const activeId = selectedPage?.id ?? ''

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">Linux 命令速查</div>
          <div className="qb-tool-view__description">
            基于 tldr 精简示例库，输入命令名即可查看最常用的几条用法，比 man 手册更适合日常开发速查。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">tldr</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">搜索命令</span>
          <input
            id="command-cheatsheet-query"
            name="command-cheatsheet-query"
            className="qb-tool-input qb-mono"
            placeholder="例如 tar、find、grep、docker"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">平台筛选</span>
          <div className="qb-tool-options">
            {platformFilters.map((item) => (
              <button
                key={item.value}
                className={platform === item.value ? 'qb-tool-button qb-tool-button--primary' : 'qb-tool-button'}
                type="button"
                onClick={() => setPlatform(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">匹配结果 ({results.length})</span>
          <List
            emptyState={
              <div className="qb-tool-options">没有匹配的命令，试试 tar、find、chmod 或 git status。</div>
            }
          >
            {results.map((item) => (
              <ListItem
                key={item.page.id}
                id={item.page.id}
                selected={activeId === item.page.id}
                icon={<Icon icon={Terminal} size={16} tone="muted" />}
                title={item.page.command}
                subtitle={item.page.summary}
                accessory={<Tag tone={getPlatformTone(item.page.platform)}>{tldrPlatformLabels[item.page.platform]}</Tag>}
                onClick={setSelectedId}
              />
            ))}
          </List>
        </div>

        {selectedPage ? (
          <div className="qb-tool-field qb-tool-field--full">
            <span className="qb-tool-label">
              {selectedPage.command}
              <Tag tone={getPlatformTone(selectedPage.platform)}>{tldrPlatformLabels[selectedPage.platform]}</Tag>
            </span>
            <div className="qb-tool-options">
              <span>{selectedPage.summary}</span>
              {selectedPage.moreInfo ? (
                <a href={selectedPage.moreInfo} target="_blank" rel="noreferrer">
                  更多说明
                </a>
              ) : null}
            </div>

            <div className="qb-tool-grid">
              {selectedPage.examples.map((example) => (
                <div key={`${selectedPage.id}-${example.command}`} className="qb-tool-field qb-tool-field--full">
                  <span className="qb-tool-label">{example.description}</span>
                  <CodeBlock code={example.command} language="bash" wrap copyable />
                  <div className="qb-tool-actions">
                    <button
                      className="qb-tool-button"
                      type="button"
                      onClick={() => void writeClipboardText(example.command)}
                    >
                      复制命令
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Detail
        title="使用说明"
        markdown={`- 数据整理自开源项目 [tldr-pages](https://github.com/tldr-pages/tldr)。\n- 占位符 \`{{name}}\` 表示需要替换的参数。\n- 平台筛选会始终保留 \`common\` 通用命令。\n- 适合快速回忆 tar 解压、find 排除目录等高频场景。`}
        metadata={[
          { label: '来源', value: 'tldr-pages (CC BY 4.0)' },
          { label: '内置条目', value: String(tldrPages.length) },
          { label: '搜索', value: '命令名、别名、示例描述' },
        ]}
      />

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button"
          type="button"
          disabled={!selectedPage}
          onClick={() => {
            if (!selectedPage) return
            const markdown = [
              `# ${selectedPage.command}`,
              '',
              selectedPage.summary,
              '',
              ...selectedPage.examples.flatMap((example) => [`- ${example.description}:`, '', `\`${example.command}\``, '']),
            ].join('\n')
            void writeClipboardText(markdown)
          }}
        >
          <Icon icon={BookOpen} size={14} />
          复制当前页面
        </button>
      </div>
    </section>
  )
}
