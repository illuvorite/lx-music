/** 音质权重：数值越大音质越好（用于同曲多平台版本择优保留） */
const QUALITY_WEIGHT: Record<string, number> = {
  flac32bit: 6,
  flac24bit: 5,
  flac: 4,
  ape: 4,
  wav: 4,
  '320k': 3,
  '192k': 2,
  '128k': 1,
}

/** 歌曲可用的最高音质分 */
export const getMusicQualityScore = (info: any): number => {
  const qualitys = info?.meta?._qualitys ?? {}
  let score = 0
  for (const key of Object.keys(qualitys)) {
    const weight = QUALITY_WEIGHT[key] ?? 1
    if (weight > score) score = weight
  }
  return score
}
