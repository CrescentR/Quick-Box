import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { CodeBlock } from '../../ui'
import { writeClipboardText } from '../../api/clipboard-api'
import { ToolShell } from '../../core/tool/ToolShell'
import { lt, useT } from '../../i18n'
// jsQR 约 130 KB，只有识别图片时才用到，按需加载，打开工具时只加载生成二维码的部分。
async function decodeQrFromFile(file: File) {
  const { default: jsQR } = await import('jsqr')
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error(lt('无法创建 Canvas 上下文', 'Failed to create Canvas 2D context')))
          return
        }

        context.drawImage(image, 0, 0)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
        resolve(code?.data ?? lt('未识别到二维码', 'No QR code detected'))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(lt('图片加载失败', 'Failed to load image')))
    }
    image.src = url
  })
}

export default function QrCodeStudioToolView() {
  const tr = useT()
  const [value, setValue] = useState('http://127.0.0.1:1420/')
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [decoded, setDecoded] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const copyQrDataUrl = async () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? ''
    await writeClipboardText(dataUrl)
  }

  const decodeFile = async (file?: File) => {
    if (!file) return
    try {
      setDecoded(await decodeQrFromFile(file))
    } catch (error) {
      setDecoded(error instanceof Error ? error.message : lt('二维码解码失败', 'Failed to decode QR code'))
    }
  }

  return (
    <ToolShell
      title={tr('二维码生成与解码', 'QR Code Generator & Decoder')}
      level="L2"
      description={tr('生成本地服务 URL 二维码，也可上传图片解析二维码内容。', 'Generate QR codes for local URLs or decode QR codes from uploaded images.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('二维码内容', 'QR Content')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('纠错等级', 'Error Correction')}</span>
          <select className="qb-tool-input" value={level} onChange={(event) => setLevel(event.target.value as 'L' | 'M' | 'Q' | 'H')}>
            <option value="L">L</option>
            <option value="M">M</option>
            <option value="Q">Q</option>
            <option value="H">H</option>
          </select>
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('生成结果', 'Generated QR Code')}</span>
          <div className="qb-tool-qr-preview">
            <QRCodeCanvas ref={canvasRef} value={value || ' '} size={220} level={level} marginSize={2} />
          </div>
        </div>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('解码图片', 'Decode Image')}</span>
          <input className="qb-tool-input" type="file" accept="image/*" onChange={(event) => void decodeFile(event.target.files?.[0])} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('解码结果', 'Decoded Result')}</span>
          <CodeBlock code={decoded || tr('// 选择二维码图片后显示解码结果', '// Select a QR image to display decoded text')} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(value)}>
          {tr('复制内容', 'Copy Content')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyQrDataUrl()}>
          {tr('复制 PNG Data URL', 'Copy PNG Data URL')}
        </button>
      </div>
    </ToolShell>
  )
}

