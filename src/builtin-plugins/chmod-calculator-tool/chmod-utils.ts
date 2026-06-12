export type ChmodSubject = 'owner' | 'group' | 'other'
export type ChmodBit = 'read' | 'write' | 'execute'

export interface ChmodTriplet {
  read: boolean
  write: boolean
  execute: boolean
}

export interface ChmodPermissions {
  owner: ChmodTriplet
  group: ChmodTriplet
  other: ChmodTriplet
}

export const chmodPresets: Array<{ label: string; mode: string; description: string }> = [
  { label: '755', mode: '755', description: '目录 / 可执行文件' },
  { label: '644', mode: '644', description: '普通文件' },
  { label: '600', mode: '600', description: '仅所有者可读写' },
  { label: '777', mode: '777', description: '全部权限（慎用）' },
  { label: '700', mode: '700', description: '仅所有者可读写执行' },
  { label: '664', mode: '664', description: '组内可写' },
]

const defaultPermissions: ChmodPermissions = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
}

function tripletToDigit(triplet: ChmodTriplet) {
  return (triplet.read ? 4 : 0) + (triplet.write ? 2 : 0) + (triplet.execute ? 1 : 0)
}

function digitToTriplet(digit: number): ChmodTriplet {
  return {
    read: digit >= 4,
    write: digit === 2 || digit === 3 || digit === 6 || digit === 7,
    execute: digit % 2 === 1,
  }
}

function tripletToSymbolic(triplet: ChmodTriplet) {
  return `${triplet.read ? 'r' : '-'}${triplet.write ? 'w' : '-'}${triplet.execute ? 'x' : '-'}`
}

export function createDefaultPermissions() {
  return {
    owner: { ...defaultPermissions.owner },
    group: { ...defaultPermissions.group },
    other: { ...defaultPermissions.other },
  }
}

export function permissionsToOctal(permissions: ChmodPermissions) {
  return `${tripletToDigit(permissions.owner)}${tripletToDigit(permissions.group)}${tripletToDigit(permissions.other)}`
}

export function permissionsToSymbolic(permissions: ChmodPermissions) {
  return `${tripletToSymbolic(permissions.owner)}${tripletToSymbolic(permissions.group)}${tripletToSymbolic(permissions.other)}`
}

export function permissionsToCommand(permissions: ChmodPermissions, target = '{{file}}') {
  return `chmod ${permissionsToOctal(permissions)} ${target}`
}

export function parseOctalMode(value: string): ChmodPermissions | null {
  const trimmed = value.trim()
  if (!/^[0-7]{3}$/.test(trimmed)) {
    return null
  }

  const digits = trimmed.split('').map((char) => Number(char))
  return {
    owner: digitToTriplet(digits[0]),
    group: digitToTriplet(digits[1]),
    other: digitToTriplet(digits[2]),
  }
}

export function parseSymbolicMode(value: string): ChmodPermissions | null {
  const trimmed = value.trim()
  if (!/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(trimmed)) {
    return null
  }

  const chunks = trimmed.match(/.{1,3}/g)
  if (!chunks || chunks.length !== 3) {
    return null
  }

  const parseChunk = (chunk: string): ChmodTriplet => ({
    read: chunk[0] === 'r',
    write: chunk[1] === 'w',
    execute: chunk[2] === 'x',
  })

  return {
    owner: parseChunk(chunks[0]),
    group: parseChunk(chunks[1]),
    other: parseChunk(chunks[2]),
  }
}

export function updatePermission(
  permissions: ChmodPermissions,
  subject: ChmodSubject,
  bit: ChmodBit,
  enabled: boolean,
): ChmodPermissions {
  return {
    ...permissions,
    [subject]: {
      ...permissions[subject],
      [bit]: enabled,
    },
  }
}
