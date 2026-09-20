// 调试开关
// debugRequest: 打开后会打印每一次音源请求的 URL 与响应体，噪音很大，
// 仅在排查音源请求问题时手动置为 true。
export const debugRequest = false

// 通用调试开关（musicSdk 下部分模块会引用）
export const debug = debugRequest
