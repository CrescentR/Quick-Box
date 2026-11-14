import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function buildClamp(
  minSize: number,
  maxSize: number,
  minViewport: number,
  maxViewport: number,
  locale: ResolvedLocale = getCurrentLocale(),
) {
  if (minViewport === maxViewport) return lt('视口宽度不能相同', 'Viewport widths must differ', locale)
  const slope = (maxSize - minSize) / (maxViewport - minViewport)
  const vw = slope * 100
  const intercept = minSize - slope * minViewport
  return `clamp(${minSize}px, ${intercept.toFixed(4)}px + ${vw.toFixed(4)}vw, ${maxSize}px)`
}
