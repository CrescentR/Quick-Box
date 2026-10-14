import { useState } from 'react'
import { version } from '../../package.json'
import { invokeCommand } from '../api/tauri-api'

export default function ReleaseSettings() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('手动检查 GitHub 上的最新正式版本。')
  const [notes, setNotes] = useState('')
  const check = async () => {
    setBusy(true); setNotes('')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('https://api.github.com/repos/CrescentR/Quick-Box/releases/latest', { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      if (response.status === 404) { setMessage('仓库暂无可访问的正式发行版。'); return }
      if (!response.ok) throw new Error(`检查失败（HTTP ${response.status}），请稍后重试。`)
      const release = await response.json()
      const tag: string = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : ''
      if (!/^\d+\.\d+\.\d+$/.test(tag)) throw new Error('发行版本号格式不支持，请查看发行页面。')
      const left = tag.split('.').map(Number), right = version.split('.').map(Number)
      const difference = left.map((value, index) => value - right[index]).find((value) => value !== 0) ?? 0
      setMessage(difference > 0 ? `发现新版本 ${tag}，当前版本 ${version}。` : `当前版本 ${version} 已不低于最新正式版本 ${tag}。`)
      setNotes(typeof release.body === 'string' ? release.body.slice(0, 12000) : '')
    } catch (error) { setMessage(error instanceof Error && error.name !== 'AbortError' ? error.message : '连接超时，请稍后重试。') }
    finally { clearTimeout(timer); setBusy(false) }
  }
  return <section className="qb-page-card">
    <h2 className="qb-page-card__title">版本与更新 · {version}</h2>
    <p role="status">{message}</p>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={busy} onClick={() => void check()}>{busy ? '正在检查…' : '检查更新'}</button>
      <button className="qb-tool-button" onClick={() => void invokeCommand('open_release_page').catch(() => setMessage('无法打开浏览器，请访问 github.com/CrescentR/Quick-Box/releases。'))}>打开官方发行页面</button>
    </div>
    {notes && <details><summary>更新说明</summary><pre className="qb-release-notes">{notes}</pre></details>}
    <p>下载安装包前建议导出工作台备份。安装包由系统安装器执行；当前版本不会自动下载或安装更新。</p>
  </section>
}
