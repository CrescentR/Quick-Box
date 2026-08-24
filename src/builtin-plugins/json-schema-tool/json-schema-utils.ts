type JsonSchema = {
  $schema?: string
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  anyOf?: JsonSchema[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function schemaKey(schema: JsonSchema) {
  return JSON.stringify({
    type: schema.type,
    properties: schema.properties,
    required: schema.required,
    items: schema.items,
    anyOf: schema.anyOf,
  })
}

function uniqueSchemas(schemas: JsonSchema[]) {
  const seen = new Set<string>()
  return schemas.filter((schema) => {
    const key = schemaKey(schema)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeObjectSchemas(schemas: JsonSchema[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const requiredSets = schemas.map((schema) => new Set(schema.required ?? []))
  const allKeys = new Set<string>()

  schemas.forEach((schema) => {
    Object.entries(schema.properties ?? {}).forEach(([key, value]) => {
      allKeys.add(key)
      properties[key] = properties[key] ? mergeSchemas([properties[key], value]) : value
    })
  })

  const required = [...allKeys].filter((key) => requiredSets.every((set) => set.has(key)))
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
  }
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const unique = uniqueSchemas(schemas)
  if (unique.length === 1) return unique[0]
  if (unique.every((schema) => schema.type === 'object')) return mergeObjectSchemas(unique)
  return { anyOf: unique }
}

export function inferJsonSchema(value: unknown, includeMeta = true): JsonSchema {
  const schema = inferValue(value)
  return includeMeta ? { $schema: 'https://json-schema.org/draft/2020-12/schema', ...schema } : schema
}

function inferValue(value: unknown): JsonSchema {
  if (value === null) return { type: 'null' }
  if (Array.isArray(value)) {
    if (!value.length) return { type: 'array', items: {} }
    return { type: 'array', items: mergeSchemas(value.map(inferValue)) }
  }
  switch (typeof value) {
    case 'string':
      return { type: 'string' }
    case 'boolean':
      return { type: 'boolean' }
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number' }
    case 'object':
      if (!isPlainObject(value)) return { type: 'object' }
      {
        const properties: Record<string, JsonSchema> = {}
        const required: string[] = []
        Object.entries(value).forEach(([key, item]) => {
          properties[key] = inferValue(item)
          required.push(key)
        })
        return {
          type: 'object',
          properties,
          ...(required.length ? { required } : {}),
        }
      }
    default:
      return {}
  }
}

export function jsonToSchema(input: string, includeRequired: boolean, includeMeta: boolean) {
  const parsed = JSON.parse(input) as unknown
  const schema = inferJsonSchema(parsed, includeMeta)
  if (!includeRequired) stripRequired(schema)
  return JSON.stringify(schema, null, 2)
}

function stripRequired(schema: JsonSchema) {
  delete schema.required
  if (schema.properties) Object.values(schema.properties).forEach(stripRequired)
  if (schema.items) stripRequired(schema.items)
  schema.anyOf?.forEach(stripRequired)
}
