import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import { propertiesToYaml, yamlToProperties } from './yaml-properties-utils'

type ConvertDirection = 'yaml-to-properties' | 'properties-to-yaml'

const sampleYaml = `server:
  port: 8080
  servlet:
    context-path: /api
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/quickbox
    username: app
app:
  debug: true
  features:
    - search
    - clipboard`

const sampleProperties = `server.port=8080
server.servlet.context-path=/api
spring.datasource.url=jdbc:postgresql://localhost:5432/quickbox
spring.datasource.username=app
app.debug=true
app.features[0]=search
app.features[1]=clipboard`

export default function YamlPropertiesToolView() {
  const [direction, setDirection] = useState<ConvertDirection>('yaml-to-properties')
  const [input, setInput] = useState(sampleYaml)
  const { copyText, clipboardToast } = useClipboardToast()

  const output = useMemo(() => {
    try {
      return direction === 'yaml-to-properties' ? yamlToProperties(input) : propertiesToYaml(input)
    } catch (error) {
      return error instanceof Error ? error.message : '转换失败'
    }
  }, [direction, input])

  const switchDirection = (next: ConvertDirection) => {
    setDirection(next)
    setInput(next === 'yaml-to-properties' ? sampleYaml : sampleProperties)
  }

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">YAML / Properties 互转</div>
          <div className="qb-tool-view__description">
            把嵌套 YAML 转成 Spring 风格的点分 properties，也可以把 properties 还原成缩进 YAML。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{direction === 'yaml-to-properties' ? 'YAML → Properties' : 'Properties → YAML'}</Tag>
        </div>
      </header>

      <div className="qb-tool-actions">
        <button
          className={`qb-tool-button${direction === 'yaml-to-properties' ? ' qb-tool-button--primary' : ''}`}
          type="button"
          onClick={() => switchDirection('yaml-to-properties')}
        >
          YAML → Properties
        </button>
        <button
          className={`qb-tool-button${direction === 'properties-to-yaml' ? ' qb-tool-button--primary' : ''}`}
          type="button"
          onClick={() => switchDirection('properties-to-yaml')}
        >
          Properties → YAML
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(output, 'Converted config')}>
          复制结果
        </button>
      </div>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{direction === 'yaml-to-properties' ? 'YAML' : 'Properties'}</span>
          <textarea
            id="yaml-properties-input"
            name="yaml-properties-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{direction === 'yaml-to-properties' ? 'Properties' : 'YAML'}</span>
          <CodeBlock
            code={output || '// 转换结果为空'}
            language={direction === 'yaml-to-properties' ? 'properties' : 'yaml'}
            wrap
            copyable
          />
        </div>
      </div>

      <Detail
        title="使用说明"
        markdown="- 面向 Spring Boot 常见的 application.yml / application.properties。\n- 嵌套对象会展开成 `server.port` 这类点分键。\n- YAML 列表会转成 `app.features[0]` 索引写法。\n- 支持注释、布尔值、数字和普通标量；不覆盖 YAML 锚点、多文档和复杂 flow 语法。"
        metadata={[
          { label: '方向', value: '双向' },
          { label: '列表', value: '索引键 [0] / [1]' },
          { label: '场景', value: 'Spring 配置互转' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
