import type { AccountSnapshot } from '../core/account/account-types'

const accountSnapshotStorageKey = 'quickbox.preview.accountSnapshot'
const accountTokenStorageKey = 'quickbox.preview.accountToken'
const marketEndpointStorageKey = 'quickbox.market.endpoint'
const requestTimeoutMs = 6000

const signedOutSnapshot: AccountSnapshot = {
  status: 'signed-out',
  membership: {
    status: 'none',
    label: '未登录',
  },
  entitlements: [],
}

const mockMemberSnapshot: AccountSnapshot = {
  status: 'signed-in',
  account: {
    userId: 'mock-member',
    displayName: 'QuickBox Member',
    email: 'member@quickbox.local',
  },
  membership: {
    status: 'active',
    label: '会员有效',
    expiresAt: '2027-06-14T00:00:00Z',
  },
  entitlements: [
    { id: 'plugin.ocr.rapidocr', label: 'OCR 图片转文字' },
    { id: 'plugin.pdf.toolbox', label: 'PDF 工具箱' },
    { id: 'plugin.ai.commit-helper', label: 'Git Commit AI 助手' },
    { id: 'market.download.member', label: '会员插件下载' },
  ],
  updatedAt: new Date().toISOString(),
}

const mockFreeSnapshot: AccountSnapshot = {
  status: 'signed-in',
  account: {
    userId: 'mock-free',
    displayName: 'QuickBox Free',
    email: 'free@quickbox.local',
  },
  membership: {
    status: 'none',
    label: '非会员',
  },
  entitlements: [],
  updatedAt: new Date().toISOString(),
}

function getMarketEndpoint() {
  const storedEndpoint = window.localStorage.getItem(marketEndpointStorageKey)?.trim()
  if (storedEndpoint) return storedEndpoint.replace(/\/$/, '')

  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  const envEndpoint = meta.env?.VITE_QUICKBOX_MARKET_URL
  return envEndpoint?.trim().replace(/\/$/, '') || ''
}

function readStoredSnapshot() {
  try {
    const value = window.localStorage.getItem(accountSnapshotStorageKey)
    return value ? (JSON.parse(value) as AccountSnapshot) : signedOutSnapshot
  } catch {
    return signedOutSnapshot
  }
}

function writeStoredSnapshot(snapshot: AccountSnapshot) {
  window.localStorage.setItem(
    accountSnapshotStorageKey,
    JSON.stringify({
      ...snapshot,
      updatedAt: new Date().toISOString(),
    }),
  )
}

async function fetchWithTimeout(url: string, token: string) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function loadAccountSnapshot(): Promise<AccountSnapshot> {
  const endpoint = getMarketEndpoint()
  const token = window.localStorage.getItem(accountTokenStorageKey)

  if (!endpoint || !token) {
    return readStoredSnapshot()
  }

  const [accountResponse, entitlementResponse] = await Promise.all([
    fetchWithTimeout(`${endpoint}/api/account/me`, token),
    fetchWithTimeout(`${endpoint}/api/account/entitlements`, token),
  ])

  if (accountResponse.status === 401 || entitlementResponse.status === 401) {
    return {
      ...signedOutSnapshot,
      status: 'expired',
      membership: {
        status: 'expired',
        label: '登录已过期',
      },
      updatedAt: new Date().toISOString(),
    }
  }

  if (!accountResponse.ok) throw new Error(`账户接口返回 ${accountResponse.status}`)
  if (!entitlementResponse.ok) throw new Error(`权益接口返回 ${entitlementResponse.status}`)

  const accountPayload = (await accountResponse.json()) as Pick<AccountSnapshot, 'account' | 'membership'>
  const entitlementPayload = (await entitlementResponse.json()) as Pick<AccountSnapshot, 'entitlements'>
  const snapshot: AccountSnapshot = {
    status: 'signed-in',
    account: accountPayload.account,
    membership: accountPayload.membership,
    entitlements: entitlementPayload.entitlements ?? [],
    updatedAt: new Date().toISOString(),
  }
  writeStoredSnapshot(snapshot)
  return snapshot
}

export async function signInWithPreviewAccount(kind: 'member' | 'free') {
  const snapshot = kind === 'member' ? mockMemberSnapshot : mockFreeSnapshot
  writeStoredSnapshot(snapshot)
  window.localStorage.setItem(accountTokenStorageKey, `preview-${kind}-token`)
  return loadAccountSnapshot()
}

export async function signOutAccount() {
  window.localStorage.removeItem(accountTokenStorageKey)
  writeStoredSnapshot(signedOutSnapshot)
  return signedOutSnapshot
}
