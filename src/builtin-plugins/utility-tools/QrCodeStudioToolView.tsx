import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import jsQR from 'jsqr'
import { CodeBlock } from '../../ui'
import { writeClipboardText } from '../../api/clipboard-api'
import { ToolShell } from './ToolShell'
function decodeQrFromFile(file: File) {
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
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        context.drawImage(image, 0, 0)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
        resolve(code?.data ?? '未识别到二维码')
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}

export default function QrCodeStudioToolView() {
  const [value, setValue] = useState('http://127.0.0.1:1420/')
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [decoded, setDecoded] = useState('// 选择二维码图片后显示解码结果')
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
      setDecoded(error instanceof Error ? error.message : '二维码解码失败')
    }
  }

  return (
    <ToolShell title="二维码生成与解码" level="L2" description="生成本地服务 URL 二维码，也可上传图片解析二维码内容。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">二维码内容</span>
          <textarea className="qb-tool-textarea qb-mono" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">纠错等级</span>
          <select className="qb-tool-input" value={level} onChange={(event) => setLevel(event.target.value as 'L' | 'M' | 'Q' | 'H')}>
            <option value="L">L</option>
            <option value="M">M</option>
            <option value="Q">Q</option>
            <option value="H">H</option>
          </select>
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">生成结果</span>
          <div className="qb-tool-qr-preview">
            <QRCodeCanvas ref={canvasRef} value={value || ' '} size={220} level={level} marginSize={2} />
          </div>
        </div>
        <label className="qb-tool-field">
          <span className="qb-tool-label">解码图片</span>
          <input className="qb-tool-input" type="file" accept="image/*" onChange={(event) => void decodeFile(event.target.files?.[0])} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(value)}>
          复制内容
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyQrDataUrl()}>
          复制 PNG Data URL
        </button>
      </div>
    </ToolShell>
  )
}

