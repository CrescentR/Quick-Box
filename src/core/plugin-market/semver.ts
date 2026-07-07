/**
 * 轻量语义化版本号比较工具
 * 不引入额外依赖，覆盖 x.y.z 和 x.y.z-pre+build 格式。
 */

interface ParsedVersion {
  major: number
  minor: number
  patch: number
  pre: string[]
}

function parseSemver(version: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+[\w.]+)?$/.exec(version.trim())
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split('.') : [],
  }
}

function comparePre(a: string[], b: string[]): number {
  // 无预发布版本 > 有预发布版本
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1
  if (b.length === 0) return -1

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const aPart = a[i]
    const bPart = b[i]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1

    const aNum = Number(aPart)
    const bNum = Number(bPart)
    const aIsNum = !Number.isNaN(aNum)
    const bIsNum = !Number.isNaN(bNum)

    if (aIsNum && bIsNum) {
      if (aNum !== bNum) return aNum - bNum
    } else if (aIsNum) {
      return -1 // 数字 < 字母
    } else if (bIsNum) {
      return 1
    } else {
      if (aPart !== bPart) return aPart < bPart ? -1 : 1
    }
  }
  return 0
}

/**
 * 比较两个语义化版本号。
 * @returns 正数表示 a > b，负数表示 a < b，0 表示相等。
 *          若任一版本号非法，返回 0（视为相等，避免误判更新）。
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa || !pb) return 0

  if (pa.major !== pb.major) return pa.major - pb.major
  if (pa.minor !== pb.minor) return pa.minor - pb.minor
  if (pa.patch !== pb.patch) return pa.patch - pb.patch
  return comparePre(pa.pre, pb.pre)
}

/** 判断 remote 版本是否大于 local 版本 */
export function isRemoteNewer(remoteVersion: string, localVersion: string): boolean {
  return compareVersions(remoteVersion, localVersion) > 0
}
