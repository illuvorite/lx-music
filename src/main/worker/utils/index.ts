// 这里用 require 绕开 webpack 的 Worker 类改写
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Worker } = require('node:worker_threads') as typeof import('node:worker_threads')
import * as Comlink from 'comlink'

export type DBSeriveTypes = Comlink.Remote<LX.WorkerDBSeriveListTypes>

// 内联 nodeEndpoint 实现，避免 webpack 把 comlink 主入口（浏览器版）也打进来
// 导致 nodeEndpoint 的实现被覆盖。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeNodeEndpoint(nep: any): any {
  const listeners = new WeakMap()
  return {
    postMessage: nep.postMessage.bind(nep),
    addEventListener: (_: string, eh: any) => {
      const l = (data: unknown) => {
        if ('handleEvent' in eh) eh.handleEvent({ data })
        else eh({ data })
      }
      nep.on('message', l)
      listeners.set(eh, l)
    },
    removeEventListener: (_: string, eh: any) => {
      const l = listeners.get(eh)
      if (!l) return
      nep.off('message', l)
      listeners.delete(eh)
    },
    start: nep.start && nep.start.bind(nep),
  }
}

/**
 * 计算 dbService worker bundle 的磁盘路径。
 *
 * 历史背景：项目原本用 `new Worker(new URL('../dbService', import.meta.url))`，
 * 但 webpack 5 的 Worker 改写只对 `target: 'web' | 'webworker'` 生效，
 * 在 `target: 'electron-main'` 下 import.meta.url 不会被改写，
 * 导致 dbService/index.ts 被 ts-loader 当孤立文件 emit 成 .ts 产物，
 * Node 把它当 ESM 解析后 `import './db'` 报错，主进程在 ready 之前就 crash。
 *
 * 修复方案（方案 A）：让 webpack 把 dbService 也打包成 CJS bundle 输出到 dist/，
 * 然后用绝对路径（来自 Worker 自身的 __filename 所在目录）来加载，
 * 这样 dev / prod 都能跑通。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WORKER_BUNDLE_NAME = 'dbService.worker.js'
function resolveWorkerEntry(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('node:path') as typeof import('node:path')
  // __dirname 在主进程 webpack 产物（CJS）里就是 dist/ 目录，
  // 跟 dbService.worker.js 同一层，直接拼出绝对路径。
  return path.join(__dirname, WORKER_BUNDLE_NAME)
}

export const createDBServiceWorker = () => {
  // 用 Reflect.construct 触发原生的 Worker 构造函数，
  // 避免 webpack 5 的 Worker 改写（new Worker(new URL(...)) 会被改写为 new Worker__webpack_require__.wc(...)）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WorkerClass: any = Worker
  const entry = resolveWorkerEntry()
  // workerData 用于在 worker 入口区分主进程 / dbService 两种角色
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worker: any = Reflect.construct(WorkerClass, [
    entry,
    { workerData: { type: 'dbService' } },
  ])
  return Comlink.wrap<LX.WorkerDBSeriveListTypes>(makeNodeEndpoint(worker))
}
