import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import CommandMarkdown from './CommandMarkdown'
import { indexLinuxCommands, searchLinuxCommands } from './search-linux-commands'
import commands from './data/linux-commands.json'
import source from './data/source.json'
import license from './data/LICENSE.linux-command.txt?raw'
import './command-cheatsheet.css'

const indexed = indexLinuxCommands(commands)
const categories = [...new Set(commands.map((command) => command.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const TldrReference = lazy(() => import('./TldrReference'))
const pageSize = 60

export default function CommandCheatsheetToolView() {
  const [mode, setMode] = useState<'manual' | 'tldr'>('manual')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedName, setSelectedName] = useState('ls')
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [message, setMessage] = useState('')
  const articleRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { copyText, clipboardToast } = useClipboardToast()
  const results = useMemo(() => searchLinuxCommands(indexed, query, category), [query, category])
  const selected = results.find((command) => command.name === selectedName) ?? results[0]
  const visible = results.slice(0, visibleCount)
  const select = (name: string) => { setSelectedName(name); if (articleRef.current) articleRef.current.scrollTop = 0; setMessage('') }
  const changeSearch = (value: string) => { setQuery(value); setSelectedName(''); setVisibleCount(pageSize); setMessage(''); if (listRef.current) listRef.current.scrollTop = 0; if (articleRef.current) articleRef.current.scrollTop = 0 }
  const openCommand = (name: string) => {
    const match = indexed.find((command) => command.searchName === name.toLowerCase())
    if (!match) { setMessage(`内置库中没有「${name}」的文档。`); return }
    setCategory('all'); changeSearch(match.name); select(match.name)
  }
  return <section className="qb-tool-view qb-command-reference">
    <header className="qb-command-reference__heading">
      <div><h2><BookOpen size={18} />Linux 命令大全</h2><p>{source.count} 份完整命令文档 · 本地离线可用</p></div>
      <div className="qb-command-reference__tabs" role="tablist" aria-label="命令资料来源">
        <button type="button" role="tab" id="command-manual-tab" aria-selected={mode === 'manual'} aria-controls="command-manual-panel" onClick={() => setMode('manual')}>完整手册</button>
        <button type="button" role="tab" id="command-tldr-tab" aria-selected={mode === 'tldr'} aria-controls="command-tldr-panel" onClick={() => setMode('tldr')}>tldr 示例</button>
      </div>
    </header>
    {mode === 'manual' ? <div id="command-manual-panel" role="tabpanel" aria-labelledby="command-manual-tab" className="qb-command-reference__panel">
      <div className="qb-command-reference__toolbar">
        <label className="qb-command-reference__search"><Search size={15} /><input className="qb-tool-input" type="search" aria-label="搜索 Linux 命令" placeholder="命令名、中文用途、选项或示例…" value={query} onChange={(event) => changeSearch(event.target.value)} onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || event.nativeEvent.isComposing || !results.length) return
          event.preventDefault()
          const index = results.findIndex((command) => command.name === selected?.name)
          const next = event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'ArrowDown' ? Math.min(results.length - 1, index + 1) : index
          setVisibleCount((count) => Math.max(count, next + 1)); select(results[next].name)
          if (event.key === 'Enter') articleRef.current?.focus()
        }} /></label>
        <select className="qb-tool-input" aria-label="命令分类" value={category} onChange={(event) => { setCategory(event.target.value); setSelectedName(''); setVisibleCount(pageSize); if (articleRef.current) articleRef.current.scrollTop = 0 }}><option value="all">全部分类</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </div>
      <div className="qb-command-reference__layout">
        <aside className="qb-command-reference__sidebar">
          <div className="qb-command-reference__count" role="status">{query.trim() || category !== 'all' ? `找到 ${results.length} 个命令` : `全部 ${results.length} 个命令`}</div>
          <div className="qb-command-reference__list qb-scrollbar" ref={listRef} aria-label="Linux 命令列表">
            {visible.map((command) => <button type="button" key={command.name} data-active={selected?.name === command.name} aria-pressed={selected?.name === command.name} onClick={() => select(command.name)}><strong>{command.name}</strong><span>{command.summary}</span></button>)}
            {!results.length && <p className="qb-command-reference__empty">没有匹配的命令，试试“压缩”“网络”或 systemctl。</p>}
            {results.length > visibleCount && <button type="button" className="qb-command-reference__more" onClick={() => setVisibleCount((count) => count + pageSize)}>再显示 {Math.min(pageSize, results.length - visibleCount)} 个（剩余 {results.length - visibleCount}）</button>}
          </div>
        </aside>
        <article ref={articleRef} className="qb-command-reference__article qb-scrollbar" tabIndex={0} aria-label={selected ? `${selected.name} 命令手册` : '命令手册'}>
          {selected ? <>
            <div className="qb-command-reference__article-bar"><span>{selected.category}</span><button type="button" className="qb-tool-button" onClick={() => void copyText(selected.content, `${selected.name} 完整手册`)}>复制完整手册</button></div>
            <CommandMarkdown key={selected.name} content={selected.content} onCommandLink={openCommand} />
          </> : <div className="qb-command-reference__empty">调整搜索内容后，在这里查看命令说明、选项与示例。</div>}
        </article>
      </div>
      {message && <p role="status">{message}</p>}
    </div> : <div id="command-tldr-panel" role="tabpanel" aria-labelledby="command-tldr-tab"><Suspense fallback={<p role="status">正在加载快速示例…</p>}><TldrReference /></Suspense></div>}
    <footer className="qb-command-reference__source">
      <span>来源：<a href={source.repository} target="_blank" rel="noopener noreferrer">jaywcjlove/linux-command</a> · MIT</span>
      <details><summary>版本与许可证</summary><p>文档版本 {source.version} · 上游更新 {source.revisionDate.slice(0, 10)} · 提交 <a href={`${source.repository}/commit/${source.revision}`} target="_blank" rel="noopener noreferrer">{source.revision.slice(0, 7)}</a></p><pre>{license}</pre></details>
    </footer>
    {clipboardToast}
  </section>
}
