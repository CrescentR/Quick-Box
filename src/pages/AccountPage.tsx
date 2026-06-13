import { useEffect } from 'react'
import { BadgeCheck, LogOut, RefreshCw, UserCircle } from 'lucide-react'
import type { AccountEntitlement, AccountSnapshot } from '../core/account/account-types'
import { useAccountStore } from '../stores/account-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

function formatDateTime(value?: string) {
  if (!value) return '未同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function getAccountTitle(snapshot: AccountSnapshot) {
  if (snapshot.status === 'signed-in') return snapshot.account?.displayName ?? '已登录用户'
  if (snapshot.status === 'expired') return '登录已过期'
  return '未登录'
}

function getAccountDescription(snapshot: AccountSnapshot) {
  if (snapshot.status === 'signed-in') return snapshot.account?.email ?? snapshot.account?.userId ?? '账户信息已同步'
  if (snapshot.status === 'expired') return '请重新登录以刷新会员权益和下载权限。'
  return '登录后可以下载远程插件，并查看会员权益。'
}

function EntitlementRow({ entitlement }: { entitlement: AccountEntitlement }) {
  return (
    <div className="qb-page-toggle">
      <div className="qb-page-toggle__copy">
        <div className="qb-page-toggle__title">{entitlement.label}</div>
        <div className="qb-page-toggle__description">{entitlement.id}</div>
      </div>
      <Tag tone={entitlement.expiresAt ? 'warning' : 'success'}>
        {entitlement.expiresAt ? formatDateTime(entitlement.expiresAt) : '可用'}
      </Tag>
    </div>
  )
}

export default function AccountPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { snapshot, loadStatus, error, hydrateAccount, refreshAccount, signInPreview, signOut } = useAccountStore()

  useEffect(() => {
    void hydrateAccount()
  }, [hydrateAccount])

  const signedIn = snapshot.status === 'signed-in'
  const membershipTone = snapshot.membership.status === 'active' ? 'success' : snapshot.membership.status === 'expired' ? 'danger' : 'warning'

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="账户"
          title="用户与会员"
          description="管理远程插件市场需要的登录状态、会员状态和下载权益。"
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">状态</span>
            <Tag tone={loadStatus === 'error' ? 'danger' : loadStatus === 'loading' ? 'warning' : signedIn ? 'success' : 'default'}>
              {loadStatus === 'loading' ? '同步中' : signedIn ? '已登录' : '未登录'}
            </Tag>
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
            <div className="qb-page-grid qb-page-grid--three">
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">登录</div>
                <div className="qb-page-stat__value">{signedIn ? '已登录' : snapshot.status === 'expired' ? '已过期' : '未登录'}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">会员</div>
                <div className="qb-page-stat__value">{snapshot.membership.label}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">权益</div>
                <div className="qb-page-stat__value">{snapshot.entitlements.length}</div>
              </div>
            </div>

            <div className="qb-page-grid">
              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">{getAccountTitle(snapshot)}</div>
                    <div className="qb-page-card__description">{getAccountDescription(snapshot)}</div>
                  </div>
                  <Icon icon={UserCircle} size={20} tone={signedIn ? 'success' : 'warning'} />
                </div>

                <div className="qb-page-card__meta">
                  <Tag tone={signedIn ? 'success' : 'default'}>{snapshot.status}</Tag>
                  <Tag tone={membershipTone}>{snapshot.membership.label}</Tag>
                  <Tag tone="default">更新 {formatDateTime(snapshot.updatedAt)}</Tag>
                </div>

                <div className="qb-tool-actions">
                  <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void signInPreview('member')} disabled={loadStatus === 'loading'}>
                    预览会员登录
                  </button>
                  <button className="qb-tool-button" type="button" onClick={() => void signInPreview('free')} disabled={loadStatus === 'loading'}>
                    预览免费登录
                  </button>
                  <button className="qb-tool-button" type="button" onClick={() => void refreshAccount()} disabled={loadStatus === 'loading'}>
                    <RefreshCw size={15} aria-hidden="true" />
                    刷新状态
                  </button>
                  <button className="qb-tool-button" type="button" onClick={() => void signOut()} disabled={!signedIn || loadStatus === 'loading'}>
                    <LogOut size={15} aria-hidden="true" />
                    退出登录
                  </button>
                </div>
              </section>

              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">会员权益</div>
                    <div className="qb-page-card__description">
                      插件市场会根据权益判断会员插件是否可下载。
                    </div>
                  </div>
                  <Icon icon={BadgeCheck} size={20} tone="primary" />
                </div>

                <div className="qb-page-list">
                  {snapshot.entitlements.length ? (
                    snapshot.entitlements.map((entitlement) => <EntitlementRow key={entitlement.id} entitlement={entitlement} />)
                  ) : (
                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">暂无权益</div>
                        <div className="qb-page-toggle__description">登录会员账号后，这里会显示可用插件权益。</div>
                      </div>
                      <Tag tone="default">0</Tag>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <Detail
              title="账户说明"
              markdown="- 当前阶段是账户状态骨架，预览登录用于验证插件市场的会员权益联动。\n- 真实登录方式、Token 存储策略和支付闭环还需要后续确认。\n- 内置工具不需要登录；登录只影响远程插件下载、会员插件和未来云能力。"
              metadata={[
                { label: '接口形状', value: '/api/account/me + /api/account/entitlements' },
                { label: '同步状态', value: loadStatus },
                ...(error ? [{ label: '错误', value: error }] : []),
              ]}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
