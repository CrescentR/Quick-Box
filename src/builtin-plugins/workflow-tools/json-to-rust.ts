import { safeJsonParse } from './shared'
import type { JsonValue, JsonObject } from './shared'

export function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Generated'
}

export function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'field'
}

export function rustType(value: JsonValue, structName: string, structs: string[]): string {
  if (value === null) return 'Option<String>'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') return Number.isInteger(value) ? 'i64' : 'f64'
  if (typeof value === 'string') return 'String'
  if (Array.isArray(value)) {
    return `Vec<${value.length ? rustType(value[0], structName, structs) : 'serde_json::Value'}>`
  }

  const childName = toPascalCase(structName)
  structs.push(buildRustStruct(value, childName, structs))
  return childName
}

export function buildRustStruct(value: JsonObject, structName: string, structs: string[]) {
  const fields = Object.entries(value)
    .map(([key, child]) => {
      const fieldName = toSnakeCase(key)
      const rename = fieldName === key ? '' : `    #[serde(rename = "${key}")]\n`
      return `${rename}    pub ${fieldName}: ${rustType(child, `${structName}_${key}`, structs)},`
    })
    .join('\n')
  return `#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]\npub struct ${structName} {\n${fields}\n}`
}

export function jsonToRust(input: string, rootName: string) {
  const parsed = safeJsonParse(input)
  if (!parsed.ok) return parsed.message
  const root = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value
  if (!root || typeof root !== 'object' || Array.isArray(root)) return 'JSON 根节点需要是对象或对象数组'
  const structs: string[] = []
  const rootStruct = buildRustStruct(root, toPascalCase(rootName), structs)
  return [rootStruct, ...structs].join('\n\n')
}
