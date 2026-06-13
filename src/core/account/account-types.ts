export type AccountStatus = 'signed-out' | 'signed-in' | 'expired' | 'error'
export type MembershipStatus = 'none' | 'active' | 'expiring' | 'expired' | 'unknown'

export interface QuickBoxAccount {
  userId: string
  displayName: string
  email: string
}

export interface AccountMembership {
  status: MembershipStatus
  label: string
  expiresAt?: string
}

export interface AccountEntitlement {
  id: string
  label: string
  expiresAt?: string
}

export interface AccountSnapshot {
  status: AccountStatus
  account?: QuickBoxAccount
  membership: AccountMembership
  entitlements: AccountEntitlement[]
  updatedAt?: string
}
