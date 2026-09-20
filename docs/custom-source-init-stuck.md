# 自定义音源卡在「初始化中」修复记录

## 问题现象

在设置页选择自定义源（user_api）后，状态一直显示 `[初始化中...]`。主进程日志不断打印 `load api xxx`，但状态始终不更新。

## 状态回流链路

```
渲染进程 setUserApi(apiId)
  → IPC set_user_api
    → 主进程 createWindow(userApi)
      → ready-to-show → send initEnv
        → preload 执行脚本
          → 脚本应调用 lx.send('inited', ...)
            → preload 发 init IPC
              → 主进程 handleInit → sendStatusChange
                → 渲染进程 onUserApiStatus → 更新 userApi.status/message
```

## 根因分析

### 1. user-api 窗口默认启用 webSecurity，导致脚本网络请求被 CORS 阻止

`src/main/modules/userApi/main.ts` 中 `BrowserWindow` 的 `webPreferences` 没有设置 `webSecurity: false`。默认情况下，Electron 会启用同源策略。

用户自定义音源脚本在 user-api 窗口里运行时，通常通过 `fetch` / `XMLHttpRequest` 请求外部音源 API。如果这些 API 没有正确配置 CORS 响应头，请求会被直接阻断。

部分脚本内部对网络错误做了 `.catch()` 但没有继续抛出，也没有调用 `lx.send('inited', ...)`，导致主进程永远不会收到 `init` 事件，渲染进程状态也就永远停在 `initing`。

### 2. 主进程缺少 init 超时保护

如果脚本因网络问题、环境问题（如 data URL 下的 `window.location` 异常）或其他原因没有在合理时间内调用 `lx.send('inited', ...)`，主进程没有任何超时兜底，UI 会 forever pending。

### 3. `sendEvent` 重复声明导致启动报错

`src/main/modules/userApi/main.ts` 顶部误从 `@common/mainIpc` 导入了 `sendEvent`，但 `@common/mainIpc` 中实际导出的同名函数与文件底部本地定义的 `sendEvent` 冲突，导致模块解析时直接抛出 `SyntaxError: Identifier 'sendEvent' has already been declared`，整个 userApi 模块加载失败，`user_api_status` 链路根本走不起来。

### 4. 快速切换音源时 orphaned init 定时器发送过时状态

当用户快速切换不同自定义源时，如果 `createWindow` 没有在开头清除前一个音源的 `initTimer`，前一个音源的 20 秒超时定时器会成为 orphaned timer。这些 orphaned timers 会向当前 user-api 窗口发送旧音源的失败状态，导致：
- 当前音源的状态被旧音源的失败状态覆盖
- UI 显示混乱，即使当前音源已经初始化成功

### 5. preload 层的 `isInitedApi` 锁导致后续 init 被吞掉

`src/main/modules/userApi/renderer/preload.js` 中，`isInitedApi` 在以下情况会被设为 `true`：
- 脚本成功调用 `lx.send('inited', ...)` 后
- `onError` 被触发时（如脚本有未捕获的运行时错误）

如果脚本先触发了一个未捕获的错误（`onError` 被调用，`isInitedApi = true`），之后脚本再调用 `lx.send('inited', ...)`，由于 `isInitedApi` 已经是 `true`，`lx.send` 会直接 reject，`handleInit` 不会被调用，主进程就永远不会收到 `init` 事件。

## 修复内容

### 1. 关闭 user-api 窗口的 webSecurity（主进程）

文件：`src/main/modules/userApi/main.ts`

在 `BrowserWindow` 的 `webPreferences` 中增加：

```ts
webSecurity: false,
```

这样 user-api 窗口内的脚本发出的网络请求不受同源策略限制，与脚本在普通浏览器中运行的行为一致。

> **安全提示**：`webSecurity: false` 会降低该窗口的安全隔离。由于 user-api 窗口本身是受限的（不加载外部资源、不启用 nodeIntegration、禁止导航），风险可控。如果后续有更安全的方案（如统一通过 preload 暴露的 `lx.request` 发请求），可以移除此项。

### 2. 增加 init 超时保护，并修复快速切换时的 orphaned timer 问题（主进程）

文件：`src/main/modules/userApi/main.ts`

在 `createWindow` 中增加 20 秒超时定时器。如果超时前没有收到脚本的 `init` 事件，主动推送失败状态，避免 UI 永远卡住。

```ts
let initStatus: LX.UserApi.UserApiStatus = { status: false, message: '初始化超时' }
initTimer = setTimeout(() => {
  sendStatusChange(initStatus)
}, 20000)
```

同时在以下时机清除定时器：
- `createWindow` 开头：先 `clearInitTimer()`，避免快速切换时留下 orphaned timer
- `browserWindow.on('closed')`：窗口关闭时清理
- `sendInitEnv` 被调用时：确保 initEnv 发出后定时器仍可被脚本触发清除
- `handleInit` 处理到脚本 init 事件时：立即 `clearInitTimer()`

