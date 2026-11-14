
import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export type GitignoreTemplateKey = 'node' | 'rust' | 'tauri' | 'python' | 'os' | 'editor'

export const gitignoreTemplates: Record<GitignoreTemplateKey, { label: string; enLabel: string; lines: string[] }> = {
  node: {
    label: 'Node / Vite',
    enLabel: 'Node / Vite',
    lines: ['node_modules/', 'dist/', 'dist-ssr/', '*.local', '.env', '.env.*', '!.env.example', 'npm-debug.log*', 'pnpm-debug.log*', 'yarn-debug.log*'],
  },
  rust: {
    label: 'Rust',
    enLabel: 'Rust',
    lines: ['target/', 'Cargo.lock.bak', '*.pdb'],
  },
  tauri: {
    label: 'Tauri',
    enLabel: 'Tauri',
    lines: ['src-tauri/target/', 'src-tauri/gen/', 'src-tauri/.taurignore'],
  },
  python: {
    label: 'Python',
    enLabel: 'Python',
    lines: ['__pycache__/', '*.py[cod]', '.pytest_cache/', '.mypy_cache/', '.venv/', 'venv/'],
  },
  os: {
    label: '系统文件',
    enLabel: 'OS Files',
    lines: ['.DS_Store', 'Thumbs.db', 'desktop.ini'],
  },
  editor: {
    label: '编辑器',
    enLabel: 'Editors',
    lines: ['.idea/', '.vscode/*', '!.vscode/extensions.json', '!.vscode/settings.json'],
  },
}

export function buildGitignore(selectedTemplates: GitignoreTemplateKey[], customLines: string, locale: ResolvedLocale = getCurrentLocale()) {
  const sections = selectedTemplates.map((key) => {
    const template = gitignoreTemplates[key]
    return [`# ${locale === 'en-US' ? template.enLabel : template.label}`, ...template.lines].join('\n')
  })

  const custom = customLines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (custom.length) {
    sections.push([lt('# 自定义', '# Custom', locale), ...custom].join('\n'))
  }

  const output = sections.join('\n\n')
  const uniqueLines = Array.from(
    new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    ),
  )

  return {
    output,
    report: JSON.stringify(
      {
        selectedTemplates: selectedTemplates.length,
        customLines: custom.length,
        ignoreRules: uniqueLines.length,
      },
      null,
      2,
    ),
  }
}
