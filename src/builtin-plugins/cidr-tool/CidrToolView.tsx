import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import { analyzeCidr, isIpInCidr } from './cidr-utils'

export default function CidrToolView() {
  const [input, setInput] = useState('192.168.1.42/24')
  const [checkIp, setCheckIp] = useState('192.168.1.88')
  const { copyText, clipboardToast } = useClipboardToast()

  const result = useMemo(() => {
    try {
      const info = analyzeCidr(input)
      let contained = ''
      try {
        contained = checkIp.trim() ? String(isIpInCidr(checkIp, input)) : ''
      } catch (error) {
        contained = error instanceof Error ? error.message : '检测失败'
      }
      return {
        ok: true as const,
        text: JSON.stringify({ ...info, ipInCidr: contained || undefined }, null, 2),
        info,
        contained,
      }
    } catch (error) {
      return {
        ok: false as const,
        text: error instanceof Error ? error.message : '无法解析 CIDR',
        info: null,
        contained: '',
      }
    }
  }, [checkIp, input])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">CIDR 子网计算器</div>
          <div className="qb-tool-view__description">
            输入 IPv4 CIDR 或「IP + 掩码」，立刻得到网段、广播地址、可用主机数，并检查某个 IP 是否落在该网段。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">IPv4</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">CIDR 或 IP + 掩码</span>
          <input
            id="cidr-tool-input"
            name="cidr-tool-input"
            className="qb-tool-input qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="10.0.0.0/16 或 10.0.0.1 255.255.0.0"
          />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">检测 IP 是否在网段内</span>
          <input
            id="cidr-tool-check-ip"
            name="cidr-tool-check-ip"
            className="qb-tool-input qb-mono"
            value={checkIp}
            onChange={(event) => setCheckIp(event.target.value)}
            placeholder="192.168.1.88"
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">计算结果</span>
          <CodeBlock code={result.text} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void copyText(result.text, 'CIDR analysis')}
        >
          复制结果
        </button>
        {result.info ? (
          <button className="qb-tool-button" type="button" onClick={() => void copyText(result.info.cidr, 'Normalized CIDR')}>
            复制规范化 CIDR
          </button>
        ) : null}
      </div>

      <Detail
        title="使用说明"
        markdown="- 支持 `192.168.1.0/24` 或 `192.168.1.0 255.255.255.0`。\n- `/31` 和 `/32` 按点到点与单地址处理，不减去网络/广播。\n- 当前版本覆盖 IPv4，适合 VPC、Docker 网段和防火墙规则核对。"
        metadata={[
          { label: '协议', value: 'IPv4' },
          { label: '输入', value: 'CIDR / 掩码' },
          { label: '检测', value: result.contained ? `包含 = ${result.contained}` : '可选' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
