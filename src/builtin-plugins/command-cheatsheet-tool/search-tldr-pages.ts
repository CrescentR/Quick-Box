import type { TldrPage, TldrPlatform } from './tldr-types'

export interface TldrSearchResult {
  page: TldrPage
  score: number
  matchedText: string
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function scorePage(page: TldrPage, query: string) {
  const haystack = [
    page.command,
    page.summary,
    ...(page.aliases ?? []),
    ...page.examples.map((item) => item.description),
    ...page.examples.map((item) => item.command),
  ]

  let bestScore = 0
  let matchedText = page.command

  for (const text of haystack) {
    const normalized = normalize(text)
    if (!normalized) continue

    if (normalized === query) {
      return { score: 100, matchedText: text }
    }

    if (normalized.startsWith(query)) {
      const score = 80 - normalized.length * 0.01
      if (score > bestScore) {
        bestScore = score
        matchedText = text
      }
      continue
    }

    if (normalized.includes(query)) {
      const score = 50 - normalized.indexOf(query)
      if (score > bestScore) {
        bestScore = score
        matchedText = text
      }
    }
  }

  return { score: bestScore, matchedText }
}

export function searchTldrPages(
  pages: TldrPage[],
  query: string,
  platform: TldrPlatform | 'all' = 'all',
): TldrSearchResult[] {
  const normalizedQuery = normalize(query)
  const filteredPages =
    platform === 'all' ? pages : pages.filter((page) => page.platform === platform || page.platform === 'common')

  if (!normalizedQuery) {
    return filteredPages.map((page) => ({
      page,
      score: 1,
      matchedText: page.command,
    }))
  }

  return filteredPages
    .map((page) => {
      const { score, matchedText } = scorePage(page, normalizedQuery)
      return { page, score, matchedText }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.page.command.localeCompare(right.page.command))
}
