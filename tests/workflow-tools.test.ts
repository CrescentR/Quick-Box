import { describe, expect, it } from 'vitest'
import { uniqueLines } from '../src/builtin-plugins/workflow-tools/shared'
import { fromJsonStringLiteral, toJsonStringLiteral } from '../src/builtin-plugins/workflow-tools/json-string'
import { cleanText } from '../src/builtin-plugins/workflow-tools/text-cleaner'
import { replaceWithRegex } from '../src/builtin-plugins/workflow-tools/regex-replace'
import { csvToJson, parseCsv } from '../src/builtin-plugins/workflow-tools/csv-to-json'
import { csvEscape, jsonToCsv } from '../src/builtin-plugins/workflow-tools/json-to-csv'
import { jsonToRust, toPascalCase, toSnakeCase } from '../src/builtin-plugins/workflow-tools/json-to-rust'
import { javaBeanToJson, jsonToJavaBean } from '../src/builtin-plugins/workflow-tools/java-bean-json'
import { generateSqlMock, parseMockColumns } from '../src/builtin-plugins/workflow-tools/sql-mock'
import { evaluateJsonPath, parseJsonPath } from '../src/builtin-plugins/workflow-tools/json-path'
import { curlToFetch, fetchToCurl, tokenizeShellLike } from '../src/builtin-plugins/workflow-tools/curl-fetch'
import { parseEnvText, unquoteEnvValue } from '../src/builtin-plugins/workflow-tools/env-parser'
import { analyzeSemver, parseSemver } from '../src/builtin-plugins/workflow-tools/semver-helper'

describe('文本处理', () => {
  it('按行去重：默认忽略大小写，可排序并统计重复', () => {
    const result = uniqueLines('b\na\nB\n\na', false, true)
    expect(result.output).toBe('a\nb')
    expect(JSON.parse(result.report)).toEqual({ 原始行数: 4, 去重后行数: 2, 重复行数: 2 })
    expect(uniqueLines('b\nB', true, false).output).toBe('b\nB')
  })

  it('清洗行尾空格、合并连续空白并删除空行', () => {
    expect(cleanText('  a   b  \n\n c\t\td ', true, true, true)).toBe('a b\nc d')
    expect(cleanText('  a  \n', false, false, false)).toBe('  a\n')
  })

  it('JSON 字符串字面量往返转换，非字符串给出提示', () => {
    const literal = toJsonStringLiteral('line "1"\n')
    expect(literal).toBe('"line \\"1\\"\\n"')
    expect(fromJsonStringLiteral(literal)).toBe('line "1"\n')
    expect(fromJsonStringLiteral('42')).toBe('输入不是 JSON 字符串字面量')
  })

  it('正则替换：清理非法 flags、统计匹配并在正则无效时保留原文', () => {
    expect(replaceWithRegex('a1b22', '\\d+', 'gxx', '#')).toEqual({ output: 'a#b#', report: '匹配 2 处，flags=g' })
    const invalid = replaceWithRegex('abc', '(', 'g', '')
    expect(invalid.output).toBe('abc')
    expect(invalid.report).toMatch(/^正则无效/)
  })
})

describe('CSV 与 JSON 互转', () => {
  it('解析引号、转义引号、引号内换行与 CRLF', () => {
    expect(parseCsv('name,note\r\n"Ada","say ""hi""\nthere"\n\n', ',')).toEqual([
      ['name', 'note'],
      ['Ada', 'say "hi"\nthere'],
    ])
  })

  it('首行作为表头，空表头用列序号补齐', () => {
    expect(JSON.parse(csvToJson('id,\n1,x\n2', ',', true))).toEqual([
      { id: '1', column_2: 'x' },
      { id: '2', column_2: '' },
    ])
    expect(JSON.parse(csvToJson('a;b', ';', false))).toEqual([['a', 'b']])
    expect(csvToJson('', ',', true)).toBe('[]')
  })

  it('JSON 转 CSV：合并表头、展开嵌套对象并转义特殊字符', () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""')
    expect(jsonToCsv('[{"id":1,"meta":{"tag":"x,y"}},{"id":2,"extra":true}]', true)).toBe(
      'id,meta.tag,extra\n1,"x,y",\n2,,true',
    )
    expect(jsonToCsv('[1,2]', true)).toBe('JSON 需要是对象或对象数组')
  })
})

describe('JSON 转 Rust 结构体与 Java Bean 互转', () => {
  it('转换命名风格', () => {
    expect(toPascalCase('user-profile_item')).toBe('UserProfileItem')
    expect(toSnakeCase('userName')).toBe('user_name')
  })

  it('为嵌套对象生成多个 serde 结构体', () => {
    const output = jsonToRust('{"userName":"Ada","age":3,"profile":{"active":true}}', 'Root')
    expect(output).toContain('pub struct Root')
    expect(output).toContain('pub struct RootProfile')
    expect(output).toContain('#[serde(rename = "userName")]\n    pub user_name: String,')
    expect(output).toContain('pub profile: RootProfile,')
    expect(output).toContain('pub active: bool,')
  })

  it('JSON 与 Java Bean 双向转换', () => {
    const javaCode = jsonToJavaBean('{"user_id":1,"tags":["a"],"meta":{"enabled":true}}', 'UserDto', true)
    expect(javaCode).toContain('import lombok.Data;')
    expect(javaCode).toContain('import java.util.List;')
    expect(javaCode).toContain('public class UserDto')
    expect(javaCode).toContain('private Long userId;')
    expect(javaCode).toContain('private List<String> tags;')
    expect(javaCode).toContain('public static class UserDtoMeta')

    const jsonTemplate = javaBeanToJson(
      'public class User { private Long id; private String userName; private Boolean active; private List<String> roles; }',
    )
    expect(JSON.parse(jsonTemplate)).toEqual({
      id: 0,
      userName: '',
      active: false,
      roles: [''],
    })
  })
})

