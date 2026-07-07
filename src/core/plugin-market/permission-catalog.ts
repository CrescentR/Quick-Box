/**
 * 插件权限目录 —— 权限标识 → 人类可读名称 + 风险等级 + 说明
 *
 * 第一版只做权限声明和展示，代码结构预留运行时强校验扩展。
 */

import type { PluginPermission } from './plugin-spec'

export type PermissionRisk = 'low' | 'medium' | 'high'

export interface PermissionMeta {
  /** 权限标识 */
  id: PluginPermission
  /** 中文名称 */
  label: string
  /** 说明 */
  description: string
  /** 风险等级 */
  risk: PermissionRisk
}

export const PERMISSION_CATALOG: Record<PluginPermission, PermissionMeta> = {
  'clipboard:read': {
    id: 'clipboard:read',
    label: '读取剪贴板',
    description: '允许插件读取系统剪贴板内容。',
    risk: 'low',
  },
  'clipboard:write': {
    id: 'clipboard:write',
    label: '写入剪贴板',
    description: '允许插件向系统剪贴板写入内容。',
    risk: 'low',
  },
  notification: {
    id: 'notification',
    label: '系统通知',
    description: '允许插件发送桌面通知。',
    risk: 'low',
  },
  storage: {
    id: 'storage',
    label: '本地存储',
    description: '允许插件在用户数据目录读写自己的持久化数据。',
    risk: 'medium',
  },
  'shell:openExternal': {
    id: 'shell:openExternal',
    label: '打开外部链接',
    description: '允许插件通过系统默认浏览器打开外部 URL。',
    risk: 'medium',
  },
  'fs:read': {
    id: 'fs:read',
    label: '读取文件',
    description: '允许插件读取用户选择的文件。',
    risk: 'medium',
  },
  'fs:write': {
    id: 'fs:write',
    label: '写入文件',
    description: '允许插件写入用户选择的文件或路径。',
    risk: 'high',
  },
}

export function getPermissionMeta(permission: string): PermissionMeta | undefined {
  return PERMISSION_CATALOG[permission as PluginPermission]
}

export function getPermissionLabel(permission: string): string {
  return getPermissionMeta(permission)?.label ?? permission
}

export function formatPermissions(permissions: string[]): string {
  if (!permissions.length) return '无额外权限'
  return permissions.map(getPermissionLabel).join('、')
}
