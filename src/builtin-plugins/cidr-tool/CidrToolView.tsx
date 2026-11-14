import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { analyzeCidr, isIpInCidr } from './cidr-utils'
import { ToolShell } from '../../core/tool/ToolShell'

export default function CidrToolView() {
  const tr = useT()
  const [input, setInput] = useToolInput('192.168.1.42/24')
  const [checkIp, setCheckIp] = useState('192.168.1.88')
  const { copyText, clipboardToast } = useClipboardToast()

  const result = useMemo(() => {
    try {
      const info = analyzeCidr(input)
      let contained = ''
      try {
        contained = checkIp.trim() ? String(isIpInCidr(checkIp, input)) : ''
      } catch (error) {
        contained = error instanceof Error ? error.message : tr('检测失败', 'Check failed')
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
        text: error instanceof Error ? error.message : tr('无法解析 CIDR', 'Unable to parse CIDR'),
        info: null,
        contained: '',
      }
    }
  }, [checkIp, input, tr])

  return (
    <ToolShell
      title={tr('CIDR 子网计算器', 'CIDR Subnet Calculator')}
      description={tr(
        '输入 IPv4 CIDR 或「IP + 掩码」，立刻得到网段、广播地址、可用主机数，并检查某个 IP 是否落在该网段。',
        'Enter an IPv4 CIDR or IP + netmask to inspect subnet bounds, broadcast address, usable host count, and IP membership.',
      )}
      badge="IPv4"
    >

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('CIDR 或 IP + 掩码', 'CIDR or IP + Netmask')}</span>
          <input
            id="cidr-tool-input"
            name="cidr-tool-input"
            className="qb-tool-input qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={tr('10.0.0.0/16 或 10.0.0.1 255.255.0.0', '10.0.0.0/16 or 10.0.0.1 255.255.0.0')}
          />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('检测 IP 是否在网段内', 'Check if IP is in range')}</span>
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
          <span className="qb-tool-label">{tr('计算结果', 'Result')}</span>
          <CodeBlock code={result.text} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void copyText(result.text, 'CIDR analysis')}
        >
          {tr('复制结果', 'Copy Result')}
        </button>
        {result.info ? (
          <button className="qb-tool-button" type="button" onClick={() => void copyText(result.info.cidr, 'Normalized CIDR')}>
            {tr('复制规范化 CIDR', 'Copy Normalized CIDR')}
          </button>
        ) : null}
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 支持 `192.168.1.0/24` 或 `192.168.1.0 255.255.255.0`。\n- `/31` 和 `/32` 按点到点与单地址处理，不减去网络/广播。\n- 当前版本覆盖 IPv4，适合 VPC、Docker 网段和防火墙规则核对。',
          '- Accepts `192.168.1.0/24` or `192.168.1.0 255.255.255.0`.\n- `/31` and `/32` follow point-to-point and single-host conventions.\n- Covers IPv4 subnets for VPC, Docker networks, and firewall rules.',
        )}
        metadata={[
          { label: tr('协议', 'Protocol'), value: 'IPv4' },
          { label: tr('输入', 'Input'), value: tr('CIDR / 掩码', 'CIDR / Netmask') },
          { label: tr('检测', 'Check'), value: result.contained ? `${tr('包含', 'Match')} = ${result.contained}` : tr('可选', 'Optional') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
