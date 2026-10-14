import { describe, expect, it } from 'vitest'
import { searchCommands } from '../src/core/command/command-search'
import type { Command } from '../src/core/command/command-types'
import { detectClipboard } from '../src/pages/launcher/launcher-clipboard'
import { createBackup, emptyWorkspace, mergeWorkspace, readBackup, validateWorkspace } from '../src/core/workspace/workspace-data'

const command = (id: string, title: string, keywords: string[]): Command => ({ id, title, keywords, pluginId: 'test', source: 'builtin', executeMode: 'view', run: () => {} })
describe('搜索与剪贴板', () => {
  const commands = [command('json', 'JSON 工具', ['格式化', 'format']), command('port', '端口占用', ['port'])]
  const history = { json: { runCount: 100, lastRunAt: new Date().toISOString() } }
  it('使用历史不能制造搜索命中', () => {
    expect(searchCommands(commands, '不存在', history)).toEqual([])
    expect(searchCommands(commands, 'port', history).map((item) => item.command.id)).toEqual(['port'])
  })
  it('支持中英文、忽略大小写与空查询', () => {
    expect(searchCommands(commands, '  FORMAT  ')[0].command.id).toBe('json')
    expect(searchCommands(commands, '格式化')[0].command.id).toBe('json')
    expect(searchCommands(commands, '', history)).toHaveLength(2)
  })
  it('识别合法内容，拒绝伪 CIDR、损坏 JSON 和大文本', () => {
    expect(detectClipboard('999.1.1.1/99')).toBeNull()
    expect(detectClipboard('192.168.1.42/24')?.kind).toBe('CIDR 网段')
    expect(detectClipboard('{oops}')).toBeNull()
    expect(detectClipboard('{"ok":true}')?.kind).toBe('JSON')
    expect(detectClipboard('x'.repeat(20001))).toBeNull()
    expect(detectClipboard('https%3A%2F%2Fexample.com%2F%3Fq%3Da')?.commandId).toBe('official.url-tool.open')
  })
})
describe('备份与导入', () => {
  it('往返保留数据并拒绝篡改与未知版本', async () => {
    const data = { ...emptyWorkspace(), quickCommandIds: ['json'], presets: { 'json.indent': 4 } }
    const backup = await createBackup(data)
    expect(await readBackup(backup)).toEqual(data)
    const corrupt = JSON.parse(backup); corrupt.payload += ' '
    await expect(readBackup(JSON.stringify(corrupt))).rejects.toThrow('校验失败')
    expect(() => validateWorkspace({ ...data, version: 2 })).toThrow('版本')
  })
  it('重复合并幂等，保留不冲突片段并按 ID 更新冲突项', () => {
    const item = { id: '1', title: '模板', content: 'a', language: 'text', tags: '', updatedAt: new Date().toISOString() }
    const current = { ...emptyWorkspace(), snippets: [item] }
    const incoming = { ...emptyWorkspace(), snippets: [{ ...item, content: 'b' }] }
    const merged = mergeWorkspace(current, incoming)
    expect(merged.snippets[0].content).toBe('b')
    expect(mergeWorkspace(merged, incoming)).toEqual(merged)
    expect(() => validateWorkspace({ ...current, snippets: [item, item] })).toThrow()
  })
})
