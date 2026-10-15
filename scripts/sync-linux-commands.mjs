// 从上游固定提交同步全部 Markdown；仅下载文档，不运行上游脚本。
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(projectRoot, 'src/builtin-plugins/command-cheatsheet-tool/data')
const repository = 'jaywcjlove/linux-command'
const ref = process.argv[2] ?? 'master'
const fetchText = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!response.ok) throw new Error(`下载失败 ${response.status}: ${url}`)
  return response.text()
}
const commit = JSON.parse(await fetchText(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(ref)}`))
if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('上游提交号无效')
const temporary = await mkdtemp(path.join(tmpdir(), 'quickbox-linux-command-'))
try {
  const archive = await fetch(`https://codeload.github.com/${repository}/tar.gz/${commit.sha}`, { signal: AbortSignal.timeout(120000) })
  if (!archive.ok) throw new Error(`下载归档失败: ${archive.status}`)
  const archivePath = path.join(temporary, 'source.tar.gz')
  await writeFile(archivePath, new Uint8Array(await archive.arrayBuffer()))
  const prefix = `linux-command-${commit.sha}`
  execFileSync('tar', ['-xzf', archivePath, '-C', temporary, `${prefix}/command`, `${prefix}/LICENSE`, `${prefix}/README.md`, `${prefix}/package.json`, `${prefix}/dist/data.json`])
  const source = path.join(temporary, prefix)
  const directory = path.join(source, 'command')
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => entry.name).sort()
  if (!files.length) throw new Error('上游没有命令文档')
  if (entries.some((entry) => !entry.isFile() && !entry.isDirectory())) throw new Error('命令目录包含非普通文件')
  const index = JSON.parse(await readFile(path.join(source, 'dist/data.json'), 'utf8'))
  const readme = await readFile(path.join(source, 'README.md'), 'utf8')
  const license = await readFile(path.join(source, 'LICENSE'), 'utf8')
  if (!license.startsWith('MIT License')) throw new Error('上游许可证发生变化，请检查')
  const version = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8')).version
  const categories = new Map()
  let category = '', inCategories = false
  for (const line of readme.split(/\r?\n/)) {
    if (/^## Linux命令分类/.test(line)) { inCategories = true; continue }
    if (inCategories && /^## /.test(line)) break
    if (!inCategories) continue
    if (line.startsWith('### ')) category = line.slice(4).trim()
    else if (category && line.includes('、')) {
      for (const name of line.split('、')) {
        const command = name.trim().replace(/\(.*\)$/, '')
        if (!categories.has(command)) categories.set(command, category)
      }
    }
  }
  const commands = []
  const hash = createHash('sha256')
  for (const file of files) {
    if (path.basename(file) !== file) throw new Error(`无效文档名: ${file}`)
    const content = await readFile(path.join(directory, file), 'utf8')
    const name = file.slice(0, -3)
    // 保留原始 Markdown；上游生成索引遗漏的文档也收录。
    const summary = index[name]?.d ?? content.replace(/^.*\r?\n(?:=+|-+)\r?\n/, '').split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))?.trim() ?? name
    commands.push({ name, summary, category: categories.get(name) ?? '其他命令', content })
    hash.update(file).update('\0').update(content).update('\0')
  }
  const metadata = { repository: `https://github.com/${repository}`, revision: commit.sha, revisionDate: commit.commit.committer.date, version, count: commands.length, license: 'MIT', contentSha256: hash.digest('hex') }
  await mkdir(output, { recursive: true })
  await writeFile(path.join(output, 'linux-commands.json'), `${JSON.stringify(commands)}\n`)
  await writeFile(path.join(output, 'command-names.json'), `${JSON.stringify(commands.map((command) => command.name))}\n`)
  await writeFile(path.join(output, 'source.json'), `${JSON.stringify(metadata, null, 2)}\n`)
  await writeFile(path.join(output, 'LICENSE.linux-command.txt'), license)
  console.log(`已同步 ${commands.length} 个命令文档，版本 ${version}，提交 ${commit.sha}`)
} finally {
  // 仅删除本脚本在系统临时目录中创建的专用目录。
  const relative = path.relative(path.resolve(tmpdir()), path.resolve(temporary))
  if (!relative.startsWith('..') && !path.isAbsolute(relative) && relative.startsWith('quickbox-linux-command-')) await rm(temporary, { recursive: true, force: true })
}
