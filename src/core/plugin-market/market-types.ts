/**
 * 远程插件市场索引 (plugins.json) 类型定义
 *
 * plugins.json 结构：
 * {
 *   "version": "1.0.0",
 *   "updatedAt": "2025-01-01T00:00:00Z",
 *   "plugins": [ { ...MarketPluginItem }, ... ]
 * }
 */

import type { PluginCategory, PluginPermission } from './plugin-spec'

/** 市场索引中的单个插件条目 */
export interface MarketPluginItem {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 语义化版本号 */
  version: string
  /** 插件描述 */
  description: string
  /** 作者 */
  author: string
  /** 图标 URL（相对于市场源或绝对 URL） */
  icon?: string
  /** 分类列表 */
  categories: PluginCategory[]
  /** zip 包下载地址 */
  downloadUrl: string
  /** zip 包 SHA-256 校验值（小写十六进制） */
  sha256: string
  /** zip 包字节数 */
  size: number
  /** 创建时间 ISO 8601 */
  createdAt: string
  /** 更新时间 ISO 8601 */
  updatedAt: string
  /** 权限声明（可选，若缺失则安装时从包内 plugin.json 读取） */
  permissions?: PluginPermission[]
}

/** 完整的市场索引文件 */
export interface MarketIndex {
  /** 索引格式版本 */
  version: string
  /** 索引更新时间 */
  updatedAt: string
  /** 插件列表 */
  plugins: MarketPluginItem[]
}

// ---------------------------------------------------------------------------
// 本地安装记录（对应 SQLite installed_plugins 表）
// ---------------------------------------------------------------------------

/** 已安装插件记录 */
export interface InstalledPlugin {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 已安装版本 */
  version: string
  /** 插件安装路径（版本目录） */
  path: string
  /** 是否启用 */
  enabled: boolean
  /** 安装时间 ISO 8601 */
  installedAt: string
  /** 更新时间 ISO 8601 */
  updatedAt: string
  /** 从包内 plugin.json 读取的完整清单 */
  manifest: {
    id: string
    name: string
    version: string
    description: string
    author: string
    icon?: string
    main?: string
    commands: Array<{
      code: string
      title: string
      description?: string
      keywords?: string[]
    }>
    permissions: string[]
    categories: string[]
  }
}

/** 市场插件状态（UI 层用于决定显示哪个按钮） */
export type MarketPluginStatus =
  | 'not-installed'
  | 'installed'
  | 'updatable'
  | 'disabled'

/** 合并市场条目与本地安装信息后的展示模型 */
export interface MarketPluginView extends MarketPluginItem {
  /** 安装状态 */
  status: MarketPluginStatus
  /** 本地已安装版本（若已安装） */
  installedVersion?: string
  /** 是否已启用 */
  enabled: boolean
}