describe('SQL Mock 生成', () => {
  it('解析字段定义并生成多行 INSERT 语句', () => {
    expect(parseMockColumns('id:id\nuser_name VARCHAR(64)')).toEqual([
      { name: 'id', type: 'id' },
      { name: 'user_name', type: 'varchar(64)' },
    ])
    const sql = generateSqlMock('sys_user', 'id:id\nemail:email\nactive:bool', 2)
    expect(sql).toContain('INSERT INTO sys_user (id, email, active)')
    expect(sql).toContain("(1, 'user1@example.com', TRUE)")
    expect(sql).toContain("(2, 'user2@example.com', FALSE);")
    expect(generateSqlMock('123bad', 'id:id', 1)).toMatch(/合法的表名/)
  })
})

describe('JSONPath', () => {
  const data = JSON.stringify({ users: [{ name: 'Ada', tags: ['a'] }, { name: 'Lin', tags: [] }], 'odd key': 1 })

  it('解析点路径、下标、通配符和带引号的字段', () => {
    expect(parseJsonPath("$.users[0]['odd key'].*")).toEqual([
      { type: 'key', value: 'users' },
      { type: 'index', value: 0 },
      { type: 'key', value: 'odd key' },
      { type: 'wildcard' },
    ])
    expect(() => parseJsonPath('$.users[0')).toThrow('方括号没有闭合')
  })

  it('返回匹配数量与结果，非法路径返回错误信息', () => {
    expect(JSON.parse(evaluateJsonPath(data, '$.users[*].name'))).toEqual({ count: 2, values: ['Ada', 'Lin'] })
    expect(JSON.parse(evaluateJsonPath(data, '$["odd key"]'))).toEqual({ count: 1, values: [1] })
    expect(JSON.parse(evaluateJsonPath(data, '$.missing'))).toEqual({ count: 0, values: [] })
    expect(evaluateJsonPath(data, '$.users!')).toBe('不支持的路径字符：!')
  })
})

describe('cURL 与 fetch 互转', () => {
  it('按 shell 规则拆分引号与转义', () => {
    expect(tokenizeShellLike(`curl 'a b' "c\\"d" e\\ f`)).toEqual(['curl', 'a b', 'c"d', 'e f'])
  })

  it('cURL 转 fetch：识别方法、请求头、请求体和续行符', () => {
    const output = curlToFetch(`curl https://api.test/x \\\n -H 'Content-Type: application/json' --data-raw '{"a":1}'`)
    expect(output).toContain('fetch("https://api.test/x"')
    expect(output).toContain("method: 'POST'")
    expect(output).toContain('"Content-Type": "application/json"')
    expect(output).toContain('body: "{\\"a\\":1}"')
    expect(curlToFetch('wget x')).toBe('请输入以 curl 开头的命令')
    expect(curlToFetch('curl -X GET')).toBe('未找到请求 URL')
  })

  it('fetch 转 cURL', () => {
    const output = fetchToCurl(`fetch('https://api.test/x', { method: 'put', headers: { 'X-Id': '7' }, body: JSON.stringify({ a: 1 }) })`)
    expect(output.split(' \\\n')).toEqual([
      'curl "https://api.test/x"',
      '  -X PUT',
      '  -H "X-Id: 7"',
      '  --data-raw "{ a: 1 }"',
    ])
    expect(fetchToCurl('nothing')).toBe('未找到 fetch URL')
  })
})

describe('.env 解析', () => {
  it('处理引号、转义、行内注释和 export 前缀', () => {
    expect(unquoteEnvValue('"a\\nb"')).toBe('a\nb')
    expect(unquoteEnvValue("'raw\\n'")).toBe('raw\\n')
    expect(unquoteEnvValue('value # comment')).toBe('value')
  })

  it('统计注释、空行并报告非法行', () => {
    const result = parseEnvText('# c\n\nexport A=1\nB="x y"\n1BAD=2\nnoequals')
    expect(JSON.parse(result.json)).toEqual({ A: '1', B: 'x y' })
    expect(result.table).toBe('A=1\nB=x y')
    const report = JSON.parse(result.report)
    expect(report).toMatchObject({ validEntries: 2, commentLines: 1, blankLines: 1, issueCount: 2 })
    expect(report.issues.map((issue: { line: number }) => issue.line)).toEqual([5, 6])
  })
})

describe('SemVer', () => {
  it('解析带 v 前缀、预发布和构建信息的版本', () => {
    expect(parseSemver('v1.2.3-beta.1+build.7')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: 'beta.1', build: 'build.7' })
    expect(parseSemver('01.2.3')).toBeNull()
  })

  it('计算下一个版本号', () => {
    const output = JSON.parse(analyzeSemver('1.2.3-rc.2').output)
    expect(output.next).toEqual({ major: '2.0.0', minor: '1.3.0', patch: '1.2.4', release: '1.2.3', prereleaseRc: '1.2.3-rc.1' })
    expect(JSON.parse(analyzeSemver('x').output)).toEqual({ valid: false })
  })
})
