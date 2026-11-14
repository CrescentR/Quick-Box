import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, Network, RefreshCw, Skull, Trash2 } from 'lucide-react'
import {
  clearPortUsage,
  killPortOccupants,
  loadPortUsage,
  recordPortUsage,
  scanPortOccupants,
  type PortKillResult,
  type PortOccupant,
  type PortUsage,
} from '../../api/process-api'
import { lt, useLocale, useT } from '../../i18n'
import { Detail, Icon, List, ListItem, Tag, Toast } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

interface CommandErrorShape {
  message?: string
}

const defaultPort = '1420'

interface CommonPort {
  port: string
  label: string
  description: string
  enDescription: string
}

const commonPorts: CommonPort[] = [
  { port: '1420', label: '1420', description: 'Tauri 默认端口', enDescription: 'Tauri default port' },
  { port: '3000', label: '3000', description: 'React / Next.js / Express', enDescription: 'React / Next.js / Express' },
  { port: '3306', label: '3306', description: 'MySQL', enDescription: 'MySQL' },
  { port: '4000', label: '4000', description: 'Jekyll / Gatsby', enDescription: 'Jekyll / Gatsby' },
  { port: '5173', label: '5173', description: 'Vite 开发服务器', enDescription: 'Vite dev server' },
  { port: '5432', label: '5432', description: 'PostgreSQL', enDescription: 'PostgreSQL' },
  { port: '6379', label: '6379', description: 'Redis', enDescription: 'Redis' },
  { port: '8000', label: '8000', description: 'Django / Python HTTP', enDescription: 'Django / Python HTTP' },
  { port: '8080', label: '8080', description: 'HTTP 备用 / Tomcat', enDescription: 'HTTP Alt / Tomcat' },
  { port: '8888', label: '8888', description: 'Jupyter Notebook', enDescription: 'Jupyter Notebook' },
  { port: '9090', label: '9090', description: 'Prometheus', enDescription: 'Prometheus' },
  { port: '27017', label: '27017', description: 'MongoDB', enDescription: 'MongoDB' },
]

function parsePortInput(value: string, locale: 'zh-CN' | 'en-US') {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false as const, message: lt('端口号只能包含数字', 'Port must contain only digits', locale) }
  }

  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false as const, message: lt('端口号必须在 1 到 65535 之间', 'Port must be between 1 and 65535', locale) }
  }

  return { ok: true as const, port }
}

function getErrorMessage(error: unknown, locale: 'zh-CN' | 'en-US') {
  const fallback = lt('操作失败', 'Operation failed', locale)
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as CommandErrorShape).message ?? fallback)
  }

  return error instanceof Error ? error.message : fallback
}

function formatOccupantSubtitle(item: PortOccupant) {
  const stateText = item.state ? ` · ${item.state}` : ''
  return `${item.protocol} ${item.localAddress}${stateText}`
}

function formatRelativeTime(isoString: string, locale: 'zh-CN' | 'en-US') {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return lt('刚刚', 'Just now', locale)
  if (minutes < 60) return lt(`${minutes} 分钟前`, `${minutes}m ago`, locale)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return lt(`${hours} 小时前`, `${hours}h ago`, locale)
  const days = Math.floor(hours / 24)
  if (days < 30) return lt(`${days} 天前`, `${days}d ago`, locale)
  return new Date(isoString).toLocaleDateString(locale)
}

