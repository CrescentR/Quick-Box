/**
 * 插件包规范 —— plugin.json 类型定义与运行时校验
 *
 * 每个插件 zip 包根目录必须包含 plugin.json，结构如下：
 * {
 *   "id": "com.quickbox.json-formatter",
 *   "name": "JSON 格式化工具",
 *   "version": "1.0.0",
 *   "description": "格式化、压缩并校验 JSON",
 *   "author": "QuickBox",
 *   "icon": "icon.png",
 *   "main": "index.html",
 *   "commands": [...],
 *   "permissions": [...],
 *   "categories": ["developer"]
 * }
 */

/** 插件命令声明 —— 出现在 plugin.json 的 commands 数组中 */
export interface PluginManifestCommand {
  /** 命令代码，插件内唯一，例如 "open" */
  code: string
  /** 命令标题，显示在命令面板 */
  title: string
  /** 命令描述 */
  description?: string
  /** 搜索关键词 */
  keywords?: string[]
}

/** 插件权限标识 */
export type PluginPermission =
  | 'clipboard:read'
  | 'clipboard:write'
  | 'notification'
  | 'storage'
  | 'shell:openExternal'
  | 'fs:read'
  | 'fs:write'

/** 插件分类标识 */
export type PluginCategory =
  | 'developer'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'image'
  | 'ocr'
  | 'ai'
  | 'utility'

/** plugin.json 完整结构 */
export interface PluginManifest {
  /** 插件唯一标识，例如 com.quickbox.json-formatter */
  id: string
  /** 插件名称 */
  name: string
  /** 语义化版本号，例如 1.0.0 */
  version: string
  /** 插件描述 */
  description: string
  /** 作者 */
  author: string
  /** 图标路径（相对于插件根目录） */
  icon?: string
  /** UI 插件入口，例如 index.html。可选，无则纯命令插件 */
  main?: string
  /** 暴露给命令面板的命令列表 */
  commands: PluginManifestCommand[]
  /** 申请的权限列表 */
  permissions: PluginPermission[]
  /** 插件分类 */
  categories: PluginCategory[]
}

// ---------------------------------------------------------------------------
// 运行时校验
// ---------------------------------------------------------------------------

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/

const ALL_PERMISSIONS: PluginPermission[] = [
  'clipboard:read',
  'clipboard:write',
  'notification',
  'storage',
  'shell:openExternal',
  'fs:read',
  'fs:write',
]

export interface ManifestValidationError {
  field: string
  message: string
}

export function validatePluginManifest(
  raw: unknown,
): { ok: true; manifest: PluginManifest } | { ok: false; errors: ManifestValidationError[] } {
  const errors: ManifestValidationError[] = []

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: [{ field: '', message: 'plugin.json 必须是一个 JSON 对象' }] }
  }

  const obj = raw as Record<string, unknown>

  // id
  if (typeof obj.id !== 'string' || !obj.id) {
    errors.push({ field: 'id', message: 'id 为必填字符串' })
  } else if (!PLUGIN_ID_PATTERN.test(obj.id)) {
    errors.push({
      field: 'id',
      message: 'id 必须是反向域名格式，例如 com.quickbox.json-formatter',
    })
  }

  // name
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    errors.push({ field: 'name', message: 'name 为必填非空字符串' })
  }

  // version
  if (typeof obj.version !== 'string' || !obj.version) {
    errors.push({ field: 'version', message: 'version 为必填字符串' })
  } else if (!SEMVER_PATTERN.test(obj.version)) {
    errors.push({ field: 'version', message: 'version 必须符合语义化版本号规范，例如 1.0.0' })
  }

  // description
  if (typeof obj.description !== 'string') {
    errors.push({ field: 'description', message: 'description 为必填字符串' })
  }

  // author
  if (typeof obj.author !== 'string') {
    errors.push({ field: 'author', message: 'author 为必填字符串' })
  }

  // icon (可选)
  if (obj.icon !== undefined && typeof obj.icon !== 'string') {
    errors.push({ field: 'icon', message: 'icon 必须是字符串（文件路径）' })
  }

  // main (可选)
  if (obj.main !== undefined && typeof obj.main !== 'string') {
    errors.push({ field: 'main', message: 'main 必须是字符串（HTML 入口路径）' })
  }

  // commands
  if (!Array.isArray(obj.commands)) {
    errors.push({ field: 'commands', message: 'commands 为必填数组' })
  } else {
    obj.commands.forEach((cmd, i) => {
      if (!cmd || typeof cmd !== 'object') {
        errors.push({ field: `commands[${i}]`, message: '命令必须是一个对象' })
        return
      }
      const c = cmd as Record<string, unknown>
      if (typeof c.code !== 'string' || !c.code) {
        errors.push({ field: `commands[${i}].code`, message: 'code 为必填字符串' })
      }
      if (typeof c.title !== 'string' || !c.title.trim()) {
        errors.push({ field: `commands[${i}].title`, message: 'title 为必填非空字符串' })
      }
      if (c.description !== undefined && typeof c.description !== 'string') {
        errors.push({ field: `commands[${i}].description`, message: 'description 必须是字符串' })
      }
      if (c.keywords !== undefined) {
        if (!Array.isArray(c.keywords) || c.keywords.some((k) => typeof k !== 'string')) {
          errors.push({ field: `commands[${i}].keywords`, message: 'keywords 必须是字符串数组' })
        }
      }
    })
  }

  // permissions
  if (!Array.isArray(obj.permissions)) {
    errors.push({ field: 'permissions', message: 'permissions 为必填数组（可为空）' })
  } else {
    obj.permissions.forEach((p, i) => {
      if (typeof p !== 'string' || !ALL_PERMISSIONS.includes(p as PluginPermission)) {
        errors.push({
          field: `permissions[${i}]`,
          message: `未知权限 "${p}"，合法值：${ALL_PERMISSIONS.join(', ')}`,
        })
      }
    })
  }

  // categories
  if (!Array.isArray(obj.categories)) {
    errors.push({ field: 'categories', message: 'categories 为必填数组' })
  } else if (obj.categories.length === 0) {
    errors.push({ field: 'categories', message: 'categories 至少包含一个分类' })
  } else {
    obj.categories.forEach((c, i) => {
      if (typeof c !== 'string' || !c.trim()) {
        errors.push({ field: `categories[${i}]`, message: '分类必须是非空字符串' })
      }
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, manifest: obj as unknown as PluginManifest }
}
