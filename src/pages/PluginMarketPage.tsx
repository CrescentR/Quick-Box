import { useEffect, useMemo } from 'react'
import {
  Download,
  Gem,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle,
} from 'lucide-react'
import type { MarketPluginCategory, MarketPluginItem, MarketPluginPricing } from '../core/plugin-market/plugin-market-types'
import type { AccountSnapshot } from '../core/account/account-types'
import { useAccountStore } from '../stores/account-store'
import { usePluginMarketStore } from '../stores/plugin-market-store'
import { Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

const categoryOptions: Array<{ value: MarketPluginCategory; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'developer-basic', label: '开发者基础包' },
  { value: 'frontend', label: '前端增强包' },
  { value: 'backend', label: '后端增强包' },
  { value: 'devops', label: '运维排查包' },
  { value: 'image', label: '图片处理包' },
  { value: 'ocr', label: 'OCR 识别包' },
  { value: 'ai', label: 'AI 效率包' },
  { value: 'database', label: '数据库工具包' },
  { value: 'pdf', label: 'PDF 工具包' },
]

const pricingOptions: Array<{ value: 'all' | MarketPluginPricing; label: string }> = [
  { value: 'all', label: '全部插件' },
  { value: 'free', label: '免费' },
  { value: 'membership', label: '会员' },
]

const categoryLabels = Object.fromEntries(categoryOptions.map((option) => [option.value, option.label])) as Record<
  MarketPluginCategory,
  string
>

