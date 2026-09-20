import { reactive, watch } from '@common/utils/vueTools'
import { addListMusics, removeListMusics } from '@renderer/store/list/action'
import { getListMusics } from '@renderer/store/list/listManage'
import { loveList, allMusicList } from '@renderer/store/list/state'
import { getMusicQualityScore } from '@renderer/utils/musicQuality'

/** 归一化歌曲身份：同名同歌手视为同一首（不区分音乐平台） */
const normalizeKey = (info) => `${info?.name ?? ''}__${info?.singer ?? ''}`.replace(/\s/g, '').toLowerCase()

// 共享状态：所有组件（播放栏 / 列表 / 榜单）共用同一份，任意一处收藏其它地方都会实时同步
const lovedIds = reactive(new Set())
const lovedKeys = reactive(new Map())
let loaded = false
let loadingPromise = null

const doLoadLoved = async() => {
  const list = await getListMusics(loveList.id).catch(() => [])
  // 同名同歌手只留一条，优先保留音质最好的版本
  const bestByKey = new Map()
  const duplicates = []
  for (const item of list) {
    const key = normalizeKey(item)
    const score = getMusicQualityScore(item)
    const prev = bestByKey.get(key)
    if (!prev) {
      bestByKey.set(key, { id: item.id, score })
      continue
    }
    if (score > prev.score) {
      bestByKey.set(key, { id: item.id, score })
      duplicates.push(prev.id)
    } else {
      duplicates.push(item.id)
    }
  }
  if (duplicates.length) await removeListMusics({ listId: loveList.id, ids: duplicates })
  // 统一刷新共享集合（触发所有依赖它的组件更新）
  lovedIds.clear()
  lovedKeys.clear()
  for (const [key, { id }] of bestByKey) {
    lovedKeys.set(key, id)
    lovedIds.add(id)
  }
  loaded = true
}

/**
 * 「我喜欢的音乐」收藏状态（响应式、全局共享）
 * - 同一首歌（歌名 + 歌手）只保留一条，换平台收藏不会重复入库
 * - 加载时会自动清理历史遗留的跨平台重复项
 * - 任一处 toggleLove 后，播放栏 / 列表 / 榜单的爱心情态会同步变化
 * - 每次都从磁盘重新读取（避免应用启动早期列表未就绪时锁死缓存），并发调用共用同一次加载
 */
const loadLoved = async() => {
  if (loadingPromise) return loadingPromise
  loadingPromise = doLoadLoved().catch(() => undefined).finally(() => { loadingPromise = null })
  return loadingPromise
}

const isLoved = (item) => {
  if (!item) return false
  return lovedIds.has(item.id) || lovedKeys.has(normalizeKey(item))
}

const toggleLove = async(item) => {
  if (!item?.id) return false
  if (!loaded) await loadLoved()
  const key = normalizeKey(item)
  if (lovedKeys.has(key)) {
    // 已收藏（可能是同曲的其他平台版本）→ 取消收藏
    const existId = lovedKeys.get(key)
    await removeListMusics({ listId: loveList.id, ids: [existId] })
    lovedKeys.delete(key)
    lovedIds.delete(existId)
    return false
  }
  await addListMusics(loveList.id, [item])
  lovedKeys.set(key, item.id)
  lovedIds.add(item.id)
  return true
}

// 「我喜欢」列表数据就绪 / 变化时自动重新同步（解决应用启动早期加载不到数据的问题）
watch(() => allMusicList.get(loveList.id)?.length, () => {
  loadLoved().catch(() => {})
})

export default () => ({
  lovedIds,
  lovedKeys,
  loadLoved,
  isLoved,
  toggleLove,
})
