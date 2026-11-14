import { useMemo, useState } from 'react'
import { BookOpen, Terminal } from 'lucide-react'
import { writeClipboardText } from '../../api/clipboard-api'
import { useLocale, useT } from '../../i18n'
import { CodeBlock, Detail, Icon, List, ListItem, Tag } from '../../ui'
import { searchTldrPages } from './search-tldr-pages'
import { tldrPages } from './tldr-data'
import type { TldrPage, TldrPlatform } from './tldr-types'
import { getTldrPlatformLabel } from './tldr-types'
import { ToolShell } from '../../core/tool/ToolShell'

const platformValues: Array<TldrPlatform | 'all'> = ['all', 'common', 'linux', 'osx', 'windows']

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

export default function TldrReference() {
  const tr = useT()
  const locale = useLocale()
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
    <ToolShell
      title={tr('tldr 快速示例', 'tldr Quick Examples')}
      description={tr(
        '基于 tldr 精简示例库，输入命令名即可查看最常用的几条用法，比 man 手册更适合日常开发速查。',
        'Browse curated tldr examples by command name to quickly check common flags instead of reading full man pages.',
      )}
      badge="tldr"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('搜索命令', 'Search command')}</span>
          <input
            id="command-cheatsheet-query"
            name="command-cheatsheet-query"
            className="qb-tool-input qb-mono"
            placeholder={tr('例如 tar、find、grep、docker', 'e.g. tar, find, grep, docker')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('平台筛选', 'Platform filter')}</span>
          <div className="qb-tool-options">
            {platformValues.map((value) => (
              <button
                key={value}
                className={platform === value ? 'qb-tool-button qb-tool-button--primary' : 'qb-tool-button'}
                type="button"
                onClick={() => setPlatform(value)}
              >
                {value === 'all' ? tr('全部', 'All') : getTldrPlatformLabel(value, locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr(`匹配结果 (${results.length})`, `Matches (${results.length})`)}</span>
          <List
            emptyState={
              <div className="qb-tool-options">
                {tr('没有匹配的命令，试试 tar、find、chmod 或 git status。', 'No matching commands. Try tar, find, chmod, or git status.')}
              </div>
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
                accessory={<Tag tone={getPlatformTone(item.page.platform)}>{getTldrPlatformLabel(item.page.platform, locale)}</Tag>}
                onClick={setSelectedId}
              />
            ))}
          </List>
        </div>

        {selectedPage ? (
          <div className="qb-tool-field qb-tool-field--full">
            <span className="qb-tool-label">
              {selectedPage.command}
              <Tag tone={getPlatformTone(selectedPage.platform)}>{getTldrPlatformLabel(selectedPage.platform, locale)}</Tag>
            </span>
            <div className="qb-tool-options">
              <span>{selectedPage.summary}</span>
              {selectedPage.moreInfo ? (
                <a href={selectedPage.moreInfo} target="_blank" rel="noreferrer">
                  {tr('更多说明', 'More info')}
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
                      {tr('复制命令', 'Copy command')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          `- 数据整理自开源项目 [tldr-pages](https://github.com/tldr-pages/tldr)。\n- 占位符 \`{{name}}\` 表示需要替换的参数。\n- 平台筛选会始终保留 \`common\` 通用命令。\n- 适合快速回忆 tar 解压、find 排除目录等高频场景。`,
          `- Curated from [tldr-pages](https://github.com/tldr-pages/tldr).\n- Placeholders like \`{{name}}\` represent arguments you should replace.\n- Platform filtering always includes \`common\` cross-platform commands.\n- Great for quickly recalling frequent recipes like \`tar\` extraction or \`find\` exclusions.`,
        )}
        metadata={[
          { label: tr('来源', 'Source'), value: 'tldr-pages (CC BY 4.0)' },
          { label: tr('内置条目', 'Entries'), value: String(tldrPages.length) },
          { label: tr('搜索', 'Search'), value: tr('命令名、别名、示例描述', 'Command, alias, or description') },
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
          {tr('复制当前页面', 'Copy page')}
        </button>
      </div>
    </ToolShell>
  )
}
