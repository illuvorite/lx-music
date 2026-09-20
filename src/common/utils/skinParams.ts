/**
 * 参数化自定义皮肤引擎（仿 QQ 音乐）· 共享参数模型
 *
 * 核心思想：皮肤不是一张烘焙好的位图，而是一组「原图 + 渲染参数」。
 * 制作弹窗（交互层）与主界面背景图层（渲染层）共用这里的纯函数，
 * 对同一份参数做同一套几何换算，保证构图一致且**图片始终按原始比例等比缩放**（不拉伸）。
 *
 * 坐标系：
 * - selX/selY/selW/selH：用户框选区域在**图片**上的归一化矩形（0~1，相对图片宽高）。
 *   弹窗里绿色选框（可自由拖动/四角缩放）即对应此矩形。
 * - 渲染：把选区等比缩放到恰好覆盖（cover）视口（窗口），
 *   选区中心对齐视口中心；选区比例与视口不一致时，多露出选区周边的内容，但不变形。
 * - blur：高斯模糊半径 / 视口宽（渲染时换算为像素，由 CSS filter 在 GPU 执行）
 */
export interface SkinParams {
  selX: number
  selY: number
  selW: number
  selH: number
  blur: number
}

/** 模糊滑块拉满时，模糊半径 = 35% 视口宽 */
export const SKIN_BLUR_MAX = 0.35

/** 选区最小尺寸（相对图片宽/高） */
export const SKIN_SEL_MIN = 0.05

export const defaultSkinParams = (): SkinParams => ({
  selX: 0.25,
  selY: 0.25,
  selW: 0.5,
  selH: 0.5,
  blur: 0,
})

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/**
 * 约束参数：选区必须在图片范围内且不小于最小尺寸
 */
export const clampSkinParams = (p: SkinParams): SkinParams => {
  const selW = clamp(p.selW, SKIN_SEL_MIN, 1)
  const selH = clamp(p.selH, SKIN_SEL_MIN, 1)
  return {
    selX: clamp(p.selX, 0, 1 - selW),
    selY: clamp(p.selY, 0, 1 - selH),
    selW,
    selH,
    blur: Math.max(0, p.blur),
  }
}

export interface SkinLayout {
  left: number
  top: number
  width: number
  height: number
  /** 模糊半径（像素） */
  blurPx: number
  /**
   * blur 边缘补偿倍数：CSS blur 会让图层边缘出现半透明渐变，
   * 渲染时以元素中心等比放大 blurZoom 倍，把透明边缘推出视口之外。
   */
  blurZoom: number
}

/**
 * 参数 → 像素布局（图片整体在视口中的绘制矩形，等比缩放）。
 * 弹窗（视口=预览区）与主界面（视口=窗口）调用同一函数，构图规则完全一致：
 * 选区等比放大到恰好覆盖视口（cover），选区中心对齐视口中心。
 */
export const computeSkinLayout = (
  p: SkinParams,
  vpW: number,
  vpH: number,
  imgW: number,
  imgH: number,
): SkinLayout => {
  const safeW = Math.max(p.selW, 0.0001)
  const safeH = Math.max(p.selH, 0.0001)
  // 选区覆盖视口所需的等比缩放因子
  const factor = Math.max(vpW / (safeW * imgW), vpH / (safeH * imgH))
  const width = imgW * factor
  const height = imgH * factor
  // 选区中心 → 视口中心
  const boxCx = (p.selX + safeW / 2) * imgW * factor
  const boxCy = (p.selY + safeH / 2) * imgH * factor
  const blurPx = p.blur * vpW
  const pad = blurPx * 2
  const longEdge = Math.max(width, height)
  return {
    left: vpW / 2 - boxCx,
    top: vpH / 2 - boxCy,
    width,
    height,
    blurPx,
    blurZoom: blurPx > 0.2 ? (longEdge + pad * 2) / longEdge : 1,
  }
}

/**
 * 滑块值（0~100）与 blur 参数的换算
 */
export const blurSliderToParam = (v: number): number => (Math.max(0, Math.min(100, v)) / 100) * SKIN_BLUR_MAX
export const blurParamToSlider = (b: number): number => Math.round((Math.max(0, b) / SKIN_BLUR_MAX) * 100)

/**
 * 序列化 / 反序列化（持久化到主题 extInfo.skinParams）
 * 兼容历史数据：
 * - v2（scaleX/scaleY + offset 双轴拉伸）与 v1（scale 等比）无法无损映射为选区，
 *   统一回退为居中最大选区（用户重新框选一次即可）。
 */
export const stringifySkinParams = (p: SkinParams): string => {
  const r = (n: number) => Math.round(n * 100000) / 100000
  return JSON.stringify({ selX: r(p.selX), selY: r(p.selY), selW: r(p.selW), selH: r(p.selH), blur: r(p.blur) })
}

export const parseSkinParams = (raw: string | undefined | null): SkinParams | null => {
  if (!raw) return null
  try {
    const o = JSON.parse(raw)
    if (typeof o?.selX != 'number' || typeof o?.selW != 'number') return defaultSkinParams()
    return clampSkinParams({
      selX: o.selX,
      selY: typeof o?.selY == 'number' ? o.selY : 0.25,
      selW: o.selW,
      selH: typeof o?.selH == 'number' ? o.selH : 0.5,
      blur: typeof o?.blur == 'number' ? o.blur : 0,
    })
  } catch {
    return null
  }
}
