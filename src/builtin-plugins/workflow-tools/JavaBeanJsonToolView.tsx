import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { useToolInput } from '../../core/tool/tool-context'
import { javaBeanToJson, jsonToJavaBean } from './java-bean-json'

const sampleJson = `{
  "id": 1001,
  "userName": "QuickBox",
  "active": true,
  "tags": ["java", "dto"]
}`

const sampleJava = `public class UserDto {
    private Long id;
    private String userName;
    private Boolean active;
    private List<String> tags;
}`

export default function JavaBeanJsonToolView() {
  const tr = useT()
  const locale = useLocale()
  const [mode, setMode] = useState<'json-to-java' | 'java-to-json'>('json-to-java')
  const [jsonInput, setJsonInput] = useToolInput(sampleJson)
  const [javaInput, setJavaInput] = useToolInput(sampleJava, 'java')
  const [className, setClassName] = useState('UserDto')
  const [useLombok, setUseLombok] = useState(true)

  const output = useMemo(
    () => (mode === 'json-to-java' ? jsonToJavaBean(jsonInput, className, useLombok, locale) : javaBeanToJson(javaInput, locale)),
    [className, javaInput, jsonInput, locale, mode, useLombok],
  )
  const isValidJsonOutput = mode === 'java-to-json' && output.startsWith('{')

  return (
    <ToolShell
      title={tr('Java Bean 与 JSON 互转', 'Java Bean <-> JSON')}
      level="L2"
      description={tr(
        '从示例 JSON 推断 Java DTO 类，或从 Java 字段声明生成 JSON 模板。',
        'Infer Java DTO classes from sample JSON or generate JSON templates from Java field declarations.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('转换方向', 'Direction')}</span>
          <select className="qb-tool-input" value={mode} onChange={(e) => setMode(e.target.value as 'json-to-java' | 'java-to-json')}>
            <option value="json-to-java">JSON → Java Bean</option>
            <option value="java-to-json">Java Bean → JSON</option>
          </select>
        </label>
        {mode === 'json-to-java' ? (
          <label className="qb-tool-field">
            <span className="qb-tool-label">{tr('Java 类名', 'Java class name')}</span>
            <input className="qb-tool-input qb-mono" value={className} onChange={(e) => setClassName(e.target.value)} />
          </label>
        ) : null}
        {mode === 'json-to-java' ? (
          <label className="qb-tool-checkbox qb-tool-field--full">
            <input type="checkbox" checked={useLombok} onChange={(e) => setUseLombok(e.target.checked)} />
            <span>{tr('添加 Lombok @Data 注解', 'Include Lombok @Data annotation')}</span>
          </label>
        ) : null}
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'json-to-java' ? tr('JSON 输入', 'JSON input') : tr('Java 类代码', 'Java class code')}</span>
          <textarea
            className="qb-tool-textarea qb-mono"
            value={mode === 'json-to-java' ? jsonInput : javaInput}
            onChange={(e) => (mode === 'json-to-java' ? setJsonInput(e.target.value) : setJavaInput(e.target.value))}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'json-to-java' ? tr('Java Bean 输出', 'Java Bean output') : tr('JSON 模板输出', 'JSON template output')}</span>
          <CodeBlock
            code={output}
            language={mode === 'json-to-java' ? 'java' : 'json'}
            showLineNumbers
            copyable
            resultType={isValidJsonOutput ? 'json' : undefined}
          />
        </div>
      </div>
    </ToolShell>
  )
}