export default function PortKillerToolView() {
  const tr = useT()
  const locale = useLocale()
  const [portInput, setPortInput] = useState(defaultPort)
  const [occupants, setOccupants] = useState<PortOccupant[]>([])
  const [scanning, setScanning] = useState(false)
  const [killing, setKilling] = useState(false)
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [lastKillResult, setLastKillResult] = useState<PortKillResult | null>(null)
  const [portUsage, setPortUsage] = useState<PortUsage[]>([])
  const [toast, setToast] = useState<{
    tone: 'success' | 'danger' | 'warning'
    title: string
    description?: string
  } | null>(null)

  const parsedPort = useMemo(() => parsePortInput(portInput, locale), [locale, portInput])
  const portLabel = parsedPort.ok ? String(parsedPort.port) : portInput.trim() || '--'

  useEffect(() => {
    let cancelled = false
    loadPortUsage()
      .then((items) => {
        if (!cancelled) setPortUsage(items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleScan = useCallback(async () => {
    if (!parsedPort.ok) {
      setToast({ tone: 'danger', title: tr('端口无效', 'Invalid port'), description: parsedPort.message })
      return
    }

    if (scanning) {
      return
    }

    setScanning(true)
    setLastKillResult(null)

    try {
      const nextOccupants = await scanPortOccupants(parsedPort.port)
      setOccupants(nextOccupants)
      setSelectedPid(nextOccupants[0]?.pid ?? null)
      setToast({
        tone: nextOccupants.length > 0 ? 'warning' : 'success',
        title:
          nextOccupants.length > 0
            ? tr(`发现 ${nextOccupants.length} 个占用进程`, `Found ${nextOccupants.length} occupying process(es)`)
            : tr('端口未被占用', 'Port is free'),
        description:
          nextOccupants.length > 0
            ? tr(`端口 ${parsedPort.port} 当前有进程监听或绑定`, `Port ${parsedPort.port} currently has listening or bound processes`)
            : tr(`端口 ${parsedPort.port} 可以正常使用`, `Port ${parsedPort.port} is available`),
      })

      recordPortUsage(parsedPort.port, false)
        .then(setPortUsage)
        .catch(() => {})
    } catch (error) {
      setOccupants([])
      setSelectedPid(null)
      setToast({ tone: 'danger', title: tr('扫描失败', 'Scan failed'), description: getErrorMessage(error, locale) })
    } finally {
      setScanning(false)
    }
  }, [locale, parsedPort, scanning, tr])

  const handleKill = useCallback(
    async (pids?: number[]) => {
      if (!parsedPort.ok) {
        setToast({ tone: 'danger', title: tr('端口无效', 'Invalid port'), description: parsedPort.message })
        return
      }

      setKilling(true)

      try {
        const result = await killPortOccupants(parsedPort.port, pids)
        setLastKillResult(result)

        if (result.killedPids.length > 0) {
          setToast({
            tone: 'success',
            title: tr(`已终止 ${result.killedPids.length} 个进程`, `Terminated ${result.killedPids.length} process(es)`),
            description: result.killedPids.map((pid) => `PID ${pid}`).join(locale === 'en-US' ? ', ' : '、'),
          })
        } else if (result.failedPids.length > 0) {
          setToast({
            tone: 'danger',
            title: tr('未能终止进程', 'Failed to terminate processes'),
            description: result.failedPids.map((item) => `PID ${item.pid}: ${item.message}`).join('\n'),
          })
        } else {
          setToast({
            tone: 'success',
            title: tr('没有需要终止的进程', 'No processes to terminate'),
            description: tr(`端口 ${parsedPort.port} 当前空闲`, `Port ${parsedPort.port} is currently idle`),
          })
        }

        const refreshed = await scanPortOccupants(parsedPort.port)
        setOccupants(refreshed)
        setSelectedPid(refreshed[0]?.pid ?? null)

        recordPortUsage(parsedPort.port, true)
          .then(setPortUsage)
          .catch(() => {})
      } catch (error) {
        setToast({ tone: 'danger', title: tr('终止失败', 'Terminate failed'), description: getErrorMessage(error, locale) })
      } finally {
        setKilling(false)
      }
    },
    [locale, parsedPort, tr],
  )

  const handleClearUsage = useCallback(() => {
    clearPortUsage()
      .then(() => {
        setPortUsage([])
        setToast({ tone: 'success', title: tr('已清除记忆端口', 'Cleared remembered ports') })
      })
      .catch((error) => {
        setToast({ tone: 'danger', title: tr('清除失败', 'Clear failed'), description: getErrorMessage(error, locale) })
      })
  }, [locale, tr])

  return (
    <ToolShell
      title={tr('端口占用清理', 'Port Killer')}
      description={tr(
        '输入端口号后扫描占用进程，并一键终止监听进程，快速解决本地开发中的 EADDRINUSE 问题。',
        'Scan processes occupying a port and terminate listeners in one click to resolve local EADDRINUSE conflicts.',
      )}
      badge={tr('系统能力', 'System')}
      badgeTone="warning"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('端口号', 'Port')}</span>
          <input
            id="port-killer-input"
            name="port-killer-input"
            className="qb-tool-input qb-mono"
            inputMode="numeric"
            placeholder={tr('例如 1420、3000、5173，也可点击下方常用端口', 'e.g. 1420, 3000, 5173, or pick a preset below')}
            value={portInput}
            onChange={(event) => setPortInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('当前状态', 'Status')}</span>
          <div className="qb-tool-options">
            <Tag tone={occupants.length > 0 ? 'warning' : 'success'}>
              {scanning
                ? tr('扫描中', 'Scanning')
                : occupants.length > 0
                  ? tr(`${occupants.length} 个占用`, `${occupants.length} occupied`)
                  : tr('未扫描或空闲', 'Unscanned or free')}
            </Tag>
            <Tag tone="default">{tr(`端口 ${portLabel}`, `Port ${portLabel}`)}</Tag>
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('常用端口', 'Common ports')}</span>
          <div className="qb-tool-chips">
            {commonPorts.map((item) => {
              const desc = locale === 'en-US' ? item.enDescription : item.description
              return (
                <button
                  key={item.port}
                  className={
                    portInput.trim() === item.port
                      ? 'qb-tool-chip qb-tool-chip--active'
                      : 'qb-tool-chip'
                  }
                  type="button"
                  title={desc}
                  onClick={() => setPortInput(item.port)}
                >
                  <span className="qb-tool-chip__port qb-mono">{item.label}</span>
                  <span className="qb-tool-chip__desc">{desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <div className="qb-tool-section-head">
            <span className="qb-tool-label">{tr('记忆端口', 'Recent ports')}</span>
            {portUsage.length > 0 ? (
              <button
                className="qb-tool-link-button"
                type="button"
                onClick={handleClearUsage}
                title={tr('清除所有记忆端口记录', 'Clear all remembered ports')}
              >
                <Icon icon={Trash2} size={12} />
                {tr('清除记忆', 'Clear history')}
              </button>
            ) : null}
          </div>
          {portUsage.length > 0 ? (
            <div className="qb-tool-chips">
              {portUsage.map((item) => (
                <button
                  key={item.port}
                  className={
                    portInput.trim() === String(item.port)
                      ? 'qb-tool-chip qb-tool-chip--active'
                      : 'qb-tool-chip'
                  }
                  type="button"
                  title={tr(
                    `使用 ${item.useCount} 次 · 终止 ${item.killCount} 次 · ${formatRelativeTime(item.lastUsedAt, locale)}`,
                    `Used ${item.useCount}x · Killed ${item.killCount}x · ${formatRelativeTime(item.lastUsedAt, locale)}`,
                  )}
                  onClick={() => setPortInput(String(item.port))}
                >
                  <Icon icon={Clock} size={12} />
                  <span className="qb-tool-chip__port qb-mono">{item.port}</span>
                  <span className="qb-tool-chip__desc">
                    {tr(`${item.useCount} 次`, `${item.useCount}x`)}
                    {item.killCount > 0 ? tr(` · 终止 ${item.killCount}`, ` · ${item.killCount} killed`) : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="qb-tool-options">
              <span className="qb-tool-hint">
                {tr(
                  '暂无记忆端口。扫描或终止端口后会自动记录到这里，方便下次快速选择。',
                  'No recent ports yet. Scanned or terminated ports are recorded here automatically.',
                )}
              </span>
            </div>
          )}
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('占用进程', 'Occupying processes')}</span>
          <List
            isLoading={scanning}
            loadingRows={3}
            emptyState={<div className="qb-tool-options">{tr('暂无占用记录，输入端口后点击扫描。', 'No records yet. Enter a port and click Scan.')}</div>}
          >
            {occupants.map((item) => (
              <ListItem
                key={`${item.pid}-${item.localAddress}-${item.protocol}`}
                id={String(item.pid)}
                selected={selectedPid === item.pid}
                icon={<Icon icon={Network} size={16} tone="muted" />}
                title={`${item.processName} · PID ${item.pid}`}
                subtitle={formatOccupantSubtitle(item)}
                accessory={<Tag tone="default">{item.protocol}</Tag>}
                onClick={(id) => setSelectedPid(Number(id))}
              />
            ))}
          </List>
        </div>

        {lastKillResult ? (
          <div className="qb-tool-field qb-tool-field--full">
            <span className="qb-tool-label">{tr('最近操作结果', 'Last result')}</span>
            <div className="qb-tool-options">
              {lastKillResult.killedPids.length > 0 ? (
                <Tag tone="success">{tr(`已终止：${lastKillResult.killedPids.join(', ')}`, `Terminated: ${lastKillResult.killedPids.join(', ')}`)}</Tag>
              ) : null}
              {lastKillResult.failedPids.map((item) => (
                <Tag key={item.pid} tone="danger">
                  PID {item.pid}: {item.message}
                </Tag>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          disabled={scanning || killing}
          onClick={() => void handleScan()}
        >
          <Icon icon={RefreshCw} size={14} />
          {tr('扫描端口', 'Scan port')}
        </button>
        <button
          className="qb-tool-button"
          type="button"
          disabled={scanning || killing || occupants.length === 0}
          onClick={() => void handleKill()}
        >
          <Icon icon={Skull} size={14} />
          {tr('终止全部', 'Terminate all')}
        </button>
        <button
          className="qb-tool-button"
          type="button"
          disabled={scanning || killing || selectedPid === null}
          onClick={() => void handleKill(selectedPid ? [selectedPid] : undefined)}
        >
          {tr('终止选中进程', 'Terminate selected')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          `- **常用端口**：内置的开发与数据库服务端口，点击即可快速填入。\n- **记忆端口**：自动记录你扫描或终止过的端口，按使用频率排序，方便下次快速选择。点击"清除记忆"可重置。\n- Windows 使用系统 API 查询端口与终止进程，不会弹出 PowerShell / CMD 窗口。\n- macOS / Linux 使用 \`lsof\` 扫描、\`kill -9\` 终止进程。\n- 系统关键进程（如 PID 0-4）不会被终止。\n- 终止后建议重新扫描，确认端口已释放。`,
          `- **Common ports**: Built-in presets for dev and database services; click to fill.\n- **Recent ports**: Automatically records scanned or killed ports sorted by usage; click "Clear history" to reset.\n- On Windows, native system APIs inspect and terminate processes without flashing PowerShell/CMD windows.\n- On macOS/Linux, uses \`lsof\` to scan and \`kill -9\` to terminate.\n- Critical system processes (e.g. PID 0-4) are protected.\n- Re-scan after terminating to confirm the port is free.`,
        )}
        metadata={[
          { label: tr('典型场景', 'Use case'), value: tr('Vite / Node / Docker 端口冲突', 'Vite / Node / Docker port conflicts') },
          { label: tr('权限', 'Permission'), value: 'process.manage' },
          { label: tr('建议', 'Tip'), value: tr('先扫描，再终止选中或全部', 'Scan first, then kill selected or all') },
        ]}
      />

      {toast ? (
        <Toast
          tone={toast.tone}
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ToolShell>
  )
}
