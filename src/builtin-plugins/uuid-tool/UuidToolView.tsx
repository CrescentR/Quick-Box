import { useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail } from '../../ui'
import { createUuid } from '../../utils/id'
import { ToolShell } from '../../core/tool/ToolShell'

export default function UuidToolView() {
  const [uuid, setUuid] = useState(createUuid())
  const { copyText, clipboardToast } = useClipboardToast()

  return (
    <ToolShell title="UUID 生成器" description="即时生成 UUID v4，并在不离开启动器流程的情况下复制结果。" badge="UUID v4">

      <CodeBlock code={uuid} language="uuid" copyable />

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => setUuid(createUuid())}>
          再生成一个
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(uuid, 'UUID v4')}>
          复制 UUID
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 使用当前桌面 WebView 中的浏览器 crypto API。\n- 生成符合 RFC 4122 风格的随机 UUID v4。\n- 适合临时 id、mock 数据和本地测试载荷。"
        metadata={[
          { label: '模式', value: '单个 UUID 生成' },
          { label: '版本', value: 'v4 随机' },
          { label: '剪贴板', value: '支持复制' },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
