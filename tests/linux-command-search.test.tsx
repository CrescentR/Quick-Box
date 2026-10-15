import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import commands from '../src/builtin-plugins/command-cheatsheet-tool/data/linux-commands.json'
import { indexLinuxCommands, searchLinuxCommands } from '../src/builtin-plugins/command-cheatsheet-tool/search-linux-commands'
import CommandCheatsheetToolView from '../src/builtin-plugins/command-cheatsheet-tool/CommandCheatsheetToolView'

const clipboard = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../src/api/clipboard-api', () => ({ writeClipboardText: clipboard }))
const indexed = indexLinuxCommands(commands)

describe('Linux 命令大全搜索', () => {
  it('完整收录，命令名精确匹配优先，支持中文和正文选项', () => {
    expect(searchLinuxCommands(indexed, '')).toHaveLength(621)
    expect(searchLinuxCommands(indexed, '  SYSTEMCTL  ')[0].name).toBe('systemctl')
    expect(searchLinuxCommands(indexed, '压缩').some((item) => item.name === 'tar')).toBe(true)
    expect(searchLinuxCommands(indexed, '--exclude').some((item) => item.name === 'tar')).toBe(true)
    expect(searchLinuxCommands(indexed, '找不到的命令abcdef')).toEqual([])
  })
  it('分类与多个关键词共同过滤，空白不会遗漏命令', () => {
    const compressed = searchLinuxCommands(indexed, 'tar', '备份压缩')
    expect(compressed.some((item) => item.name === 'tar')).toBe(true)
    expect(compressed.every((item) => item.category === '备份压缩')).toBe(true)
    expect(searchLinuxCommands(indexed, 'systemctl nginx')[0].name).toBe('systemctl')
    expect(searchLinuxCommands(indexed, 'systemctl 不存在的关键字abc')).toEqual([])
    expect(searchLinuxCommands(indexed, '  ')).toHaveLength(621)
  })
})

it('查阅完整手册、复制原文、空结果恢复和 tldr 示例切换', async () => {
  render(<CommandCheatsheetToolView />)
  const input = screen.getByLabelText('搜索 Linux 命令')
  fireEvent.change(input, { target: { value: 'systemctl' } })
  const article = screen.getByRole('article', { name: 'systemctl 命令手册' })
  expect(within(article).getByRole('heading', { name: 'systemctl', exact: true })).toBeTruthy()
  expect(within(article).getAllByText(/systemctl status nginx/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByText('复制完整手册'))
  expect(clipboard).toHaveBeenCalledWith(commands.find((item) => item.name === 'systemctl')!.content)
  fireEvent.change(input, { target: { value: '不存在的命令abcdef' } })
  expect(screen.getByText(/找到 0 个命令/)).toBeTruthy()
  fireEvent.change(input, { target: { value: 'grep' } })
  expect(screen.getByRole('article', { name: 'grep 命令手册' })).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: 'tldr 示例' }))
  expect(await screen.findByText('tldr 快速示例')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: '完整手册' }))
  expect(screen.getByRole('article', { name: 'grep 命令手册' })).toBeTruthy()
})
