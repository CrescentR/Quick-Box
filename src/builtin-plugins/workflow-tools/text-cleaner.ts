export function cleanText(input: string, trimLines: boolean, collapseSpaces: boolean, removeBlankLines: boolean) {
  const lines = input.split('\n').map((line) => {
    let next = trimLines ? line.trim() : line.replace(/\s+$/g, '')
    if (collapseSpaces) {
      next = next.replace(/[ \t]{2,}/g, ' ')
    }
    return next
  })

  return (removeBlankLines ? lines.filter((line) => line.trim()) : lines).join('\n')
}
