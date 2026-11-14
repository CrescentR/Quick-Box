import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { propertiesToYaml, yamlToProperties } from './yaml-properties-utils'
import { ToolShell } from '../../core/tool/ToolShell'

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
  const tr = useT()
  const [direction, setDirection] = useState<ConvertDirection>('yaml-to-properties')
  const [input, setInput] = useState(sampleYaml)
  const { copyText, clipboardToast } = useClipboardToast()

  const output = useMemo(() => {
    try {
      return direction === 'yaml-to-properties' ? yamlToProperties(input) : propertiesToYaml(input)
    } catch (error) {
      return error instanceof Error ? error.message : tr('转换失败', 'Conversion failed')
    }
  }, [direction, input, tr])

  const switchDirection = (next: ConvertDirection) => {
    setDirection(next)
    setInput(next === 'yaml-to-properties' ? sampleYaml : sampleProperties)
  }

  return (
    <ToolShell
      title={tr('YAML / Properties 互转', 'YAML / Properties Converter')}
      description={tr(
        '把嵌套 YAML 转成 Spring 风格的点分 properties，也可以把 properties 还原成缩进 YAML。',
        'Convert nested YAML into Spring-style dot-separated properties or restore properties back into indented YAML.',
      )}
      badge={direction === 'yaml-to-properties' ? 'YAML → Properties' : 'Properties → YAML'}
    >
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
          {tr('复制结果', 'Copy result')}
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
            code={output || tr('// 转换结果为空', '// Empty conversion output')}
            language={direction === 'yaml-to-properties' ? 'properties' : 'yaml'}
            wrap
            copyable
          />
        </div>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 面向 Spring Boot 常见的 application.yml / application.properties。\n- 嵌套对象会展开成 `server.port` 这类点分键。\n- YAML 列表会转成 `app.features[0]` 索引写法。\n- 支持注释、布尔值、数字和普通标量；不覆盖 YAML 锚点、多文档和复杂 flow 语法。',
          '- Built for Spring Boot application.yml and application.properties files.\n- Nested objects flatten into dotted keys like `server.port`.\n- YAML lists convert to indexed keys like `app.features[0]`.\n- Supports comments, booleans, numbers, and scalars (excludes anchors, multi-docs, and complex flow syntax).',
        )}
        metadata={[
          { label: tr('方向', 'Direction'), value: tr('双向', 'Bidirectional') },
          { label: tr('列表', 'Lists'), value: tr('索引键 [0] / [1]', 'Indexed keys [0] / [1]') },
          { label: tr('场景', 'Use case'), value: tr('Spring 配置互转', 'Spring config conversion') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