### 3. 修复 sendEvent 重复声明（主进程）

文件：`src/main/modules/userApi/main.ts`

将顶部 import：
```ts
// 错误：sendEvent 在 @common/mainIpc 中并不存在，且文件底部又定义了一个同名的
import { mainSend, sendEvent } from '@common/mainIpc'
```
修正为：
```ts
import { mainSend } from '@common/mainIpc'
```

保留文件底部的本地 `sendEvent` 定义（它是对 `mainSend` 的封装，会检查 `browserWindow` 是否存在）。

### 4. 增加渲染进程侧 init 超时兜底（渲染进程）

文件：`src/renderer/core/apiSource.ts`

在 `setUserApi` 的 `user_api` 分支中，增加 25 秒渲染进程侧超时。如果主进程超时保护因窗口关闭等原因未能送达状态，渲染进程会在 25 秒后自动将状态更新为失败，避免 UI 永久停留在 `initing`。

```ts
const timeoutId = setTimeout(() => {
  if (userApi.message === 'initing') {
    userApi.message = '初始化超时'
    if (!window.lx.apiInitPromise[1]) window.lx.apiInitPromise[2](false)
  }
}, 25000)
```

### 5. 增加调试日志（主进程 + 渲染进程）

- 主进程 `src/main/modules/userApi/rendererEvent/rendererEvent.ts` 的 `handleInit` 中增加 `console.log('[user-api] init event:', status, message, apiInfo?.name, apiInfo?.id)`
- 渲染进程 `src/renderer/core/useApp/useInitUserApi.ts` 的 `onUserApiStatus` 中增加 `console.log('[user-api] status event:', status, message, apiInfo?.id, appSetting['common.apiSource'])`
- 主进程 `src/main/modules/userApi/main.ts` 的 `createWindow` 中，生产环境自动为 user-api 窗口打开 DevTools（`mode: 'detach'`），方便查看脚本执行和网络请求情况

### 6. 渲染进程状态管理优化

文件：`src/renderer/core/apiSource.ts`

- `user_api` 分支：IPC 调用成功后，不再提前 resolve `apiInitPromise`，而是等待主进程通过 `user_api_status` 事件回传真实状态。避免出现"init 显示成功但 `apis` / `qualityList` 仍为空"的问题。
- `user_api` 分支：catch 失败时重置 `prevId = ''`，resolve `apiInitPromise[2](false)`，并尝试回退到其他可用音源。

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/main/modules/userApi/main.ts` | webPreferences 增加 `webSecurity: false`；`createWindow` 开头增加 `clearInitTimer()`；增加 init 超时保护；修复 `sendEvent` 重复声明；生产环境自动打开 user-api 窗口 DevTools |
| `src/main/modules/userApi/rendererEvent/rendererEvent.ts` | 导入 `clearInitTimer`，在 `handleInit` 中调用并增加日志 |
| `src/renderer/core/apiSource.ts` | 增加渲染进程侧 25 秒超时兜底；调整 `setUserApi` 状态管理逻辑 |
| `src/renderer/core/useApp/useInitUserApi.ts` | 增加 `onUserApiStatus` 调试日志 |

## 调试建议

如果后续再出现类似问题，可按以下步骤排查：

1. **查看 user-api 窗口 DevTools**：生产环境已自动打开（detach 模式），可以直接看到脚本执行情况、网络请求、Console 报错。
2. **查看主进程 Console**：确认是否有 `[user-api] init event:` 日志，判断主进程是否收到脚本的 `init`。
3. **查看渲染进程 Console**：确认是否有 `[user-api] status event:` 日志，判断状态是否成功回流。
4. **观察 `load api` 日志**：如果反复打印，说明用户正在频繁切换音源，或 `setUserApi` 被异常调用。
5. **检查 preload 层的 `isInitedApi`**：如果脚本先报错后调用 `lx.send('inited', ...)`，后者会被 reject，主进程收不到 `init`。

## 同类问题快速定位

- 症状：设置页自定义源显示 `[初始化中...]`，切走再切回仍无效
- 检查点：
  - `src/main/modules/userApi/main.ts` 的 `webPreferences` 是否包含 `webSecurity: false`
  - `src/main/modules/userApi/main.ts` 的 `createWindow` 是否有 init 超时保护，且开头是否调用了 `clearInitTimer()`
  - `src/main/modules/userApi/main.ts` 的 import 是否误导入 `sendEvent` 导致重复声明
  - `src/renderer/core/apiSource.ts` 的 `setUserApi` 是否有正确的状态管理
  - 查看 user-api 窗口 DevTools 中脚本是否执行、是否调用 `lx.send('inited', ...)`
