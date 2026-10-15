export interface LinuxCommandManual {
  name: string
  summary: string
  category: string
  content: string
}

export interface IndexedLinuxCommand extends LinuxCommandManual {
  searchName: string
  searchSummary: string
  searchContent: string
}

const popular = ['ls', 'cd', 'pwd', 'find', 'grep', 'tar', 'ssh', 'curl', 'systemctl', 'docker', 'ps', 'top', 'chmod', 'awk', 'sed', 'git']
const compareNames = (a: LinuxCommandManual, b: LinuxCommandManual) => a.name.localeCompare(b.name, 'en')

export function indexLinuxCommands(commands: LinuxCommandManual[]): IndexedLinuxCommand[] {
  return commands.map((command) => ({ ...command, searchName: command.name.toLowerCase(), searchSummary: `${command.summary} ${command.category}`.toLowerCase(), searchContent: command.content.toLowerCase() }))
}

/** 命令名优先，其次中文说明，最后完整手册；多个关键词必须全部匹配。 */
export function searchLinuxCommands(commands: IndexedLinuxCommand[], query: string, category = 'all'): IndexedLinuxCommand[] {
  const normalized = query.trim().toLowerCase()
  const terms = normalized.split(/\s+/).filter(Boolean)
  const filtered = commands.filter((command) => category === 'all' || command.category === category)
  if (!terms.length) return [...filtered].sort((a, b) => {
    const left = popular.indexOf(a.name), right = popular.indexOf(b.name)
    return (left < 0 ? 999 : left) - (right < 0 ? 999 : right) || compareNames(a, b)
  })
  return filtered.map((command) => {
    let score = 0
    for (const term of terms) {
      if (command.searchName === term) score += 1000
      else if (command.searchName.startsWith(term)) score += 500
      else if (command.searchName.includes(term)) score += 250
      else if (command.searchSummary.includes(term)) score += 100
      else if (command.searchContent.includes(term)) score += 10
      else return { command, score: 0 }
    }
    if (command.searchName === normalized) score += 2000
    return { command, score }
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || compareNames(a.command, b.command)).map((result) => result.command)
}
