import base64Tool from '../../builtin-plugins/base64-tool'
import jsonTool from '../../builtin-plugins/json-tool'
import timestampTool from '../../builtin-plugins/timestamp-tool'
import uuidTool from '../../builtin-plugins/uuid-tool'
import { pluginRegistry } from './plugin-registry'

let loaded = false

export function loadBuiltinPlugins() {
  if (loaded) return

  ;[jsonTool, timestampTool, base64Tool, uuidTool].forEach((plugin) => {
    pluginRegistry.register(plugin)
  })

  loaded = true
}
