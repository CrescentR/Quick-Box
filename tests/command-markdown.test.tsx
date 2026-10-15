import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import CommandMarkdown from '../src/builtin-plugins/command-cheatsheet-tool/CommandMarkdown'
import { writeClipboardText } from '../src/api/clipboard-api'

vi.mock('../src/api/clipboard-api', () => ({ writeClipboardText: vi.fn().mockResolvedValue(undefined) }))

it('renders complete fenced and indented examples with copy actions and GFM tables', () => {
  const { container } = render(<CommandMarkdown content={'# 查看日志\n\n```bash\ntail -n 20 app.log\ntail -f app.log\n```\n\n    ls -la\n\n| 参数 | 说明 |\n| --- | --- |\n| `-f` | 持续读取 |\n\n> 提示\n\n- 一\n- 二'} />)
  expect(screen.getByRole('heading', { name: '查看日志' })).toBeTruthy()
  expect(container.querySelectorAll('pre')).toHaveLength(2)
  expect(container.querySelector('pre')?.textContent).toBe('tail -n 20 app.log\ntail -f app.log')
  fireEvent.click(screen.getAllByRole('button', { name: '复制', exact: true })[0])
  expect(writeClipboardText).toHaveBeenCalledWith('tail -n 20 app.log\ntail -f app.log')
  expect(screen.getByRole('table')).toBeTruthy()
  expect(screen.getByRole('region', { name: '命令文档表格' })).toBeTruthy()
  expect(container.querySelector('blockquote')?.textContent).toContain('提示')
  expect(container.querySelectorAll('li')).toHaveLength(2)
})

it('selects linked command documentation without navigating away', () => {
  const selectCommand = vi.fn()
  render(<CommandMarkdown content={'[查看 ls](./ls.md) [查看 grep](grep.md#示例) [查看 find](/command/find.md)'} onCommandLink={selectCommand} />)
  fireEvent.click(screen.getByRole('button', { name: '查看 ls' }))
  fireEvent.click(screen.getByRole('button', { name: '查看 grep' }))
  fireEvent.click(screen.getByRole('button', { name: '查看 find' }))
  expect(selectCommand.mock.calls).toEqual([['ls'], ['grep'], ['find']])
})

it('allows only HTTP external links and renders images as links without loading media or HTML', () => {
  const { container } = render(<CommandMarkdown content={'[官网](https://example.com/docs) [邮件](mailto:user@example.com) [恶意链接](javascript:alert%281%29) [本地文件](file:///etc/passwd)\n\n![示意图](https://example.com/image.png)\n\n<img src="https://example.com/tracker.png" />\n\n<script>alert(1)</script>'} />)
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(2)
  expect(links[0].getAttribute('href')).toBe('https://example.com/docs')
  expect(links[1].getAttribute('href')).toBe('https://example.com/image.png')
  expect(links.every((link) => link.getAttribute('rel') === 'noopener noreferrer')).toBe(true)
  expect(container.querySelector('img, script')).toBeNull()
  expect(screen.getByText('邮件').closest('a')).toBeNull()
  expect(screen.getByText('恶意链接').closest('a')).toBeNull()
})
