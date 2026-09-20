/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

// 兜底：主进程顶层抛错时，至少能看到完整堆栈（避免"安静 crash 不弹窗"）
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[main] uncaughtException:', err)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dialog } = require('electron') as typeof import('electron')
    dialog.showErrorBox('主进程未捕获异常', String((err as Error)?.stack || err))
  } catch { /* electron 未就绪时忽略 */ }
})
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[main] unhandledRejection:', reason)
})

// electron-debug is incompatible with Electron 40+ in this environment; disable to avoid startup crash
// import electronDebug from 'electron-debug'
// import { openDevTools } from './utils'
// // Install `electron-debug` with `devtron`
// electronDebug({
//   showDevTools: false,
//   devToolsMode: 'undocked',
// })

// 注意：之前这里用 installExtension(VUEJS_DEVTOOLS) 自动下载并安装 Vue DevTools 扩展。
// 在国内网络环境下，下载 CRX 经常失败（unzip-crx-3 抛 "Invalid header: Does not start with Cr24"），
// 虽然 .catch 兜住了不会 crash，但会在控制台刷一堆误导性的错误栈。
// 这里改为完全不调用 installExtension；Vue DevTools 可通过 Chrome 自身的扩展加载流程手动安装。

// Require `main` process to boot app
require('./index')
