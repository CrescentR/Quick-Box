import { ToolShell } from '../../core/tool/ToolShell'
import { useState } from 'react'
import { lt, useT } from '../../i18n'
import { CodeBlock } from '../../ui'

type FileHashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

function rotateLeft(value: number, count: number) {
  return (value << count) | (value >>> (32 - count))
}

function md5WordToHex(value: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0'))
    .join('')
}

function md5ArrayBuffer(buffer: ArrayBuffer) {
  const input = new Uint8Array(buffer)
  const paddedLength = (((input.length + 1 + 8 + 63) / 64) | 0) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(input)
  padded[input.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, (input.length * 8) >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(input.length / 0x20000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true))
    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let wordIndex = 0

      if (index < 16) {
        f = (b & c) | (~b & d)
        wordIndex = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        wordIndex = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        wordIndex = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        wordIndex = (7 * index) % 16
      }

      const shift = shifts[Math.floor(index / 16) * 4 + (index % 4)]
      const next = d
      d = c
      c = b
      b = (b + rotateLeft((a + f + constants[index] + words[wordIndex]) >>> 0, shift)) >>> 0
      a = next
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return [a0, b0, c0, d0].map(md5WordToHex).join('')
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function hashFile(file: File, algorithm: FileHashAlgorithm) {
  if (file.size > 32 * 1024 * 1024) throw new Error(lt('当前浏览器哈希工具限制为 32 MB，请选择更小文件。', 'Browser file hashing is limited to 32 MB. Please choose a smaller file.'))
  const buffer = await file.arrayBuffer()
  if (algorithm === 'MD5') return md5ArrayBuffer(buffer)
  const digest = await crypto.subtle.digest(algorithm, buffer)
  return arrayBufferToHex(digest)
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${Number(value.toFixed(unitIndex === 0 ? 0 : 2))} ${units[unitIndex]}`
}

export default function FileHashToolView() {
  const tr = useT()
  const [algorithm, setAlgorithm] = useState<FileHashAlgorithm>('SHA-256')
  const [expectedHash, setExpectedHash] = useState('')
  const [result, setResult] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const calculateHash = async () => {
    if (!selectedFile) {
      setResult(lt('请先选择文件', 'Please select a file first'))
      return
    }

    try {
      const hash = await hashFile(selectedFile, algorithm)
      const normalizedExpected = expectedHash.trim().toLowerCase()
      const matches = normalizedExpected ? hash === normalizedExpected : null
      setResult(
        JSON.stringify(
          {
            file: {
              name: selectedFile.name,
              size: selectedFile.size,
              readableSize: formatBytes(selectedFile.size),
              lastModified: new Date(selectedFile.lastModified).toISOString(),
            },
            algorithm,
            hash,
            expectedHash: normalizedExpected || null,
            matches,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      setResult(error instanceof Error ? error.message : lt('文件哈希计算失败', 'Failed to compute file hash'))
    }
  }

  return (
    <ToolShell
      title={tr('文件哈希校验器', 'File Hash Checksum')}
      level="L1"
      description={tr('对本地文件计算 MD5、SHA1、SHA256 或 SHA512，并可与期望值比对。', 'Calculate MD5, SHA-1, SHA-256, or SHA-512 checksums for local files and verify against an expected hash.')}
      notes={tr(
        '- 文件只在本地浏览器上下文读取，不会上传。\n- 当前版本一次读取整个文件，超大文件后续可升级为分块计算。',
        '- Files are read strictly in your local browser context and never uploaded.\n- Currently reads the whole file at once (32 MB cap).',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('文件', 'File')}</span>
          <input className="qb-tool-input" type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('算法', 'Algorithm')}</span>
          <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as FileHashAlgorithm)}>
            <option value="MD5">MD5</option>
            <option value="SHA-1">SHA1</option>
            <option value="SHA-256">SHA256</option>
            <option value="SHA-512">SHA512</option>
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('期望哈希，可留空', 'Expected Hash (optional)')}</span>
          <input className="qb-tool-input qb-mono" value={expectedHash} onChange={(event) => setExpectedHash(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('结果', 'Result')}</span>
          <CodeBlock code={result || tr('// 选择文件后点击计算', '// Select a file and click Calculate')} language={result.trim().startsWith('{') ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void calculateHash()} disabled={!selectedFile}>
          {tr('计算哈希', 'Calculate Hash')}
        </button>
      </div>
    </ToolShell>
  )
}
