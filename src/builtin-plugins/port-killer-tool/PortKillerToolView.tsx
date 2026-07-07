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
import { Detail, Icon, List, ListItem, Tag, Toast } from '../../ui'

interface CommandErrorShape {
  message?: string
}

const defaultPort = '1420'

interface CommonPort {
  port: string
  label: string
  description: string
}

const commonPorts: CommonPort[] = [
  { port: '1420', label: '1420', description: 'Tauri 默认端口' },
  { port: '3000', label: '3000', description: 'React / Next.js / Express' },
  { port: '3306', label: '3306', description: 'MySQL' },
  { port: '4000', label: '4000', description: 'Jekyll / Gatsby' },
  { port: '5173', label: '5173', description: 'Vite 开发服务器' },
  { port: '5432', label: '5432', description: 'PostgreSQL' },
  { port: '6379', label: '6379', description: 'Redis' },
  { port: '8000', label: '8000', description: 'Django / Python HTTP' },
  { port: '8080', label: '8080', description: 'HTTP 备用 / Tomcat' },
  { port: '8888', label: '8888', description: 'Jupyter Notebook' },
  { port: '9090', label: '9090', description: 'Prometheus' },
  { port: '27017', label: '27017', description: 'MongoDB' },
]

function parsePortInput(value: string) {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false as const, message: '端口号只能包含数字' }
  }

  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false as const, message: '端口号必须在 1 到 65535 之间' }
  }

  return { ok: true as const, port }
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as CommandErrorShape).message ?? '操作失败')
  }

  return error instanceof Error ? error.message : '操作失败'
}

function formatOccupantSubtitle(item: PortOccupant) {
  const stateText = item.state ? ` · ${item.state}` : ''
  return `${item.protocol} ${item.localAddress}${stateText}`
}

function formatRelativeTime(isoString: string) {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(isoString).toLocaleDateString()
}