const permissionLabels: Record<string, string> = {
  'clipboard.read': '读取剪贴板',
  'clipboard.write': '写入剪贴板',
  'fs.read': '读文件',
  'fs.write': '写文件',
  'network.request': '网络请求',
  'notification.send': '系统通知',
  'process.manage': '进程管理',
  'storage.read': '读取存储',
  'storage.write': '写入存储',
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`
  if (value >= 1024 * 1024) return `${Math.round(value / 1024 / 1024)}MB`
  if (value >= 1024) return `${Math.round(value / 1024)}KB`
  return `${value}B`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatPermissions(permissions: string[]) {
  if (!permissions.length) return '无额外权限'
  return permissions.map((permission) => permissionLabels[permission] ?? permission).join('、')
}

function hasRequiredEntitlements(plugin: MarketPluginItem, snapshot: AccountSnapshot) {
  if (!plugin.requiredEntitlements.length) return true
  const ownedEntitlements = new Set(snapshot.entitlements.map((entitlement) => entitlement.id))
  return plugin.requiredEntitlements.every((entitlement) => ownedEntitlements.has(entitlement))
}

function getInstallAction(plugin: MarketPluginItem, snapshot: AccountSnapshot) {
  if (snapshot.status !== 'signed-in') {
    return {
      label: '登录后下载',
      enabled: true,
    }
  }
  if (plugin.pricing === 'membership' && !hasRequiredEntitlements(plugin, snapshot)) {
    return {
      label: '需要会员权益',
      enabled: true,
    }
  }
  return {
    label: '等待下载服务',
    enabled: false,
  }
}

interface PluginCardProps {
  plugin: MarketPluginItem
  active: boolean
  onSelect: () => void
}

function PluginCard({ plugin, active, onSelect }: PluginCardProps) {
  return (
    <button className="qb-market-plugin" type="button" data-active={active} onClick={onSelect}>
      <div className="qb-market-plugin__head">
        <div>
          <div className="qb-market-plugin__title">{plugin.name}</div>
          <div className="qb-market-plugin__description">{plugin.description}</div>
        </div>
        <Icon icon={plugin.pricing === 'membership' ? Gem : PackageSearch} tone={plugin.pricing === 'membership' ? 'warning' : 'primary'} />
      </div>
      <div className="qb-page-card__meta">
        <Tag tone="default">{categoryLabels[plugin.category]}</Tag>
        <Tag tone={plugin.pricing === 'membership' ? 'warning' : 'success'}>
          {plugin.pricing === 'membership' ? '会员' : '免费'}
        </Tag>
        <Tag tone={plugin.offline ? 'success' : 'warning'}>{plugin.offline ? '离线可用' : '需要网络'}</Tag>
        {plugin.containsModel ? <Tag tone="warning">包含模型</Tag> : null}
      </div>
      <div className="qb-market-plugin__meta">
        <span>{formatBytes(plugin.sizeBytes)}</span>
        <span>{plugin.author}</span>
        <span>{plugin.version}</span>
      </div>
    </button>
  )
}

function PluginDetail({
  plugin,
  accountSnapshot,
  onOpenAccount,
}: {
  plugin?: MarketPluginItem
  accountSnapshot: AccountSnapshot
  onOpenAccount: () => void
}) {
  if (!plugin) {
    return (
      <section className="qb-page-card qb-market-detail">
        <div className="qb-page-card__title">选择插件</div>
        <div className="qb-page-card__description">从列表中选择插件后查看详情。</div>
      </section>
    )
  }

  const installAction = getInstallAction(plugin, accountSnapshot)

  return (
    <section className="qb-page-card qb-market-detail">
      <div className="qb-page-card__top">
        <div>
          <div className="qb-page-card__title">{plugin.name}</div>
          <div className="qb-page-card__description">{plugin.description}</div>
        </div>
        <Icon icon={ShieldCheck} size={20} tone="primary" />
      </div>

      <div className="qb-page-card__meta">
        <Tag tone="primary">{categoryLabels[plugin.category]}</Tag>
        <Tag tone={plugin.pricing === 'membership' ? 'warning' : 'success'}>
          {plugin.pricing === 'membership' ? '会员权益' : '免费'}
        </Tag>
        <Tag tone={plugin.containsModel ? 'warning' : 'default'}>{plugin.containsModel ? '包含模型' : '无模型'}</Tag>
        <Tag tone={plugin.requiresNetwork ? 'warning' : 'success'}>{plugin.requiresNetwork ? '需要网络' : '本地离线'}</Tag>
      </div>

      <div className="qb-market-detail__grid">
        <div className="qb-page-stat">
          <div className="qb-page-stat__label">安装包</div>
          <div className="qb-page-stat__value">{formatBytes(plugin.sizeBytes)}</div>
        </div>
        <div className="qb-page-stat">
          <div className="qb-page-stat__label">解压后</div>
          <div className="qb-page-stat__value">{formatBytes(plugin.unpackedSizeBytes)}</div>
        </div>
      </div>

      <div className="qb-page-list">
        <div className="qb-page-toggle">
          <div className="qb-page-toggle__copy">
            <div className="qb-page-toggle__title">权限</div>
            <div className="qb-page-toggle__description">{formatPermissions(plugin.permissions)}</div>
          </div>
          <Tag tone="default">{plugin.permissions.length}</Tag>
        </div>
        <div className="qb-page-toggle">
          <div className="qb-page-toggle__copy">
            <div className="qb-page-toggle__title">运行方式</div>
            <div className="qb-page-toggle__description">{plugin.runtime}</div>
          </div>
          <Tag tone="default">{plugin.platforms.join(' / ')}</Tag>
        </div>
        <div className="qb-page-toggle">
          <div className="qb-page-toggle__copy">
            <div className="qb-page-toggle__title">依赖</div>
            <div className="qb-page-toggle__description">{plugin.dependencies.join('、') || '无额外依赖'}</div>
          </div>
          <Tag tone={plugin.requiresConfiguration ? 'warning' : 'success'}>{plugin.requiresConfiguration ? '需配置' : '免配置'}</Tag>
        </div>
        <div className="qb-page-toggle">
          <div className="qb-page-toggle__copy">
            <div className="qb-page-toggle__title">远程包</div>
            <div className="qb-page-toggle__description">{plugin.latestPackage.url}</div>
          </div>
          <Tag tone="default">SHA256</Tag>
        </div>
      </div>

      <div className="qb-market-detail__notes">
        <div>更新：{formatDate(plugin.updatedAt)}</div>
        <div>权益：{plugin.requiredEntitlements.length ? plugin.requiredEntitlements.join('、') : '无'}</div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" disabled={!installAction.enabled} onClick={onOpenAccount}>
          <Download size={15} aria-hidden="true" />
          {installAction.label}
        </button>
        <button className="qb-tool-button" type="button" disabled>
          查看签名
        </button>
      </div>
    </section>
  )
}

export default function PluginMarketPage({ currentPage, onPageChange }: PageNavigationProps) {
  const {
    items,
    selectedPluginId,
    query,
    source,
    refreshedAt,
    status,
    error,
    hydrateMarket,
    refreshMarket,
    setKeyword,
    setCategory,
    setPricing,
    selectPlugin,
  } = usePluginMarketStore()
  const { snapshot: accountSnapshot, hydrateAccount } = useAccountStore()

  useEffect(() => {
    void hydrateMarket()
    void hydrateAccount()
  }, [hydrateAccount, hydrateMarket])

  const selectedPlugin = useMemo(
    () => items.find((item) => item.id === selectedPluginId) ?? items[0],
    [items, selectedPluginId],
  )
  const membershipCount = items.filter((item) => item.pricing === 'membership').length
  const modelCount = items.filter((item) => item.containsModel).length
  const offlineCount = items.filter((item) => item.offline).length

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="平台"
          title="插件市场"
          description="发现、筛选和安装可选能力包。"
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">来源</span>
            <Tag tone={source === 'remote' ? 'success' : 'warning'}>{source === 'remote' ? '远程市场' : 'Mock 远程响应'}</Tag>
            {refreshedAt ? <span className="qb-page-footer__label">刷新：{formatDate(refreshedAt)}</span> : null}
          </div>
          <div className="qb-page-footer__right">
            <KeyboardShortcut keys={['Ctrl', 'K']} />
          </div>
        </div>
      }
    >
      <div className="qb-page-shell">
        <div className="qb-page-body qb-scrollbar">
          <div className="qb-page-stack">
            <div className="qb-market-toolbar">
              <label className="qb-page-field qb-market-search">
                <span className="qb-page-label">搜索插件</span>
                <div className="qb-market-search__input">
                  <Search size={16} aria-hidden="true" />
                  <input
                    className="qb-page-input"
                    value={query.keyword}
                    onChange={(event) => void setKeyword(event.target.value)}
                    placeholder="OCR、PDF、DNS、AI..."
                  />
                </div>
              </label>
              <div className="qb-market-account">
                <Icon icon={UserCircle} tone={accountSnapshot.status === 'signed-in' ? 'success' : 'warning'} />
                <div>
                  <div className="qb-market-account__title">
                    {accountSnapshot.status === 'signed-in' ? accountSnapshot.account?.displayName : '未登录'}
                  </div>
                  <div className="qb-market-account__meta">
                    {accountSnapshot.membership.label} · {accountSnapshot.entitlements.length} 项权益
                  </div>
                </div>
                <button className="qb-tool-button" type="button" onClick={() => onPageChange('account')}>
                  {accountSnapshot.status === 'signed-in' ? '账户' : '登录'}
                </button>
              </div>
              <button className="qb-tool-button" type="button" onClick={() => void refreshMarket()} disabled={status === 'loading'}>
                <RefreshCw size={15} aria-hidden="true" />
                刷新
              </button>
            </div>

            <div className="qb-page-grid qb-page-grid--three">
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">市场插件</div>
                <div className="qb-page-stat__value">{items.length}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">会员插件</div>
                <div className="qb-page-stat__value">{membershipCount}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">离线插件</div>
                <div className="qb-page-stat__value">
                  {offlineCount} / 模型 {modelCount}
                </div>
              </div>
            </div>

            <div className="qb-market-layout">
              <aside className="qb-market-filter">
                <div className="qb-page-card__title">筛选</div>
                <div className="qb-page-list">
                  <label className="qb-page-field">
                    <span className="qb-page-label">分类</span>
                    <select
                      className="qb-page-select"
                      value={query.category}
                      onChange={(event) => void setCategory(event.target.value as MarketPluginCategory)}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="qb-page-field">
                    <span className="qb-page-label">价格</span>
                    <select
                      className="qb-page-select"
                      value={query.pricing}
                      onChange={(event) => void setPricing(event.target.value as 'all' | MarketPluginPricing)}
                    >
                      {pricingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="qb-page-toggle">
                    <div className="qb-page-toggle__copy">
                      <div className="qb-page-toggle__title">安装路径</div>
                      <div className="qb-page-toggle__description">QuickBox app data</div>
                    </div>
                    <Tag tone="success">固定</Tag>
                  </div>
                </div>
              </aside>

              <section className="qb-market-results">
                {status === 'error' ? (
                  <section className="qb-page-card">
                    <div className="qb-page-card__title">市场加载失败</div>
                    <div className="qb-page-card__description">{error}</div>
                  </section>
                ) : null}
                {items.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    active={plugin.id === selectedPlugin?.id}
                    onSelect={() => selectPlugin(plugin.id)}
                  />
                ))}
                {!items.length && status !== 'loading' ? (
                  <section className="qb-page-card">
                    <div className="qb-page-card__title">没有匹配插件</div>
                    <div className="qb-page-card__description">调整搜索词或筛选条件后再试。</div>
                  </section>
                ) : null}
              </section>

              <PluginDetail plugin={selectedPlugin} accountSnapshot={accountSnapshot} onOpenAccount={() => onPageChange('account')} />
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
