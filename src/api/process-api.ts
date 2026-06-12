import { invokeCommand } from './tauri-api'

export interface PortOccupant {
  pid: number
  processName: string
  protocol: string
  localAddress: string
  state?: string
}

export interface PortKillFailure {
  pid: number
  message: string
}

export interface PortKillResult {
  port: number
  killedPids: number[]
  failedPids: PortKillFailure[]
}

export function scanPortOccupants(port: number) {
  return invokeCommand<PortOccupant[]>('scan_port_occupants', { port })
}

export function killPortOccupants(port: number, pids?: number[]) {
  return invokeCommand<PortKillResult>('kill_port_occupants', { port, pids })
}
