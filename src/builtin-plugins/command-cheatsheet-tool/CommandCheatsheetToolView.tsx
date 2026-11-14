import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useLocale, useT } from '../../i18n'
import CommandMarkdown from './CommandMarkdown'
import { searchLinuxCommands, type IndexedLinuxCommand } from './search-linux-commands'
import { loadLinuxCommands } from './linux-command-data'
import source from './data/source.json'
import license from './data/LICENSE.linux-command.txt?raw'
import './command-cheatsheet.css'

const TldrReference = lazy(() => import('./TldrReference'))
const pageSize = 60

export default function CommandCheatsheetToolView() {
  const tr = useT()
  const locale = useLocale()
  const [mode, setMode] = useState<'manual' | 'tldr'>('manual')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedName, setSelectedName] = useState('ls')
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [message, setMessage] = useState('')
  const articleRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { copyText, clipboardToast } = useClipboardToast()
  const [indexed, setIndexed] = useState<IndexedLinuxCommand[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoadError('')
    loadLinuxCommands().then((data) => { if (active) setIndexed(data) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : String(error)) })
    return () => { active = false }
  }, [loadAttempt])
  const categories = useMemo(() => [...new Set((indexed ?? []).map((command) => command.category))].sort((a, b) => a.localeCompare(b, locale)), [indexed, locale])
  const results = useMemo(() => searchLinuxCommands(indexed ?? [], query, category), [indexed, query, category])
  const selected = results.find((command) => command.name === selectedName) ?? results[0]
  const visible = results.slice(0, visibleCount)
  const select = (name: string) => { setSelectedName(name); if (articleRef.current) articleRef.current.scrollTop = 0; setMessage('') }
  const changeSearch = (value: string) => { setQuery(value); setSelectedName(''); setVisibleCount(pageSize); setMessage(''); if (listRef.current) listRef.current.scrollTop = 0; if (articleRef.current) articleRef.current.scrollTop = 0 }
  const openCommand = (name: string) => {
    const match = indexed?.find((command) => command.searchName === name.toLowerCase())
    if (!match) { setMessage(tr(`内置库中没有「${name}」的文档。`, `No manual found for "${name}" in the built-in archive.`)); return }
    setCategory('all'); changeSearch(match.name); select(match.name)
  }
  return <section className="qb-tool-view qb-command-reference">
    <header className="qb-command-reference__heading">
      <div><h2><BookOpen size={18} />{tr('Linux 命令大全', 'Linux Command Reference')}</h2><p>{tr(`${source.count} 份完整命令文档 · 本地离线可用`, `${source.count} offline command manuals · Available offline`)}</p></div>
      <div className="qb-command-reference__tabs" role="tablist" aria-label={tr('命令资料来源', 'Reference source')}>
        <button type="button" role="tab" id="command-manual-tab" aria-selected={mode === 'manual'} aria-controls="command-manual-panel" onClick={() => setMode('manual')}>{tr('完整手册', 'Full Manuals')}</button>
        <button type="button" role="tab" id="command-tldr-tab" aria-selected={mode === 'tldr'} aria-controls="command-tldr-panel" onClick={() => setMode('tldr')}>{tr('tldr 示例', 'tldr Examples')}</button>
      </div>
    </header>
    {mode === 'manual' && !indexed ? <div id="command-manual-panel" role="tabpanel" aria-labelledby="command-manual-tab" className="qb-command-reference__panel">
      {loadError
        ? <div className="qb-command-reference__empty" role="alert">{tr(`命令手册加载失败：${loadError}`, `Failed to load manuals: ${loadError}`)} <button type="button" className="qb-tool-button" onClick={() => setLoadAttempt((count) => count + 1)}>{tr('重试', 'Retry')}</button></div>
        : <p className="qb-command-reference__empty" role="status">{tr('正在加载命令手册…', 'Loading command manuals...')}</p>}
    </div> : mode === 'manual' ? <div id="command-manual-panel" role="tabpanel" aria-labelledby="command-manual-tab" className="qb-command-reference__panel">
      <div className="qb-command-reference__toolbar">
        <label className="qb-command-reference__search"><Search size={15} /><input className="qb-tool-input" type="search" aria-label={tr('搜索 Linux 命令', 'Search Linux commands')} placeholder={tr('命令名、中文用途、选项或示例…', 'Command name, usage, options, or examples...')} value={query} onChange={(event) => changeSearch(event.target.value)} onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || event.nativeEvent.isComposing || !results.length) return
          event.preventDefault()
          const index = results.findIndex((command) => command.name === selected?.name)
          const next = event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'ArrowDown' ? Math.min(results.length - 1, index + 1) : index
          setVisibleCount((count) => Math.max(count, next + 1)); select(results[next].name)
          if (event.key === 'Enter') articleRef.current?.focus()
        }} /></label>
        <select className="qb-tool-input" aria-label={tr('命令分类', 'Command category')} value={category} onChange={(event) => { setCategory(event.target.value); setSelectedName(''); setVisibleCount(pageSize); if (articleRef.current) articleRef.current.scrollTop = 0 }}><option value="all">{tr('全部分类', 'All categories')}</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </div>
      <div className="qb-command-reference__layout">
        <aside className="qb-command-reference__sidebar">
          <div className="qb-command-reference__count" role="status">{query.trim() || category !== 'all' ? tr(`找到 ${results.length} 个命令`, `${results.length} commands found`) : tr(`全部 ${results.length} 个命令`, `${results.length} commands total`)}</div>
          <div className="qb-command-reference__list qb-scrollbar" ref={listRef} aria-label={tr('Linux 命令列表', 'Linux command list')}>
            {visible.map((command) => <button type="button" key={command.name} data-active={selected?.name === command.name} aria-pressed={selected?.name === command.name} onClick={() => select(command.name)}><strong>{command.name}</strong><span>{command.summary}</span></button>)}
            {!results.length && <p className="qb-command-reference__empty">{tr('没有匹配的命令，试试“压缩”“网络”或 systemctl。', 'No matching commands. Try "systemctl", "tar", or Chinese keywords.')}</p>}
            {results.length > visibleCount && <button type="button" className="qb-command-reference__more" onClick={() => setVisibleCount((count) => count + pageSize)}>{tr(`再显示 ${Math.min(pageSize, results.length - visibleCount)} 个（剩余 ${results.length - visibleCount}）`, `Show ${Math.min(pageSize, results.length - visibleCount)} more (${results.length - visibleCount} left)`)}</button>}
          </div>
        </aside>
        <article ref={articleRef} className="qb-command-reference__article qb-scrollbar" tabIndex={0} aria-label={selected ? tr(`${selected.name} 命令手册`, `${selected.name} manual`) : tr('命令手册', 'Command manual')}>
          {selected ? <>
            <div className="qb-command-reference__article-bar"><span>{selected.category}</span><button type="button" className="qb-tool-button" onClick={() => void copyText(selected.content, tr(`${selected.name} 完整手册`, `${selected.name} full manual`))}>{tr('复制完整手册', 'Copy full manual')}</button></div>
            <CommandMarkdown key={selected.name} content={selected.content} onCommandLink={openCommand} />
          </> : <div className="qb-command-reference__empty">{tr('调整搜索内容后，在这里查看命令说明、选项与示例。', 'Adjust your search to view command descriptions, flags, and examples here.')}</div>}
        </article>
      </div>
      {message && <p role="status">{message}</p>}
    </div> : <div id="command-tldr-panel" role="tabpanel" aria-labelledby="command-tldr-tab"><Suspense fallback={<p role="status">{tr('正在加载快速示例…', 'Loading tldr examples...')}</p>}><TldrReference /></Suspense></div>}
    <footer className="qb-command-reference__source">
      <span>{tr('来源：', 'Source: ')}<a href={source.repository} target="_blank" rel="noopener noreferrer">jaywcjlove/linux-command</a> · MIT</span>
      <details><summary>{tr('版本与许可证', 'Version & License')}</summary><p>{tr(`文档版本 ${source.version} · 上游更新 ${source.revisionDate.slice(0, 10)} · 提交 `, `Docs v${source.version} · Updated ${source.revisionDate.slice(0, 10)} · Commit `)}<a href={`${source.repository}/commit/${source.revision}`} target="_blank" rel="noopener noreferrer">{source.revision.slice(0, 7)}</a></p><pre>{license}</pre></details>
    </footer>
    {clipboardToast}
  </section>
}
