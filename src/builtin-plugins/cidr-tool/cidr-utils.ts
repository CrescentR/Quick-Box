export type CidrInfo = {
  cidr: string
  ip: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  hostCount: number
  totalAddresses: number
  ipInteger: string
  networkInteger: string
  binaryNetmask: string
}

function ipToInt(ip: string) {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error('请输入合法的 IPv4 地址')
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function intToIp(value: number) {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.')
}

function prefixToMask(prefix: number) {
  if (prefix === 0) return 0
  return prefix >= 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0
}

function toBinaryOctets(value: number) {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]
    .map((part) => part.toString(2).padStart(8, '0'))
    .join('.')
}

function maskToPrefix(mask: number) {
  const binary = mask.toString(2).padStart(32, '0')
  if (!/^1*0*$/.test(binary)) throw new Error('子网掩码不是合法的连续 1 位')
  return binary.replace(/0/g, '').length
}

export function parseCidrInput(input: string) {
  const trimmed = input.trim()
  const cidrMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/)
  if (cidrMatch) {
    const prefix = Number(cidrMatch[2])
    if (prefix < 0 || prefix > 32) throw new Error('CIDR 前缀必须在 0 到 32 之间')
    return { ip: cidrMatch[1], prefix }
  }

  const maskMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (maskMatch) {
    return { ip: maskMatch[1], prefix: maskToPrefix(ipToInt(maskMatch[2])) }
  }

  throw new Error('请输入 192.168.1.0/24，或 IP 加子网掩码')
}

export function analyzeCidr(input: string): CidrInfo {
  const { ip, prefix } = parseCidrInput(input)
  const ipInteger = ipToInt(ip)
  const mask = prefixToMask(prefix)
  const network = (ipInteger & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const totalAddresses = 2 ** (32 - prefix)
  const hostCount = prefix >= 31 ? totalAddresses : Math.max(totalAddresses - 2, 0)
  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0

  return {
    cidr: `${intToIp(network)}/${prefix}`,
    ip,
    prefix,
    netmask: intToIp(mask),
    wildcard: intToIp((~mask) >>> 0),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    hostCount,
    totalAddresses,
    ipInteger: String(ipInteger),
    networkInteger: String(network),
    binaryNetmask: toBinaryOctets(mask),
  }
}

export function isIpInCidr(ip: string, cidr: string) {
  const target = ipToInt(ip)
  const info = analyzeCidr(cidr)
  const network = Number(info.networkInteger)
  const mask = prefixToMask(info.prefix)
  return (target & mask) >>> 0 === network
}
