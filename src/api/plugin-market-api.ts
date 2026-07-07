/**
 * 插件市场 Tauri 命令封装
 *
 * 所有命令在 Tauri 运行时调用 Rust 后端；
 * 在浏览器预览模式下走 tauri-api.ts 中的 localStorage 桩。
 */

import type { InstalledPlugin, MarketIndex } from '../core/plugin-market/market-types'
import { invokeCommand } from './tauri-api'

// ---------------------------------------------------------------------------
// 市场源配置
// ---------------------------------------------------------------------------

export function getMarketSourceUrl() {
  return invokeCommand<string>('get_market_source_url')
}

export function setMarketSourceUrl(url: string) {
  return invokeCommand<void>('set_market_source_url', { url })
}

// ---------------------------------------------------------------------------
// 市场索引
// ---------------------------------------------------------------------------

export function fetchMarketIndex(url?: string) {
  return invokeCommand<MarketIndex>('fetch_market_index', { url })
}

// ---------------------------------------------------------------------------
// 已安装插件
// ---------------------------------------------------------------------------

export function loadInstalledPlugins() {
  return invokeCommand<InstalledPlugin[]>('load_installed_plugins')
}

// ---------------------------------------------------------------------------
// 安装 / 卸载 / 更新
// ---------------------------------------------------------------------------

export interface InstallPluginArgs {
  pluginId: string
  downloadUrl: string
  sha256: string
}

export function installPlugin(args: InstallPluginArgs) {
  return invokeCommand<InstalledPlugin>('install_plugin', {
    pluginId: args.pluginId,
    downloadUrl: args.downloadUrl,
    sha256: args.sha256,
  })
}

export function uninstallPlugin(pluginId: string) {
  return invokeCommand<void>('uninstall_plugin', { pluginId })
}

export function updatePlugin(args: InstallPluginArgs) {
  return invokeCommand<InstalledPlugin>('update_plugin', {
    pluginId: args.pluginId,
    downloadUrl: args.downloadUrl,
    sha256: args.sha256,
  })
}

// ---------------------------------------------------------------------------
// 启用 / 禁用
// ---------------------------------------------------------------------------

export function enablePlugin(pluginId: string) {
  return invokeCommand<void>('enable_plugin', { pluginId })
}

export function disablePlugin(pluginId: string) {
  return invokeCommand<void>('disable_plugin', { pluginId })
}

// ---------------------------------------------------------------------------
// 插件运行时
// ---------------------------------------------------------------------------

export function openPluginWindow(pluginId: string) {
  return invokeCommand<void>('open_plugin_window', { pluginId })
}
