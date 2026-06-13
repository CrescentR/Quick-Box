import { create } from 'zustand'
import { loadAccountSnapshot, signInWithPreviewAccount, signOutAccount } from '../api/account-api'
import type { AccountSnapshot } from '../core/account/account-types'

type AccountLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AccountState {
  snapshot: AccountSnapshot
  loadStatus: AccountLoadStatus
  error?: string
  hydrateAccount: () => Promise<void>
  refreshAccount: () => Promise<void>
  signInPreview: (kind: 'member' | 'free') => Promise<void>
  signOut: () => Promise<void>
  hasEntitlement: (entitlementId: string) => boolean
}

const signedOutSnapshot: AccountSnapshot = {
  status: 'signed-out',
  membership: {
    status: 'none',
    label: '未登录',
  },
  entitlements: [],
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export const useAccountStore = create<AccountState>((set, get) => ({
  snapshot: signedOutSnapshot,
  loadStatus: 'idle',
  error: undefined,
  hydrateAccount: async () => {
    if (get().loadStatus === 'loading') return
    await get().refreshAccount()
  },
  refreshAccount: async () => {
    set({ loadStatus: 'loading', error: undefined })
    try {
      const snapshot = await loadAccountSnapshot()
      set({ snapshot, loadStatus: 'ready', error: undefined })
    } catch (error) {
      set({ loadStatus: 'error', error: getErrorMessage(error) })
    }
  },
  signInPreview: async (kind) => {
    set({ loadStatus: 'loading', error: undefined })
    try {
      const snapshot = await signInWithPreviewAccount(kind)
      set({ snapshot, loadStatus: 'ready', error: undefined })
    } catch (error) {
      set({ loadStatus: 'error', error: getErrorMessage(error) })
    }
  },
  signOut: async () => {
    set({ loadStatus: 'loading', error: undefined })
    try {
      const snapshot = await signOutAccount()
      set({ snapshot, loadStatus: 'ready', error: undefined })
    } catch (error) {
      set({ loadStatus: 'error', error: getErrorMessage(error) })
    }
  },
  hasEntitlement: (entitlementId) => get().snapshot.entitlements.some((entitlement) => entitlement.id === entitlementId),
}))
