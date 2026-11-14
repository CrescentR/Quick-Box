import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

function parseMongoObjectId(value: string, locale: ResolvedLocale) {
  const normalized = value.trim()

  if (!/^[0-9a-fA-F]{24}$/.test(normalized)) {
    return JSON.stringify(
      {
        valid: false,
        message: lt('ObjectId 必须是 24 位十六进制字符串', 'ObjectId must be a 24-character hexadecimal string', locale),
      },
      null,
      2,
    )
  }

  const timestampSeconds = Number.parseInt(normalized.slice(0, 8), 16)
  const createdAt = new Date(timestampSeconds * 1000)
  const randomValue = normalized.slice(8, 18)
  const counterHex = normalized.slice(18, 24)
  const counter = Number.parseInt(counterHex, 16)

  return JSON.stringify(
    {
      valid: true,
      objectId: normalized.toLowerCase(),
      timestamp: {
        seconds: timestampSeconds,
        iso: createdAt.toISOString(),
        local: createdAt.toLocaleString(),
      },
      randomValue,
      counter: {
        hex: counterHex.toLowerCase(),
        decimal: counter,
      },
    },
    null,
    2,
  )
}

export default function MongoObjectIdToolView() {
  const tr = useT()
  const locale = useLocale()
  const [objectId, setObjectId] = useState('6650f5a80000000000000001')
  const output = useMemo(() => parseMongoObjectId(objectId, locale), [locale, objectId])

  return (
    <ToolShell
      title={tr('Mongo ObjectId 解析器', 'Mongo ObjectId Inspector')}
      level="L1"
      description={tr('解析 MongoDB ObjectId 中携带的创建时间、随机段和计数器，适合快速排查数据时间线。', 'Decode the creation timestamp, random value, and counter embedded inside a MongoDB ObjectId.')}
      notes={tr(
        '- ObjectId 的前 4 字节是 Unix 秒级时间戳。\n- 中间 5 字节和最后 3 字节分别用于随机值和计数器。\n- 该工具只做本地解析，不连接数据库。',
        '- First 4 bytes store the Unix epoch timestamp in seconds.\n- Middle 5 bytes and last 3 bytes encode the random value and counter.\n- Runs locally without connecting to any database.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">ObjectId</span>
          <input
            className="qb-tool-input qb-mono"
            value={objectId}
            onChange={(event) => setObjectId(event.target.value)}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('解析结果', 'Decoded Result')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
