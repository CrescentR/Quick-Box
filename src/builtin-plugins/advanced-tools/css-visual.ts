export interface BoxShadowOptions {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  alpha: number
  inset: boolean
}

export interface GradientOptions {
  angle: number
  startColor: string
  endColor: string
}

export function hexToRgba(hex: string, alphaPercent: number): string {
  const cleaned = hex.trim().replace(/^#/, '')
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : cleaned
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(0, 0, 0, ${Math.min(Math.max(alphaPercent, 0), 100) / 100})`
  }
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const alpha = Math.round(Math.min(Math.max(alphaPercent, 0), 100)) / 100
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function buildBoxShadowCss(options: BoxShadowOptions): string {
  const prefix = options.inset ? 'inset ' : ''
  const rgba = hexToRgba(options.color, options.alpha)
  return `${prefix}${options.offsetX}px ${options.offsetY}px ${Math.max(0, options.blur)}px ${options.spread}px ${rgba}`
}

export function buildLinearGradientCss(options: GradientOptions): string {
  const angle = ((options.angle % 360) + 360) % 360
  return `linear-gradient(${angle}deg, ${options.startColor.trim() || '#f0b43c'} 0%, ${options.endColor.trim() || '#3b82f6'} 100%)`
}
