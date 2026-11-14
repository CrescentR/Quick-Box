import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export const semverPattern = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/

export function parseSemver(input: string) {
  const match = input.trim().match(semverPattern)
  if (!match) {
    return null
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
    build: match[5] ?? '',
  }
}

export function formatSemver(version: { major: number; minor: number; patch: number; prerelease?: string; build?: string }) {
  const prerelease = version.prerelease ? `-${version.prerelease}` : ''
  const build = version.build ? `+${version.build}` : ''
  return `${version.major}.${version.minor}.${version.patch}${prerelease}${build}`
}

export function analyzeSemver(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const parsed = parseSemver(input)
  if (!parsed) {
    return {
      summary: lt('版本格式无效，示例：1.2.3、v1.2.3-beta.1、1.2.3+build.7', 'Invalid SemVer format. Examples: 1.2.3, v1.2.3-beta.1, 1.2.3+build.7', locale),
      output: JSON.stringify({ valid: false }, null, 2),
    }
  }

  const release = { major: parsed.major, minor: parsed.minor, patch: parsed.patch }
  const output = {
    valid: true,
    current: formatSemver(parsed),
    parsed,
    next: {
      major: formatSemver({ major: parsed.major + 1, minor: 0, patch: 0 }),
      minor: formatSemver({ major: parsed.major, minor: parsed.minor + 1, patch: 0 }),
      patch: formatSemver({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 }),
      release: formatSemver(release),
      prereleaseRc: formatSemver({ ...release, prerelease: 'rc.1' }),
    },
  }

  return {
    summary: [
      lt(`当前版本：${output.current}`, `Current: ${output.current}`, locale),
      lt(`下一个 major：${output.next.major}`, `Next major: ${output.next.major}`, locale),
      lt(`下一个 minor：${output.next.minor}`, `Next minor: ${output.next.minor}`, locale),
      lt(`下一个 patch：${output.next.patch}`, `Next patch: ${output.next.patch}`, locale),
      lt(`去除预发布/构建信息：${output.next.release}`, `Strip pre/build: ${output.next.release}`, locale),
      lt(`下一个 RC：${output.next.prereleaseRc}`, `Next RC: ${output.next.prereleaseRc}`, locale),
    ].join('\n'),
    output: JSON.stringify(output, null, 2),
  }
}
