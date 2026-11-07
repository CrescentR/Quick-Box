import { describe, expect, it } from 'vitest'
import { analyzeCron } from '../src/builtin-plugins/advanced-tools/cron'
import { maskSensitive } from '../src/builtin-plugins/advanced-tools/sensitive-mask'
import { buildClamp } from '../src/builtin-plugins/advanced-tools/css-clamp'
import { formatSql, minifySql } from '../src/builtin-plugins/advanced-tools/sql-formatter'
import { scorePassword } from '../src/builtin-plugins/advanced-tools/password-strength'
import { previewRename } from '../src/builtin-plugins/advanced-tools/batch-rename'
import { analyzeCidr, isIpInCidr, parseCidrInput } from '../src/builtin-plugins/cidr-tool/cidr-utils'
import {
  parseOctalMode,
  parseSymbolicMode,
  permissionsToCommand,
  permissionsToOctal,
  permissionsToSymbolic,
} from '../src/builtin-plugins/chmod-calculator-tool/chmod-utils'

describe('Cron 解释', () => {
  it('逐段描述 5 段表达式', () => {
    expect(analyzeCron('*/5 9-18 * 1,6 1')).toBe(
      ['分钟：每 5 个分钟', '小时：小时范围 9 到 18', '日期：每个日', '月份：月为 1、6', '星期：星期为 1'].join('\n'),
    )
    expect(analyzeCron('* * *')).toMatch(/需要 5 段/)
  })
})

describe('敏感信息脱敏', () => {
  it('遮盖邮箱、手机号、银行卡号和密钥', () => {
    const output = maskSensitive('mail ada@example.com tel 13812345678 card 6222 0212 3456 7890 token=abc123')
    expect(output).toContain('ad***@example.com')
    expect(output).toContain('138****5678')
    expect(output).toContain('6222 **** **** 7890')
    expect(output).toContain('token= ***')
    expect(output).not.toMatch(/abc123|12345678/)
  })
})

describe('CSS clamp', () => {
  it('按视口线性插值字号', () => {
    expect(buildClamp(16, 24, 320, 1280)).toBe('clamp(16px, 13.3333px + 0.8333vw, 24px)')
    expect(buildClamp(16, 24, 800, 800)).toBe('视口宽度不能相同')
  })
})

describe('SQL 格式化', () => {
  it('关键字换行大写，压缩时去掉注释', () => {
    expect(formatSql('select id, name from users where id = 1')).toBe('SELECT id,\n  name \nFROM users \nWHERE id = 1')
    expect(formatSql('   ')).toBe('-- 等待 SQL 输入')
    expect(minifySql('select *  -- all\nfrom t')).toBe('select * from t')
  })
})

describe('密码强度', () => {
  it('按检查项评分', () => {
    expect(JSON.parse(scorePassword('Abcdefgh1234!'))).toMatchObject({ 强度: '强', 分数: '6/6' })
    // 只有小写字母一项通过；连续重复的 aaa 不得分
    expect(JSON.parse(scorePassword('aaa'))).toMatchObject({ 强度: '弱', 分数: '1/6' })
  })
})

describe('批量重命名预演', () => {
  const files = [
    { name: 'IMG_1.jpg', path: '/p/IMG_1.jpg', size: 1 },
    { name: 'IMG_2.jpg', path: '/p/IMG_2.jpg', size: 1 },
    { name: '.env', path: '/p/.env', size: 1 },
  ]

  it('替换、追加日期与序号，保留扩展名', () => {
    const { rows, report } = previewRename(files, '^IMG_\\d+', 'photo', 1, '-', true, '2026-11-08')
    expect(rows.map((row) => row.new_name)).toEqual(['photo-20261108-001.jpg', 'photo-20261108-002.jpg', '.env-20261108-003'])
    expect(report).toBe('预演通过，共 3 个文件')
  })

  it('报告重复目标名和无效正则', () => {
    const twins = [{ ...files[0] }, { ...files[0] }]
    expect(previewRename(twins, '', '', 1, '', false, '').report).toBe('预演通过，共 2 个文件')
    expect(previewRename(files, '(', '', 1, '_', false, '').report).toMatch(/^正则无效/)
  })
})

describe('CIDR 计算', () => {
  it('计算网络、广播、主机范围与数量', () => {
    expect(analyzeCidr('192.168.1.130/26')).toMatchObject({
      cidr: '192.168.1.128/26',
      netmask: '255.255.255.192',
      wildcard: '0.0.0.63',
      broadcast: '192.168.1.191',
      firstHost: '192.168.1.129',
      lastHost: '192.168.1.190',
      hostCount: 62,
    })
    expect(analyzeCidr('10.0.0.1/32')).toMatchObject({ hostCount: 1, firstHost: '10.0.0.1', lastHost: '10.0.0.1' })
    expect(analyzeCidr('0.0.0.0/0').totalAddresses).toBe(2 ** 32)
  })

  it('支持子网掩码写法并拒绝非法输入', () => {
    expect(parseCidrInput('10.1.2.3 255.255.0.0')).toEqual({ ip: '10.1.2.3', prefix: 16 })
    expect(() => parseCidrInput('10.1.2.3 255.0.255.0')).toThrow('连续 1 位')
    expect(() => analyzeCidr('300.1.1.1/24')).toThrow('合法的 IPv4')
    expect(() => parseCidrInput('10.0.0.0/33')).toThrow('0 到 32')
  })

  it('判断 IP 是否在网段内', () => {
    expect(isIpInCidr('172.16.5.4', '172.16.0.0/12')).toBe(true)
    expect(isIpInCidr('172.32.0.1', '172.16.0.0/12')).toBe(false)
  })
})

describe('chmod 计算', () => {
  it('八进制与符号表示互相转换', () => {
    const permissions = parseOctalMode('754')!
    expect(permissionsToSymbolic(permissions)).toBe('rwxr-xr--')
    expect(permissionsToOctal(parseSymbolicMode('rw-r-----')!)).toBe('640')
    expect(permissionsToCommand(permissions, 'run.sh')).toBe('chmod 754 run.sh')
  })

  it('拒绝非法格式', () => {
    expect(parseOctalMode('789')).toBeNull()
    expect(parseOctalMode('7555')).toBeNull()
    expect(parseSymbolicMode('rwxrwxrw')).toBeNull()
  })
})
