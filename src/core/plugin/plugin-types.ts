import type { ComponentType } from 'react'
import type { Command } from '../command/command-types'
import type { PluginPermission } from './permission-types'

export type PluginSource = 'builtin' | 'local' | 'market'

export interface PluginViewProps {
  params?: Record<string, unknown>
}

export interface PluginView {
  id: string
  title: string
  component: ComponentType<PluginViewProps>
}

export interface ToolPlugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  source: PluginSource
  permissions: PluginPermission[]
  commands: Command[]
  views?: PluginView[]
}
