import { ToolShell } from './ToolShell'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clearClipboardHistory, deleteClipboardHistoryItem, loadClipboardHistory, readClipboardText, recordClipboardText, writeClipboardText } from '../../api/clipboard-api'
import type { ClipboardHistoryItem } from '../../api/clipboard-api'
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
  const [items, setItems] = useState<ClipboardHistoryItem[]>([])
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(true)
  const [status, setStatus] = useState('正在加载剪贴板历史。')
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
      setStatus(`已加载 ${nextItems.length} 条历史。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '加载剪贴板历史失败。')
    }
  }

  const captureClipboard = async () => {
    try {
      const text = await readClipboardText()
      if (!text.trim()) {
        setStatus('当前剪贴板没有可记录的纯文本。')
        return
      }
      if (text === lastRecordedRef.current) {
        setStatus('当前剪贴板文本已经记录。')
        return
      }
      const nextItems = await recordClipboardText(text)
      lastRecordedRef.current = text
      setItems(nextItems)
      setStatus(`已记录 ${nextItems.length} 条历史，最多保留 100 条。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '读取或记录剪贴板失败。')
    }
  }

  const copyHistoryItem = async (text: string) => {
    try {
      await writeClipboardText(text)
      lastRecordedRef.current = text
      const nextItems = await recordClipboardText(text)
      setItems(nextItems)
      setStatus('已复制并刷新到历史顶部。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '复制剪贴板历史失败。')
    }
  }

  const deleteHistoryItem = async (id: number) => {
    try {
      const nextItems = await deleteClipboardHistoryItem(id)
      setItems(nextItems)
      setStatus(`已删除，当前 ${nextItems.length} 条历史。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '删除剪贴板历史失败。')
    }
  }

  const clearHistory = async () => {
    try {
      await clearClipboardHistory()
      setItems([])
      setStatus('已清空剪贴板历史。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '清空剪贴板历史失败。')
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
      title="剪贴板纯文本历史记录"
      level="L2"
      description="监听系统剪贴板纯文本变化，记录到本地 SQLite，并只保留最新 100 条。"
      notes="- 仅记录纯文本，图片和文件不会进入历史。\n- 重复文本会刷新到最新位置。\n- 记录保存在本机 SQLite，不上传到网络。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">搜索历史</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">监听状态</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={listening} onChange={(event) => setListening(event.target.checked)} />
            <span>{listening ? '正在监听' : '已暂停'}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">状态</span>
          <CodeBlock code={status} language="txt" wrap copyable={false} />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">历史记录</span>
          <div className="qb-tool-template-list">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <section className="qb-tool-template" key={item.id}>
                  <div className="qb-tool-template__head">
                    <div>
                      <div className="qb-tool-template__title">{summarizeClipboardText(item.text)}</div>
                      <div className="qb-tool-template__meta">
                        {formatHistoryTime(item.createdAt)} · {item.text.length} 字符
                      </div>
                    </div>
                    <Tag tone="default">文本</Tag>
                  </div>
                  <CodeBlock code={item.text} language="txt" wrap copyable />
                  <div className="qb-tool-actions">
                    <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyHistoryItem(item.text)}>
                      复制
                    </button>
                    <button className="qb-tool-button" type="button" onClick={() => void deleteHistoryItem(item.id)}>
                      删除
                    </button>
                  </div>
                </section>
              ))
            ) : (
              <CodeBlock code={query ? '没有匹配的剪贴板历史。' : '暂无剪贴板历史。'} language="txt" wrap copyable={false} />
            )}
          </div>
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void captureClipboard()}>
          记录当前剪贴板
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void refreshHistory()}>
          刷新
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void clearHistory()} disabled={!items.length}>
          清空历史
        </button>
      </div>
    </ToolShell>
  )
}
