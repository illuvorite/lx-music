# 启动白屏修复记录

## 问题现象

`npm run dev` 可以正常编译（main / renderer / renderer-lyric / renderer-scripts 四套配置全部 `compiled successfully`），Electron 主进程正常启动、窗口也能创建，但窗口内容完全空白（白屏），渲染进程不渲染任何界面。

## 定位过程

1. 后台启动 `npm run dev` 并采集 stdout / stderr。
2. 确认四套 webpack 配置全部编译成功 → **排除构建期失败**。
3. 抓取主进程日志，发现关键报错：

   ```
   Error occurred in handler for 'common_get_app_setting':
     Error: No handler registered for 'common_get_app_setting'
   ```

4. 追踪渲染进程挂载链路：

   ```
   src/renderer/main.ts
     → getSetting()                    // IPC invoke 'common_get_app_setting'
       → .then(() => app.mount('#root'))
   ```

   `src/renderer/main.ts` 中 `app.mount('#root')` **只在 `getSetting()` resolve 之后执行**，且 `#root` 内没有任何 loading 兜底。
   当 `getSetting()` 被 reject 时，整个 `.then` 回调不会执行 → Vue 从不挂载 → `#root` 永远为空 → **完全白屏**。

## 根因

`src/main/modules/winMain/rendererEvent/index.ts` 漏注册了「公共 IPC 处理器」：

```ts
// 修复前
import { registerRendererEvents as common } from '@main/modules/commonRenderers/common'
...
common(sendEvent)   // 只是「主进程 → 渲染进程」的事件转发
```

`@main/modules/commonRenderers/common` 目录实际有两个导出：

| 导出 | 文件 | 作用 |
|------|------|------|
| `default` | `rendererEvent.ts` | 注册 `mainHandle`（`get_app_setting` / `set_app_setting` / `get_env_params` / `get_system_fonts` 等）——**渲染进程 → 主进程**的请求处理器 |
| `registerRendererEvents` | `winRendererEvent.ts` | 向渲染进程推送 deeplink / theme 变化事件 |

`@main/modules/commonRenderers/index.ts` 这个聚合入口（`common()` / `list()` / `dislike()` 一次性注册全部处理器）**没有任何文件引用**，即整个 `commonRenderers/*` 的 `default` 导出从未被调用。于是 `common_get_app_setting` 没有注册 handler，渲染进程启动即失败，界面永久白屏。

> 影响范围不止白屏：`list` / `dislike` 两套 IPC 处理器同样缺失，歌单与不喜欢列表相关功能也不可用。

## 修复内容

文件：`src/main/modules/winMain/rendererEvent/index.ts`

```ts
import registerCommonRendererEvents from '@main/modules/commonRenderers'
...
export default () => {
  if (isInitialized) return
  isInitialized = true

  registerCommonRendererEvents()   // 注册 common / list / dislike 的 mainHandle 处理器
  common(sendEvent)
  list(sendEvent)
  dislike(sendEvent)
  ...
}
```

修复后主进程启动日志不再出现 `No handler registered`，窗口正常渲染（可看到用户列表、歌曲列表与播放栏）。

## 相关加固

| 文件 | 修改 |
|------|------|
| `package.json` | 补声明 `lodash` 依赖（`src/renderer/components/index.js` 与 `src/renderer-lyric/components/index.js` 使用，此前仅靠传递依赖存在，依赖树变动即 `Module not found` → 白屏） |
| `src/renderer/index.html` | 内联脚本容错：URL 缺少 `os=` 参数时不再抛 `TypeError` 中断主题注入；主题参数解析失败只记录错误 |
| `src/renderer/store/state.ts` | 移除与 `@renderer/store/list/state` 重复声明的 8 个列表状态，避免两套互不相通的状态 |
| `src/main/index.ts` + 删除 `modules/LifecycleModule.ts`、`modules/CoreModules.ts`、`modules/index.ts` | 移除与 `src/main/app.ts`（`initAppSetting` / `initTheme` / `listenerAppEvent`）100% 重复的生命周期模块系统，避免重复初始化数据库、重复注册 `updated_config` / `nativeTheme` 监听器 |

## 同类问题快速定位

- 症状：能编译、能起窗口，但界面全白且控制台无明显报错
- 检查点：
  1. 主进程日志是否有 `No handler registered for 'xxx'` → 说明某个模块的 `mainHandle` 注册没有执行
  2. `src/renderer/main.ts` 的 `app.mount` 是否被前置异步（`getSetting` / `getEnvParams`）门控
  3. `src/main/modules/commonRenderers/index.ts` 是否被调用（它是公共 IPC 处理器的唯一注册入口）
