// ============================================================
// 受保护文件：该文件已与 lx-music-desktop-2.12.2 同步，
// 包含修复音源切换卡在“初始化中”的关键逻辑。
// 未经授权不得修改。若需变更，请先移除本注释并联系相关负责人。
// ============================================================
const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')
const { NormalModuleReplacementPlugin } = require('webpack')

const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  target: 'electron-main',
  output: {
    filename: '[name].js',
    library: {
      type: 'commonjs2',
    },
    path: path.join(__dirname, '../../dist'),
  },
  externals: {
    'electron-is-dev': 'electron-is-dev',
    'font-list': 'font-list',
    'better-sqlite3': 'better-sqlite3',
    'electron-font-manager': 'electron-font-manager',
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
    'qrc_decode.node': isDev ? path.join(__dirname, '../../build/Release/qrc_decode.node') : path.join('../build/Release/qrc_decode.node'),
  },
  resolve: {
    alias: {
      '@main': path.join(__dirname, '../../src/main'),
      '@renderer': path.join(__dirname, '../../src/renderer'),
      '@lyric': path.join(__dirname, '../../src/renderer-lyric'),
      '@common': path.join(__dirname, '../../src/common'),
    },
    extensions: ['.tsx', '.ts', '.js', '.mjs', '.json', '.node'],
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          },
        },
        parser: {
          worker: [
            '*audioContext.audioWorklet.addModule()',
            '...',
          ],
        },
      },
    ],
  },
  plugins: [
    new ESLintPlugin(),
    ...(isDev ? [new NormalModuleReplacementPlugin(/^electron$/, path.join(__dirname, 'mock/electron.js'))] : []),
  ],
}
