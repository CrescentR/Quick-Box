import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'
import { safeJsonParse } from './shared'
import type { JsonObject, JsonValue } from './shared'
import { toPascalCase } from './json-to-rust'

export function toCamelCase(value: string) {
  const pascal = toPascalCase(value)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function javaType(value: JsonValue, className: string, nestedClasses: string[], useLombok: boolean): string {
  if (value === null) return 'Object'
  if (typeof value === 'boolean') return 'Boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'Long' : 'Double'
  if (typeof value === 'string') return 'String'
  if (Array.isArray(value)) {
    return `List<${value.length ? javaType(value[0], className, nestedClasses, useLombok) : 'Object'}>`
  }
  const childClass = toPascalCase(className)
  nestedClasses.push(buildJavaClass(value, childClass, nestedClasses, useLombok, true))
  return childClass
}

function buildJavaClass(
  value: JsonObject,
  className: string,
  nestedClasses: string[],
  useLombok: boolean,
  isStaticInner: boolean,
): string {
  const indent = isStaticInner ? '    ' : ''
  const fieldIndent = isStaticInner ? '        ' : '    '
  const entries = Object.entries(value)
  const fields = entries
    .map(([key, child]) => {
      const fieldName = toCamelCase(key)
      const type = javaType(child, `${className}_${key}`, nestedClasses, useLombok)
      return `${fieldIndent}private ${type} ${fieldName};`
    })
    .join('\n')

  const annotation = useLombok ? `${indent}@Data\n` : ''
  const modifier = isStaticInner ? 'public static class' : 'public class'
  if (isStaticInner) {
    return `${annotation}${indent}${modifier} ${className} {\n${fields}\n${indent}}`
  }

  const innerBlock = nestedClasses.length ? `\n\n${nestedClasses.join('\n\n')}` : ''
  return `${annotation}${modifier} ${className} {\n${fields}${innerBlock}\n}`
}

export function jsonToJavaBean(input: string, rootClassName: string, useLombok = true, locale: ResolvedLocale = getCurrentLocale()): string {
  const parsed = safeJsonParse(input, locale)
  if (!parsed.ok) return parsed.message
  const root = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return lt('JSON 根节点需要是对象或对象数组', 'Root JSON value must be an object or array of objects', locale)
  }
  const nestedClasses: string[] = []
  const classBody = buildJavaClass(root, toPascalCase(rootClassName || 'QuickBoxDto'), nestedClasses, useLombok, false)
  const imports: string[] = []
  if (useLombok) imports.push('import lombok.Data;')
  if (classBody.includes('List<')) imports.push('import java.util.List;')
  return imports.length ? `${imports.join('\n')}\n\n${classBody}` : classBody
}

function defaultJavaValue(rawType: string): JsonValue {
  const type = rawType.trim()
  if (/^(List|Set|Collection)<.*>$/i.test(type) || type.endsWith('[]')) {
    const innerMatch = /<(.+)>/.exec(type)
    const inner = innerMatch ? innerMatch[1] : type.slice(0, -2)
    return [defaultJavaValue(inner)]
  }
  if (/^(Map|HashMap)<.*>$/i.test(type)) return {}
  if (/^(String|CharSequence|Character|char)$/i.test(type)) return ''
  if (/^(int|Integer|long|Long|short|Short|byte|Byte|BigInteger)$/i.test(type)) return 0
  if (/^(double|Double|float|Float|BigDecimal)$/i.test(type)) return 0.0
  if (/^(boolean|Boolean)$/i.test(type)) return false
  if (/^(LocalDate)$/i.test(type)) return '2026-01-01'
  if (/^(LocalDateTime|Date|Instant|OffsetDateTime|ZonedDateTime)$/i.test(type)) return '2026-01-01T00:00:00Z'
  return {}
}

export function javaBeanToJson(javaCode: string, locale: ResolvedLocale = getCurrentLocale()): string {
  const result: Record<string, JsonValue> = {}
  const cleaned = javaCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  const fieldRegex = /(?:private|protected|public)?\s*([A-Za-z_][\w<>[\],\s?]*?)\s+([a-zA-Z_]\w*)\s*(?:=[^;]+)?;/g
  let match: RegExpExecArray | null
  while ((match = fieldRegex.exec(cleaned)) !== null) {
    if (/\bstatic\b/.test(match[0])) continue
    const rawType = match[1]
      .replace(/\b(?:private|protected|public|final|transient|volatile|static)\b/g, '')
      .trim()
    const fieldName = match[2].trim()
    if (!rawType || /^(return|package|import|class|interface|record)$/i.test(rawType)) continue
    result[fieldName] = defaultJavaValue(rawType)
  }
  if (!Object.keys(result).length) {
    return lt('未识别到 Java 字段声明（示例：private String userName;）', 'No Java field declarations found (e.g. private String userName;)', locale)
  }
  return JSON.stringify(result, null, 2)
}
