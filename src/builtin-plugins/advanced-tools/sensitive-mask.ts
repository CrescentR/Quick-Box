export function maskSensitive(input: string) {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (value) => value.replace(/^(.{2}).*(@.*)$/, '$1***$2'))
    .replace(/\b1[3-9]\d{9}\b/g, (value) => `${value.slice(0, 3)}****${value.slice(-4)}`)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, (value) => `${value.replace(/\D/g, '').slice(0, 4)} **** **** ${value.replace(/\D/g, '').slice(-4)}`)
    .replace(/\b(?:token|secret|password|passwd|api_key)\s*[:=]\s*["']?[^"'\s]+/gi, (value) => value.replace(/[:=]\s*["']?.+$/, '= ***'))
}
