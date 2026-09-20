// 跨平台 cross-env 替代：替代 cross-env KEY=val -- command args...
//
// 用法（被 package.json 引用）：
//   "build:main": "node build-config/setenv.js NODE_ENV=production -- webpack --config ..."
//
// 解析规则：
//   - 第一个 '--' 之前的参数是 KEY=VAL 形式的环境变量；
//   - '--' 之后是子命令与参数；
//   - 整段 spawn 到子进程，继承修改后的 process.env。
// 跨平台：windows 下用 shell=true 走 .cmd / .bat；mac / linux 直接 exec。
const { spawn } = require('child_process')

;(function main() {
  const args = process.argv.slice(2)
  const sepIdx = args.indexOf('--')

  // 退化路径：没有 '--'：整段当成单条命令
  if (sepIdx < 0) {
    const cmd = args[0]
    const rest = args.slice(1)
    if (!cmd) {
      console.error('setenv: missing command. Usage: setenv KEY=val -- command [args...]')
      process.exit(1)
      return
    }
    const child = spawn(cmd, rest, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    })
    child.on('exit', code => process.exit(code ?? 0))
    return
  }

  const envPairs = args.slice(0, sepIdx)
  const subArgs = args.slice(sepIdx + 1)

  for (const pair of envPairs) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    const key = pair.slice(0, eq).trim()
    const val = pair.slice(eq + 1)
    if (key) process.env[key] = val
  }

  const cmd = subArgs[0]
  const rest = subArgs.slice(1)
  if (!cmd) {
    console.error('setenv: missing command after --')
    process.exit(1)
    return
  }

  const child = spawn(cmd, rest, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  child.on('exit', code => process.exit(code ?? 0))
})()
