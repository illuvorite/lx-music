import { reactive } from '@common/utils/vueTools'
import { toOldMusicInfo } from '@common/utils/tools'
import musicSdk from '@renderer/utils/musicSdk'

const picCache = reactive({})
const pending = new Set()

export const getCoverUrl = (item) => item?.meta?.picUrl || picCache[item?.id] || ''

export const loadCover = (item) => {
  if (!item?.id || item.meta?.picUrl || picCache[item.id] || pending.has(item.id)) return
  const sdk = musicSdk[item.source]
  if (!sdk?.getPic) return
  pending.add(item.id)
  sdk.getPic(toOldMusicInfo(item)).then((pic) => {
    if (pic) picCache[item.id] = pic
  }).catch(() => {}).finally(() => {
    pending.delete(item.id)
  })
}
