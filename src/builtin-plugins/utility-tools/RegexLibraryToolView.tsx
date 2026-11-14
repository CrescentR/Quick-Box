import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { useLocale, useT } from '../../i18n'
import { useLauncherStore } from '../../stores/launcher-store'
import { CodeBlock, Tag } from '../../ui'

const regexTemplates = [
  {
    categoryZh: '身份与联系方式',
    categoryEn: 'Identity & Contact',
    nameZh: '国内手机号',
    nameEn: 'CN Mobile Number',
    pattern: '^1[3-9]\\d{9}$',
    flags: '',
    sample: '13812345678',
  },
  {
    categoryZh: '身份与联系方式',
    categoryEn: 'Identity & Contact',
    nameZh: '邮箱地址',
    nameEn: 'Email Address',
    pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
    flags: 'i',
    sample: 'dev@quickbox.local',
  },
  {
    categoryZh: '身份与联系方式',
    categoryEn: 'Identity & Contact',
    nameZh: '中国居民身份证号',
    nameEn: 'CN Resident ID',
    pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[0-9Xx]$',
    flags: '',
    sample: '11010519900307123X',
  },
  {
    categoryZh: '网络',
    categoryEn: 'Network',
    nameZh: 'IPv4',
    nameEn: 'IPv4',
    pattern: '^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$',
    flags: '',
    sample: '192.168.1.1',
  },
  {
    categoryZh: '网络',
    categoryEn: 'Network',
    nameZh: 'URL',
    nameEn: 'URL',
    pattern: '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$',
    flags: 'i',
    sample: 'https://quickbox.local/tools?q=regex',
  },
  {
    categoryZh: '网络',
    categoryEn: 'Network',
    nameZh: '域名',
    nameEn: 'Domain Name',
    pattern: '^(?!-)([A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$',
    flags: 'i',
    sample: 'quickbox.local',
  },
  {
    categoryZh: '开发',
    categoryEn: 'Development',
    nameZh: 'UUID v4',
    nameEn: 'UUID v4',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    sample: '550e8400-e29b-41d4-a716-446655440000',
  },
  {
    categoryZh: '开发',
    categoryEn: 'Development',
    nameZh: '十六进制颜色',
    nameEn: 'Hex Color',
    pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$',
    flags: '',
    sample: '#3b82f6',
  },
  {
    categoryZh: '开发',
    categoryEn: 'Development',
    nameZh: '语义化版本',
    nameEn: 'Semantic Version (SemVer)',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z.-]+))?(?:\\+([0-9A-Za-z.-]+))?$',
    flags: '',
    sample: 'v1.2.3-beta.1+build.7',
  },
  {
    categoryZh: '文本',
    categoryEn: 'Text',
    nameZh: '空白行',
    nameEn: 'Blank Lines',
    pattern: '^\\s*$',
    flags: 'gm',
    sample: 'line 1\n\nline 3',
  },
  {
    categoryZh: '文本',
    categoryEn: 'Text',
    nameZh: 'HTML 标签',
    nameEn: 'HTML Tag',
    pattern: '<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)<\\/\\1>',
    flags: 'gs',
    sample: '<button>QuickBox</button>',
  },
  {
    categoryZh: '文件',
    categoryEn: 'Files',
    nameZh: 'Windows 路径',
    nameEn: 'Windows Path',
    pattern: '^[A-Za-z]:\\\\(?:[^\\\\/:*?"<>|\\r\\n]+\\\\)*[^\\\\/:*?"<>|\\r\\n]*$',
    flags: '',
    sample: 'C:\\Users\\QuickBox\\Desktop\\demo.txt',
  },
]

export default function RegexLibraryToolView() {
  const tr = useT()
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const openView = useLauncherStore((state) => state.openView)
  const localizedTemplates = useMemo(
    () =>
      regexTemplates.map((template) => ({
        ...template,
        category: locale === 'en-US' ? template.categoryEn : template.categoryZh,
        name: locale === 'en-US' ? template.nameEn : template.nameZh,
      })),
    [locale],
  )
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return localizedTemplates
    return localizedTemplates.filter((template) =>
      [template.categoryZh, template.categoryEn, template.nameZh, template.nameEn, template.pattern].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    )
  }, [localizedTemplates, query])

  return (
    <ToolShell
      title={tr('常用正则表达式库', 'Regex Pattern Library')}
      level="L1"
      description={tr('内置常用正则模板，可复制表达式或带入正则测试工具。', 'Built-in common regex patterns ready to copy or open in the Regex Tester.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('搜索模板', 'Search Patterns')}</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('模板', 'Templates')}</span>
          <div className="qb-tool-template-list">
            {filtered.map((template) => (
              <section className="qb-tool-template" key={`${template.category}-${template.name}`}>
                <div className="qb-tool-template__head">
                  <div>
                    <div className="qb-tool-template__title">{template.name}</div>
                    <div className="qb-tool-template__meta">{template.category}</div>
                  </div>
                  <Tag tone="default">{template.flags || tr('无 flags', 'No flags')}</Tag>
                </div>
                <CodeBlock code={template.pattern} language="txt" wrap copyable />
                <div className="qb-tool-actions">
                  <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(template.pattern)}>
                    {tr('复制表达式', 'Copy Pattern')}
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
                    {tr('跳入正则测试', 'Test in Regex Tester')}
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
