import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock } from '../../ui'

type PlaceholderMode = 'latin' | 'chinese'

const latinWords = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'integer',
  'facilisis',
  'nunc',
  'vitae',
  'semper',
  'porta',
  'mauris',
  'fermentum',
  'rhoncus',
  'tellus',
  'vel',
  'finibus',
]

const chineseWords = [
  '工具',
  '窗口',
  '命令',
  '数据',
  '调试',
  '配置',
  '流程',
  '面板',
  '本地',
  '快速',
  '清晰',
  '稳定',
  '输入',
  '输出',
  '预览',
  '复制',
  '生成',
  '检查',
  '转换',
  '记录',
]

function buildPlaceholderText(mode: PlaceholderMode, paragraphs: number, wordsPerParagraph: number) {
  const wordList = mode === 'latin' ? latinWords : chineseWords
  const safeParagraphs = Math.max(1, Math.min(20, Math.floor(paragraphs)))
  const safeWords = Math.max(1, Math.min(300, Math.floor(wordsPerParagraph)))
  const lines = Array.from({ length: safeParagraphs }, (_, paragraphIndex) => {
    const words = Array.from({ length: safeWords }, (_, wordIndex) => wordList[(paragraphIndex * 7 + wordIndex) % wordList.length])
    if (mode === 'chinese') {
      return `${words.join('')}。`
    }
    const sentence = words.join(' ')
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
  })
  return lines.join('\n\n')
}

export default function LoremIpsumToolView() {
  const [mode, setMode] = useState<PlaceholderMode>('latin')
  const [paragraphs, setParagraphs] = useState(2)
  const [wordsPerParagraph, setWordsPerParagraph] = useState(48)
  const output = useMemo(() => buildPlaceholderText(mode, paragraphs, wordsPerParagraph), [mode, paragraphs, wordsPerParagraph])

  return (
    <ToolShell title="占位文本生成器" level="L1" description="生成拉丁或中文占位文本，用于原型、静态页面和排版测试。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">文本类型</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as PlaceholderMode)}>
            <option value="latin">Lorem Ipsum</option>
            <option value="chinese">中文假文</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">段落数</span>
          <input className="qb-tool-input" type="number" min={1} max={20} value={paragraphs} onChange={(event) => setParagraphs(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">每段词数</span>
          <input
            className="qb-tool-input"
            type="number"
            min={1}
            max={300}
            value={wordsPerParagraph}
            onChange={(event) => setWordsPerParagraph(Number(event.target.value))}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">生成结果</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)}>
          复制占位文本
        </button>
      </div>
    </ToolShell>
  )
}
