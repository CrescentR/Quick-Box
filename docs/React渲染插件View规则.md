# React 插件视图渲染规则

[返回首页](../README.md) · [开发指南](development.md) · [插件开发示例](插件示范.md) · [核心组件规范](核心组件规范.md)

QuickBox 把插件视图注册为 React 组件，由启动器按 `viewId` 动态渲染。新增工具时，维护插件注册与视图本身即可，无需修改启动器的工具分支。

## 视图接口

以下为当前接口节选，完整定义见 [`plugin-types.ts`](../src/core/plugin/plugin-types.ts)：

```ts
import type { ComponentType } from 'react'

export interface PluginViewProps {
  params?: Record<string, unknown>
}

export interface PluginView {
  id: string
  title: string
  component: ComponentType<PluginViewProps>
}
```

`component` 保存组件引用，不保存已经实例化的 `<ToolView />`。一个插件可以注册多个命令和多个视图，命令 ID、插件 ID、视图 ID 的关系应明确且稳定。

## 在插件清单中延迟导入

普通 default export 视图可直接使用 `lazy`：

```tsx
import { lazy } from 'react'

const JsonToolView = lazy(() => import('./JsonToolView'))

// 放入 ToolPlugin.views
const views = [
  {
    id: 'official.json-tool.view',
    title: 'JSON 工具',
    component: JsonToolView,
  },
]
```

如果文件包含多个具名导出，转换成 `lazy` 需要的 default 形状：

```tsx
const TextCaseToolView = lazy(() =>
  import('./UtilityToolsView').then((module) => ({
    default: module.TextCaseToolView,
  })),
)
```

这两种模式分别见 [`json-tool/index.ts`](../src/builtin-plugins/json-tool/index.ts) 和 [`utility-tools/index.ts`](../src/builtin-plugins/utility-tools/index.ts)。`lazy` 声明放在模块作用域，不在组件 render 中反复创建。

## 命令打开视图

命令通过提供的上下文切换工作台：

```ts
run: async (ctx) => {
  await ctx.openView('official.json-tool.view', {
    // 需要时传入工具参数
  })
}
```

`LauncherPage` 执行命令时会补充 `commandId`，再由 [`launcher-store`](../src/stores/launcher-store.ts) 保存 `activeViewId` 和 `activeViewParams`。参数仅是运行时输入，不等于保存到数据库；工具消费 `Record<string, unknown>` 中的值前应校验类型。

## 工作台统一渲染

当前渲染入口是 [`ToolViewPane.tsx`](../src/pages/launcher/components/ToolViewPane.tsx)。下面省略标题栏等界面代码，只展示实际挂载关系：

```tsx
const view = pluginRegistry.getView(viewId)

return view ? (
  <ToolErrorBoundary key={`${viewId}:${params?.requestId ?? ''}`}>
    <Suspense fallback={<p role="status">正在加载工具…</p>}>
      <ToolProvider viewId={viewId} params={params}>
        <view.component params={params} />
      </ToolProvider>
    </Suspense>
  </ToolErrorBoundary>
) : (
  <EmptyState title="视图不可用" description={`找不到视图 "${viewId}"。`} />
)
```

| 外层能力 | 作用 |
| --- | --- |
| `PluginRegistry.getView` | 按 ID 获取已注册的组件 |
| `ToolErrorBoundary` | 显示视图渲染错误和重试入口 |
| `Suspense` | 视图模块尚未加载时显示等待状态 |
| `ToolProvider` | 提供当前 `viewId` 和传入的 `toolInput` |
| `params` | 向视图传入工具参数 |

不要在 `LauncherPage` 中按工具 ID 写 `if` / `switch` 再直接导入各工具。工具分类、搜索关键词和显示名称由命令元数据及启动器目录配置负责，工具 UI 由注册表负责。

## 生命周期与数据接收

外层错误边界的 key 由 `viewId` 和可选 `requestId` 组成。切换视图或传入新的 `requestId` 会重建子树，重置该次视图状态；同一视图仅更新其他参数时，不保证触发重新挂载。

`useToolInput` 在初始化时选择传入文本、内存草稿或默认值，并不会自动把每次参数变化都写进现有 state。通过 `ToolResultActions` 发送结果会生成新 `requestId`，使接收工具以这次输入初始化。自定义跳转若需要相同行为，应遵循该约定；若需要保持组件，应显式处理参数变化。

退出视图时清理计时器、订阅、事件监听和可取消的异步任务。要跨工具保留临时输入，使用 [工具输入 hook](核心组件规范.md#输入选项和结果传递)；要保存业务数据，使用对应 API / store。

## 异常与启停

找不到视图时工作台显示空态；lazy 视图渲染失败时由错误边界提供反馈。命令执行错误在启动器中显示提示，工具内部事件和异步操作仍应自行捕获错误。

插件停用后，启动器会过滤它的命令；若该插件的视图正打开，启动器会关闭它。当前插件来自内置注册清单，这套渲染机制本身不提供不可信插件隔离。有关权限元数据和原生调用边界，见 [架构说明](../ARCHITECTURE.md#当前插件机制的边界)。
