export function buildClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number) {
  if (minViewport === maxViewport) return '视口宽度不能相同'
  const slope = (maxSize - minSize) / (maxViewport - minViewport)
  const vw = slope * 100
  const intercept = minSize - slope * minViewport
  return `clamp(${minSize}px, ${intercept.toFixed(4)}px + ${vw.toFixed(4)}vw, ${maxSize}px)`
}
