import { ToolShell } from './ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { useLauncherStore } from '../../stores/launcher-store'
import { CodeBlock, Tag } from '../../ui'

const regexTemplates = [
  {
    category: '身份与联系方式',
    name: '国内手机号',
    pattern: '^1[3-9]\\d{9}$',
    flags: '',
    sample: '13812345678',
  },
  {
    category: '身份与联系方式',
    name: '邮箱地址',
    pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
    flags: 'i',
    sample: 'dev@quickbox.local',
  },
  {
    category: '身份与联系方式',
    name: '中国居民身份证号',
    pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[0-9Xx]$',
    flags: '',
    sample: '11010519900307123X',
  },
  {
    category: '网络',
    name: 'IPv4',
    pattern: '^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$',
    flags: '',
    sample: '192.168.1.1',
  },
  {
    category: '网络',
    name: 'URL',
    pattern: '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$',
    flags: 'i',
    sample: 'https://quickbox.local/tools?q=regex',
  },
  {
    category: '网络',
    name: '域名',
    pattern: '^(?!-)([A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$',
    flags: 'i',
    sample: 'quickbox.local',
  },
  {
    category: '开发',
    name: 'UUID v4',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    sample: '550e8400-e29b-41d4-a716-446655440000',
  },
  {
    category: '开发',
    name: '十六进制颜色',
    pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$',
    flags: '',
    sample: '#3b82f6',
  },
  {
    category: '开发',
    name: '语义化版本',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z.-]+))?(?:\\+([0-9A-Za-z.-]+))?$',
    flags: '',
    sample: 'v1.2.3-beta.1+build.7',
  },
  {
    category: '文本',
    name: '空白行',
    pattern: '^\\s*$',
    flags: 'gm',
    sample: 'line 1\n\nline 3',
  },
  {
    category: '文本',
    name: 'HTML 标签',
    pattern: '<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)<\\/\\1>',
    flags: 'gs',
    sample: '<button>QuickBox</button>',
  },
  {
    category: '文件',
    name: 'Windows 路径',
    pattern: '^[A-Za-z]:\\\\(?:[^\\\\/:*?"<>|\\r\\n]+\\\\)*[^\\\\/:*?"<>|\\r\\n]*$',
    flags: '',
    sample: 'C:\\Users\\QuickBox\\Desktop\\demo.txt',
  },
]

export default function RegexLibraryToolView() {
  const [query, setQuery] = useState('')
  const openView = useLauncherStore((state) => state.openView)
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return regexTemplates
    return regexTemplates.filter((template) =>
      [template.category, template.name, template.pattern].some((value) => value.toLowerCase().includes(keyword)),
    )
  }, [query])

  return (
    <ToolShell title="常用正则表达式库" level="L1" description="内置常用正则模板，可复制表达式或带入正则测试工具。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">搜索模板</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">模板</span>
          <div className="qb-tool-template-list">
            {filtered.map((template) => (
              <section className="qb-tool-template" key={`${template.category}-${template.name}`}>
                <div className="qb-tool-template__head">
                  <div>
                    <div className="qb-tool-template__title">{template.name}</div>
                    <div className="qb-tool-template__meta">{template.category}</div>
                  </div>
                  <Tag tone="default">{template.flags || '无 flags'}</Tag>
                </div>
                <CodeBlock code={template.pattern} language="txt" wrap copyable />
                <div className="qb-tool-actions">
                  <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(template.pattern)}>
                    复制表达式
                  </button>
                  <button
                    className="qb-tool-button qb-tool-button--primary"
                    type="button"
                    onClick={() =>
                      openView('official.regex-tool.view', {
                        pattern: template.pattern,
                        flags: template.flags,
                        text: template.sample,
                      })
                    }
                  >
                    跳入正则测试
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