export default function PortKillerToolView() {
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

  const parsedPort = useMemo(() => parsePortInput(portInput), [portInput])
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
      setToast({ tone: 'danger', title: '端口无效', description: parsedPort.message })
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
        title: nextOccupants.length > 0 ? `发现 ${nextOccupants.length} 个占用进程` : '端口未被占用',
        description:
          nextOccupants.length > 0
            ? `端口 ${parsedPort.port} 当前有进程监听或绑定`
            : `端口 ${parsedPort.port} 可以正常使用`,
      })

      recordPortUsage(parsedPort.port, false)
        .then(setPortUsage)
        .catch(() => {})
    } catch (error) {
      setOccupants([])
      setSelectedPid(null)
      setToast({ tone: 'danger', title: '扫描失败', description: getErrorMessage(error) })
    } finally {
      setScanning(false)
    }
  }, [parsedPort, scanning])

  const handleKill = useCallback(
    async (pids?: number[]) => {
      if (!parsedPort.ok) {
        setToast({ tone: 'danger', title: '端口无效', description: parsedPort.message })
        return
      }

      setKilling(true)

      try {
        const result = await killPortOccupants(parsedPort.port, pids)
        setLastKillResult(result)

        if (result.killedPids.length > 0) {
          setToast({
            tone: 'success',
            title: `已终止 ${result.killedPids.length} 个进程`,
            description: result.killedPids.map((pid) => `PID ${pid}`).join('、'),
          })
        } else if (result.failedPids.length > 0) {
          setToast({
            tone: 'danger',
            title: '未能终止进程',
            description: result.failedPids.map((item) => `PID ${item.pid}: ${item.message}`).join('\n'),
          })
        } else {
          setToast({
            tone: 'success',
            title: '没有需要终止的进程',
            description: `端口 ${parsedPort.port} 当前空闲`,
          })
        }

        const refreshed = await scanPortOccupants(parsedPort.port)
        setOccupants(refreshed)
        setSelectedPid(refreshed[0]?.pid ?? null)

        recordPortUsage(parsedPort.port, true)
          .then(setPortUsage)
          .catch(() => {})
      } catch (error) {
        setToast({ tone: 'danger', title: '终止失败', description: getErrorMessage(error) })
      } finally {
        setKilling(false)
      }
    },
    [parsedPort],
  )

  const handleClearUsage = useCallback(() => {
    clearPortUsage()
      .then(() => {
        setPortUsage([])
        setToast({ tone: 'success', title: '已清除记忆端口' })
      })
      .catch((error) => {
        setToast({ tone: 'danger', title: '清除失败', description: getErrorMessage(error) })
      })
  }, [])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">端口占用清理</div>
          <div className="qb-tool-view__description">
            输入端口号后扫描占用进程，并一键终止监听进程，快速解决本地开发中的 EADDRINUSE 问题。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="warning">系统能力</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">端口号</span>
          <input
            id="port-killer-input"
            name="port-killer-input"
            className="qb-tool-input qb-mono"
            inputMode="numeric"
            placeholder="例如 1420、3000、5173，也可点击下方常用端口"
            value={portInput}
            onChange={(event) => setPortInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">当前状态</span>
          <div className="qb-tool-options">
            <Tag tone={occupants.length > 0 ? 'warning' : 'success'}>
              {scanning ? '扫描中' : occupants.length > 0 ? `${occupants.length} 个占用` : '未扫描或空闲'}
            </Tag>
            <Tag tone="default">端口 {portLabel}</Tag>
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">常用端口</span>
          <div className="qb-tool-chips">
            {commonPorts.map((item) => (
              <button
                key={item.port}
                className={
                  portInput.trim() === item.port
                    ? 'qb-tool-chip qb-tool-chip--active'
                    : 'qb-tool-chip'
                }
                type="button"
                title={item.description}
                onClick={() => setPortInput(item.port)}
              >
                <span className="qb-tool-chip__port qb-mono">{item.label}</span>
                <span className="qb-tool-chip__desc">{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <div className="qb-tool-section-head">
            <span className="qb-tool-label">记忆端口</span>
            {portUsage.length > 0 ? (
              <button
                className="qb-tool-link-button"
                type="button"
                onClick={handleClearUsage}
                title="清除所有记忆端口记录"
              >
                <Icon icon={Trash2} size={12} />
                清除记忆
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
                  title={`使用 ${item.useCount} 次 · 终止 ${item.killCount} 次 · ${formatRelativeTime(item.lastUsedAt)}`}
                  onClick={() => setPortInput(String(item.port))}
                >
                  <Icon icon={Clock} size={12} />
                  <span className="qb-tool-chip__port qb-mono">{item.port}</span>
                  <span className="qb-tool-chip__desc">
                    {item.useCount} 次{item.killCount > 0 ? ` · 终止 ${item.killCount}` : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="qb-tool-options">
              <span className="qb-tool-hint">暂无记忆端口。扫描或终止端口后会自动记录到这里，方便下次快速选择。</span>
            </div>
          )}
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">占用进程</span>
          <List
            isLoading={scanning}
            loadingRows={3}
            emptyState={<div className="qb-tool-options">暂无占用记录，输入端口后点击扫描。</div>}
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
            <span className="qb-tool-label">最近操作结果</span>
            <div className="qb-tool-options">
              {lastKillResult.killedPids.length > 0 ? (
                <Tag tone="success">已终止：{lastKillResult.killedPids.join(', ')}</Tag>
              ) : null}
              {lastKillResult.failedPids.map((item) => (
                <Tag key={item.pid} tone="danger">
                  PID {item.pid}：{item.message}
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
          扫描端口
        </button>
        <button
          className="qb-tool-button"
          type="button"
          disabled={scanning || killing || occupants.length === 0}
          onClick={() => void handleKill()}
        >
          <Icon icon={Skull} size={14} />
          终止全部
        </button>
        <button
          className="qb-tool-button"
          type="button"
          disabled={scanning || killing || selectedPid === null}
          onClick={() => void handleKill(selectedPid ? [selectedPid] : undefined)}
        >
          终止选中进程
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown={`- **常用端口**：内置的开发与数据库服务端口，点击即可快速填入。\n- **记忆端口**：自动记录你扫描或终止过的端口，按使用频率排序，方便下次快速选择。点击"清除记忆"可重置。\n- Windows 使用系统 API 查询端口与终止进程，不会弹出 PowerShell / CMD 窗口。\n- macOS / Linux 使用 \`lsof\` 扫描、\`kill -9\` 终止进程。\n- 系统关键进程（如 PID 0-4）不会被终止。\n- 终止后建议重新扫描，确认端口已释放。`}
        metadata={[
          { label: '典型场景', value: 'Vite / Node / Docker 端口冲突' },
          { label: '权限', value: 'process.manage' },
          { label: '建议', value: '先扫描，再终止选中或全部' },
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
    </section>
  )
}
