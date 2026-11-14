import { analyzeCidr } from '../../builtin-plugins/cidr-tool/cidr-utils'
import { lt, type ResolvedLocale } from '../../i18n'

/** 剪贴板内容识别结果：识别出的类型和建议打开的命令 */
export interface ClipboardMatch {
  /** 原始文本，用于判断剪贴板是否变化 */
  text: string
  /** 给用户看的类型名，如「时间戳」 */
  kind: string
  enKind: string
  commandId: string
}

/** 识别规则，按顺序匹配，命中第一条即停 */
const CLIPBOARD_RULES: { kind: string; enKind: string; commandId: string; test: (text: string) => boolean }[] = [
  {
    kind: '时间戳',
    enKind: 'Timestamp',
    commandId: 'official.timestamp-tool.open',
    test: (text) => /^\d{10}(\d{3})?$/.test(text),
  },
  {
    kind: 'JWT',
    enKind: 'JWT',
    commandId: 'official.utility-tools.jwt-decoder',
    test: (text) => /^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(text),
  },
  {
    kind: 'CIDR 网段',
    enKind: 'CIDR Range',
    commandId: 'official.cidr-tool.open',
    test: (text) => { try { analyzeCidr(text); return true } catch { return false } },
  },
  {
    kind: '编码过的 URL',
    enKind: 'Encoded URL',
    commandId: 'official.url-tool.open',
    test: (text) => { try { const url = new URL(decodeURIComponent(text)); return ['http:', 'https:'].includes(url.protocol) } catch { return false } },
  },
  {
    kind: 'JSON',
    enKind: 'JSON',
    commandId: 'official.json-tool.open',
    test: (text) => {
      if (!/^[[{]/.test(text)) return false
      try {
        JSON.parse(text)
        return true
      } catch {
        return false
      }
    },
  },
]

/** 超过该长度不做识别，避免大段文本拖慢唤起 */
const MAX_CLIPBOARD_LENGTH = 20_000

/**
 * 识别剪贴板文本属于哪类常见数据
 * @param raw 剪贴板原始文本
 */
export function detectClipboard(raw: string): ClipboardMatch | null {
  const text = raw.trim()
  if (!text || text.length > MAX_CLIPBOARD_LENGTH) return null

  const rule = CLIPBOARD_RULES.find((item) => item.test(text))
  return rule ? { text, kind: rule.kind, enKind: rule.enKind, commandId: rule.commandId } : null
}

export function getClipboardMatchLabel(match: ClipboardMatch, locale?: ResolvedLocale) {
  return lt(match.kind, match.enKind, locale)
}
