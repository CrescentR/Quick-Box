export function safeStringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}
