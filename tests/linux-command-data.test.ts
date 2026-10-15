import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface LinuxCommand {
  name: string
  summary: string
  category: string
  content: string
}

interface LinuxCommandSource {
  repository: string
  revision: string
  revisionDate: string
  version: string
  count: number
  license: string
  contentSha256: string
}

const dataDirectory = resolve(process.cwd(), 'src/builtin-plugins/command-cheatsheet-tool/data')
const commands: LinuxCommand[] = JSON.parse(readFileSync(resolve(dataDirectory, 'linux-commands.json'), 'utf8'))
const source: LinuxCommandSource = JSON.parse(readFileSync(resolve(dataDirectory, 'source.json'), 'utf8'))

describe('内置 Linux 命令大全数据', () => {
  it('固定上游来源并包含全部 621 份唯一且非空的命令文档', () => {
    expect(source.repository).toBe('https://github.com/jaywcjlove/linux-command')
    expect(source.revision).toBe('cd17682d612e6fdfaff29261c11ffbc3f951f41d')
    expect(source.revisionDate.trim()).not.toBe('')
    expect(Number.isNaN(Date.parse(source.revisionDate))).toBe(false)
    expect(source.version.trim()).not.toBe('')
    expect(source.license).toBe('MIT')
    expect(source.count).toBe(621)
    expect(commands).toHaveLength(source.count)
    expect(new Set(commands.map(({ name }) => name)).size).toBe(commands.length)

    for (const command of commands) {
      expect(command.name.trim(), '命令名称不能为空').not.toBe('')
      expect(command.content.trim(), `${command.name} 文档不能为空`).not.toBe('')
    }

    for (const name of ['tar', 'grep', 'systemctl', 'apt-get', 'docker']) {
      expect(commands.find((command) => command.name === name), `缺少常用命令 ${name}`).toBeDefined()
    }
  })

  it('所有原始文档内容与来源清单的 SHA256 校验一致', () => {
    const digest = createHash('sha256')
    for (const command of commands) {
      digest.update(`${command.name}.md\0`, 'utf8')
      digest.update(command.content, 'utf8')
      digest.update('\0', 'utf8')
    }
    expect(source.contentSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(digest.digest('hex')).toBe(source.contentSha256)
  })

  it('保留固定上游提交的完整 MIT 许可原文及作者署名', () => {
    // Normalize checkout line endings without changing any license text.
    const license = readFileSync(resolve(dataDirectory, 'LICENSE.linux-command.txt'), 'utf8').replace(/\r\n/g, '\n')
    expect(license).toContain('MIT License')
    expect(license).toContain('Copyright © 2019 小弟调调™')
    // SHA256 of the complete upstream LICENSE at the pinned revision.
    expect(createHash('sha256').update(license, 'utf8').digest('hex'))
      .toBe('1935c001f1a15b99c814ebda8146cfb19e26df5b7f001baf4c40c6532c771caa')
  })
})
