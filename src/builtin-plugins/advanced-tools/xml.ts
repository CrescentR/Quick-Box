import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function formatXmlNode(node: Node, depth = 0): string {
  const indent = '  '.repeat(depth)
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim()
    return text ? `${indent}${text}` : ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const attrs = Array.from(element.attributes)
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(' ')
  const open = attrs ? `<${element.tagName} ${attrs}>` : `<${element.tagName}>`
  const children = Array.from(element.childNodes).map((child) => formatXmlNode(child, depth + 1)).filter(Boolean)
  if (!children.length) return `${indent}${open}</${element.tagName}>`
  return `${indent}${open}\n${children.join('\n')}\n${indent}</${element.tagName}>`
}

export function formatXml(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const parser = new DOMParser()
  const document = parser.parseFromString(input, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) {
    return {
      formatted: parserError.textContent || lt('XML 无效', 'Invalid XML', locale),
      report: lt('解析失败，请检查标签闭合、属性引号和根节点。', 'Parse failed. Check closing tags, attribute quotes, and root node.', locale),
    }
  }

  return {
    formatted: formatXmlNode(document.documentElement),
    report: lt(
      `根节点：${document.documentElement.tagName}\n子节点数：${document.documentElement.childElementCount}`,
      `Root tag: ${document.documentElement.tagName}\nChild elements: ${document.documentElement.childElementCount}`,
      locale,
    ),
  }
}
