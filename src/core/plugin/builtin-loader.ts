import snippetTool from '../../builtin-plugins/snippet-tool'
import libraryTool from '../../builtin-plugins/library-tool'
import taskTool from '../../builtin-plugins/task-tool'
import advancedTools from '../../builtin-plugins/advanced-tools'
import base64Tool from '../../builtin-plugins/base64-tool'
import chmodCalculatorTool from '../../builtin-plugins/chmod-calculator-tool'
import cidrTool from '../../builtin-plugins/cidr-tool'
import commandCheatsheetTool from '../../builtin-plugins/command-cheatsheet-tool'
import cookieTool from '../../builtin-plugins/cookie-tool'
import hashTool from '../../builtin-plugins/hash-tool'
import jsonSchemaTool from '../../builtin-plugins/json-schema-tool'
import jsonTool from '../../builtin-plugins/json-tool'
import jwtKeyTool from '../../builtin-plugins/jwt-key-tool'
import portKillerTool from '../../builtin-plugins/port-killer-tool'
import regexTool from '../../builtin-plugins/regex-tool'
import timestampTool from '../../builtin-plugins/timestamp-tool'
import urlTool from '../../builtin-plugins/url-tool'
import utilityTools from '../../builtin-plugins/utility-tools'
import uuidTool from '../../builtin-plugins/uuid-tool'
import workflowTools from '../../builtin-plugins/workflow-tools'
import yamlPropertiesTool from '../../builtin-plugins/yaml-properties-tool'
import { pluginRegistry } from './plugin-registry'

let loaded = false

export function loadBuiltinPlugins() {
  if (loaded) return

  ;[
    snippetTool,
    libraryTool,
    taskTool,
    jsonTool,
    timestampTool,
    base64Tool,
    uuidTool,
    hashTool,
    portKillerTool,
    commandCheatsheetTool,
    chmodCalculatorTool,
    urlTool,
    regexTool,
    jwtKeyTool,
    yamlPropertiesTool,
    cidrTool,
    cookieTool,
    jsonSchemaTool,
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
