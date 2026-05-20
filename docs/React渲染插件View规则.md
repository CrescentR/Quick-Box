LauncherPage.tsx 里不要写死：

TypeScript

if (viewId === 'official.json-tool.view') return <JsonToolView />

要通过 PluginRegistry 动态拿组件：

TypeScript

import { pluginRegistry } from '../core/plugin/plugin-registry'



interface ActiveViewState {

&#x20; viewId: string

&#x20; params?: Record<string, unknown>

}



function PluginViewRenderer({ activeView }: { activeView: ActiveViewState }) {

&#x20; const view = pluginRegistry.getView(activeView.viewId)



&#x20; if (!view) {

&#x20;   return <div>View not found: {activeView.viewId}</div>

&#x20; }



&#x20; const Component = view.component



&#x20; return <Component params={activeView.params} />

}

这就是 React 方案里很重要的一点：插件 view 是 React ComponentType，而不是路由写死页面。

