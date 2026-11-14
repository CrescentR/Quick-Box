import { useState } from 'react'
import { version } from '../../package.json'
import { invokeCommand } from '../api/tauri-api'
import { useT } from '../i18n'

export default function ReleaseSettings() {
  const tr = useT()
  const [statusMessage, setStatusMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const check = async () => {
    setBusy(true); setNotes('')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('https://api.github.com/repos/CrescentR/Quick-Box/releases/latest', { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      if (response.status === 404) { setStatusMessage(tr('仓库暂无可访问的正式发行版。', 'No published release found on GitHub yet.')); return }
      if (!response.ok) throw new Error(tr(`检查失败（HTTP ${response.status}），请稍后重试。`, `Update check failed (HTTP ${response.status}).`))
      const release = await response.json()
      const tag: string = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : ''
      if (!/^\d+\.\d+\.\d+$/.test(tag)) throw new Error(tr('发行版本号格式不支持，请查看发行页面。', 'Unsupported release tag format. Check the releases page.'))
      const left = tag.split('.').map(Number), right = version.split('.').map(Number)
      const difference = left.map((value, index) => value - right[index]).find((value) => value !== 0) ?? 0
      setStatusMessage(
        difference > 0
          ? tr(`发现新版本 ${tag}，当前版本 ${version}。`, `New version ${tag} available (current: ${version}).`)
          : tr(`当前版本 ${version} 已不低于最新正式版本 ${tag}。`, `Version ${version} is up to date (latest: ${tag}).`),
      )
      setNotes(typeof release.body === 'string' ? release.body.slice(0, 12000) : '')
    } catch (error) {
      setStatusMessage(
        error instanceof Error && error.name !== 'AbortError'
          ? error.message
          : tr('连接超时，请稍后重试。', 'Request timed out. Please try again.'),
      )
    } finally { clearTimeout(timer); setBusy(false) }
  }
  return <section className="qb-page-card">
    <h2 className="qb-page-card__title">{tr(`版本与更新 · ${version}`, `Version & Updates · ${version}`)}</h2>
    <p role="status">{statusMessage || tr('手动检查 GitHub 上的最新正式版本。', 'Manually check GitHub for the latest official release.')}</p>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={busy} onClick={() => void check()}>{busy ? tr('正在检查…', 'Checking…') : tr('检查更新', 'Check for Updates')}</button>
      <button className="qb-tool-button" onClick={() => void invokeCommand('open_release_page').catch(() => setStatusMessage(tr('无法打开浏览器，请访问 github.com/CrescentR/Quick-Box/releases。', 'Could not open browser. Visit github.com/CrescentR/Quick-Box/releases.')))}>{tr('打开官方发行页面', 'Open Releases Page')}</button>
    </div>
    {notes && <details><summary>{tr('更新说明', 'Release Notes')}</summary><pre className="qb-release-notes">{notes}</pre></details>}
    <p>{tr('更新前可复制整个数据目录留档。安装位置由您选择，请确保安装目录和数据目录可写。', 'Copy your data directory before updating. Choose a writable installation and data folder.')}</p>
  </section>
}
