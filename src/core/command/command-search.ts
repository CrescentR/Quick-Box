import type { Command, CommandSearchResult } from './command-types'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function scoreCommand(command: Command, query: string) {
  const haystack = [command.title, command.description ?? '', ...command.keywords]
  let bestScore = 0
  let matchedText = ''

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

export function searchCommands(commands: Command[], query: string): CommandSearchResult[] {
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) {
    return commands.map((command, index) => ({
      command,
      score: 10 - index * 0.01,
      matchedText: command.title,
    }))
  }

  return commands
    .map((command) => {
      const result = scoreCommand(command, normalizedQuery)
      return {
        command,
        score: result.score,
        matchedText: result.matchedText,
      }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
}
