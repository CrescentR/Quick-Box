import { useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import { createUuid } from '../../utils/id'

export default function UuidToolView() {
  const [uuid, setUuid] = useState(createUuid())
  const { copyText, clipboardToast } = useClipboardToast()

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">UUID 生成器</div>
          <div className="qb-tool-view__description">
            即时生成 UUID v4，并在不离开启动器流程的情况下复制结果。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">UUID v4</Tag>
        </div>
      </header>

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
    </section>
  )
}
