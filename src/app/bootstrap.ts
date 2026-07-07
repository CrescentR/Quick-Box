import { loadBuiltinPlugins } from '../core/plugin/builtin-loader'
import { loadInstalledMarketPlugins } from '../core/plugin-market/market-plugin-loader'

let didBootstrap = false
let marketPluginsLoaded = false

export function ensureAppBootstrapped() {
  if (didBootstrap) {
    return
  }

  loadBuiltinPlugins()
  didBootstrap = true
}

/**
 * 异步加载已安装的市场插件。
 * 应在 ensureAppBootstrapped() 之后、hydratePluginState 之前调用。
 */
export async function ensureMarketPluginsLoaded() {
  if (marketPluginsLoaded) {
    return
  }

  await loadInstalledMarketPlugins()
  marketPluginsLoaded = true
}
