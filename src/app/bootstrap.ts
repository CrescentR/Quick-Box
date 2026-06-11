import { loadBuiltinPlugins } from '../core/plugin/builtin-loader'

let didBootstrap = false

export function ensureAppBootstrapped() {
  if (didBootstrap) {
    return
  }

  loadBuiltinPlugins()
  didBootstrap = true
}
