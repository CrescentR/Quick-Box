import { ToolShell } from '../../core/tool/ToolShell'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clearClipboardHistory, deleteClipboardHistoryItem, loadClipboardHistory, readClipboardText, recordClipboardText, writeClipboardText } from '../../api/clipboard-api'
import type { ClipboardHistoryItem } from '../../api/clipboard-api'
import { lt, useT } from '../../i18n'
import { CodeBlock, Tag } from '../../ui'

function formatHistoryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function summarizeClipboardText(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 96) return normalized
  return `${normalized.slice(0, 96)}...`
}

export default function ClipboardHistoryToolView() {
  const tr = useT()
  const [items, setItems] = useState<ClipboardHistoryItem[]>([])
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(true)
  const [status, setStatus] = useState('')
  const lastRecordedRef = useRef('')

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => item.text.toLowerCase().includes(keyword))
  }, [items, query])

  const refreshHistory = async () => {
    try {
      const nextItems = await loadClipboardHistory()
      setItems(nextItems)
      setStatus(lt(`已加载 ${nextItems.length} 条历史。`, `Loaded ${nextItems.length} history item(s).`))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : lt('加载剪贴板历史失败。', 'Failed to load clipboard history.'))
    }
  }

  const captureClipboard = async () => {
    try {
      const text = await readClipboardText()
      if (!text.trim()) {
        setStatus(lt('当前剪贴板没有可记录的纯文本。', 'No plain text found in the clipboard.'))
        return
      }
      if (text === lastRecordedRef.current) {
        setStatus(lt('当前剪贴板文本已经记录。', 'Current clipboard text is already recorded.'))
        return
      }
      const nextItems = await recordClipboardText(text)
      lastRecordedRef.current = text
      setItems(nextItems)
      setStatus(lt(`已记录 ${nextItems.length} 条历史，最多保留 100 条。`, `Recorded ${nextItems.length} history item(s) (up to 100 kept).`))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : lt('读取或记录剪贴板失败。', 'Failed to read or record clipboard.'))
    }
  }

  const copyHistoryItem = async (text: string) => {
    try {
      await writeClipboardText(text)
      lastRecordedRef.current = text
      const nextItems = await recordClipboardText(text)
      setItems(nextItems)
      setStatus(lt('已复制并刷新到历史顶部。', 'Copied and moved to the top of history.'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : lt('复制剪贴板历史失败。', 'Failed to copy clipboard history item.'))
    }
  }

  const deleteHistoryItem = async (id: number) => {
    try {
      const nextItems = await deleteClipboardHistoryItem(id)
      setItems(nextItems)
      setStatus(lt(`已删除，当前 ${nextItems.length} 条历史。`, `Deleted; ${nextItems.length} history item(s) remaining.`))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : lt('删除剪贴板历史失败。', 'Failed to delete clipboard history item.'))
    }
  }

  const clearHistory = async () => {
    try {
      await clearClipboardHistory()
      setItems([])
      setStatus(lt('已清空剪贴板历史。', 'Clipboard history cleared.'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : lt('清空剪贴板历史失败。', 'Failed to clear clipboard history.'))
    }
  }

  useEffect(() => {
    void refreshHistory()
  }, [])

  useEffect(() => {
    if (!listening) return undefined
    void captureClipboard()
    const timer = window.setInterval(() => {
      void captureClipboard()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [listening])

  return (
    <ToolShell
      title={tr('剪贴板纯文本历史记录', 'Clipboard Plain Text History')}
      level="L2"
      description={tr('监听系统剪贴板纯文本变化，记录到本地 SQLite，并只保留最新 100 条。', 'Watch system clipboard plain-text changes, save them to local SQLite, and retain the latest 100 entries.')}
      notes={tr(
        '- 仅记录纯文本，图片和文件不会进入历史。\n- 重复文本会刷新到最新位置。\n- 记录保存在本机 SQLite，不上传到网络。',
        '- Only plain text is recorded; images and files are excluded.\n- Duplicate entries move to the top.\n- Saved locally in SQLite and never uploaded.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('搜索历史', 'Search History')}</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('监听状态', 'Watcher Status')}</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={listening} onChange={(event) => setListening(event.target.checked)} />
            <span>{listening ? tr('正在监听', 'Listening') : tr('已暂停', 'Paused')}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('状态', 'Status')}</span>
          <CodeBlock code={status || tr('正在加载剪贴板历史。', 'Loading clipboard history.')} language="txt" wrap copyable={false} />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('历史记录', 'History')}</span>
          <div className="qb-tool-template-list">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <section className="qb-tool-template" key={item.id}>
                  <div className="qb-tool-template__head">
                    <div>
                      <div className="qb-tool-template__title">{summarizeClipboardText(item.text)}</div>
                      <div className="qb-tool-template__meta">
                        {formatHistoryTime(item.createdAt)} · {item.text.length} {tr('字符', 'chars')}
                      </div>
                    </div>
                    <Tag tone="default">{tr('文本', 'Text')}</Tag>
                  </div>
                  <CodeBlock code={item.text} language="txt" wrap copyable />
                  <div className="qb-tool-actions">
                    <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyHistoryItem(item.text)}>
                      {tr('复制', 'Copy')}
                    </button>
                    <button className="qb-tool-button" type="button" onClick={() => void deleteHistoryItem(item.id)}>
                      {tr('删除', 'Delete')}
                    </button>
                  </div>
                </section>
              ))
            ) : (
              <CodeBlock code={query ? tr('没有匹配的剪贴板历史。', 'No matching clipboard history.') : tr('暂无剪贴板历史。', 'No clipboard history yet.')} language="txt" wrap copyable={false} />
            )}
          </div>
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void captureClipboard()}>
          {tr('记录当前剪贴板', 'Capture Clipboard')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void refreshHistory()}>
          {tr('刷新', 'Refresh')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void clearHistory()} disabled={!items.length}>
          {tr('清空历史', 'Clear History')}
        </button>
      </div>
    </ToolShell>
  )
}
