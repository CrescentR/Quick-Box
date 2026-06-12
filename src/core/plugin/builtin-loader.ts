import advancedTools from '../../builtin-plugins/advanced-tools'
import base64Tool from '../../builtin-plugins/base64-tool'
import hashTool from '../../builtin-plugins/hash-tool'
import jsonTool from '../../builtin-plugins/json-tool'
import portKillerTool from '../../builtin-plugins/port-killer-tool'
import regexTool from '../../builtin-plugins/regex-tool'
import timestampTool from '../../builtin-plugins/timestamp-tool'
import urlTool from '../../builtin-plugins/url-tool'
import utilityTools from '../../builtin-plugins/utility-tools'
import uuidTool from '../../builtin-plugins/uuid-tool'
import workflowTools from '../../builtin-plugins/workflow-tools'
import { pluginRegistry } from './plugin-registry'

let loaded = false

export function loadBuiltinPlugins() {
  if (loaded) return

  ;[
    jsonTool,
    timestampTool,
    base64Tool,
    uuidTool,
    hashTool,
    portKillerTool,
    urlTool,
    regexTool,
    utilityTools,
    advancedTools,
    workflowTools,
  ].forEach((plugin) => {
    if (pluginRegistry.getPlugin(plugin.id)) {
      return
    }

    pluginRegistry.register(plugin)
  })

  loaded = true
}
