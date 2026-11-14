import { useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { createUuid } from '../../utils/id'
import { ToolShell } from '../../core/tool/ToolShell'

export default function UuidToolView() {
  const tr = useT()
  const [uuid, setUuid] = useState(createUuid())
  const { copyText, clipboardToast } = useClipboardToast()

  return (
    <ToolShell
      title={tr('UUID 生成器', 'UUID Generator')}
      description={tr(
        '即时生成 UUID v4，并在不离开启动器流程的情况下复制结果。',
        'Generate UUID v4 instantly and copy without leaving the launcher.',
      )}
      badge="UUID v4"
    >
      <CodeBlock code={uuid} language="uuid" copyable />

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => setUuid(createUuid())}>
          {tr('再生成一个', 'Generate another')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(uuid, 'UUID v4')}>
          {tr('复制 UUID', 'Copy UUID')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 使用当前桌面 WebView 中的浏览器 crypto API。\n- 生成符合 RFC 4122 风格的随机 UUID v4。\n- 适合临时 id、mock 数据和本地测试载荷。',
          '- Uses the browser Web Crypto API inside the desktop WebView.\n- Generates RFC 4122 random UUID v4 values.\n- Ideal for temporary IDs, mock data, and local test payloads.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('单个 UUID 生成', 'Single UUID generator') },
          { label: tr('版本', 'Version'), value: tr('v4 随机', 'v4 random') },
          { label: tr('剪贴板', 'Clipboard'), value: tr('支持复制', 'Copy supported') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
