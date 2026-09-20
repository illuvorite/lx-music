// import {  } from '@renderer/utils/ipc'

import { appSetting } from '@renderer/store/setting'
import { fetchingListStatus, listUpdateTimes, allMusicList, userLists, tempListMeta } from './state'
import {
  registerListAction,
  createUserList as createUserListAction,
  addListMusics as addListMusicsAction,
  moveListMusics as moveListMusicsAction,
  overwriteListMusics,
  removeListMusics as removeListMusicsAction,
} from '@renderer/store/list/listManage'
import { getMusicQualityScore } from '@renderer/utils/musicQuality'
import { toRaw } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'

export const registerAction = (onListChanged: (listIds: string[]) => void) => {
  return registerListAction(appSetting, onListChanged)
}

/**
 * 从缓存获取列表内歌曲，前提是知道列表之前已被获取过，否则返回空数组
 * @param listId 列表ID
 * @returns
 */
export const getListMusicsFromCache = (listId: string | null): LX.Music.MusicInfo[] => {
  if (!listId) return []
  if (allMusicList.has(listId)) return allMusicList.get(listId) as LX.Music.MusicInfo[]
  return []
}

export const setFetchingListStatus = (id: string, status: boolean) => {
  fetchingListStatus[id] = status
}

export const setUpdateTime = (id: string, time: string) => {
  listUpdateTimes[id] = time
}

const getLoveKey = (info: LX.Music.MusicInfo) => `${info?.name ?? ''}__${info?.singer ?? ''}`.replace(/\s/g, '').toLowerCase()

/**
 * 我喜欢：同名同歌手（不同平台）只保留一首，且优先保留音质最好的那条
 * @returns keep 需要新增的歌曲；removeIds 需要被替换掉的旧版本
 */
const filterLoveDuplicate = (musicInfos: LX.Music.MusicInfo[]): { keep: LX.Music.MusicInfo[], removeIds: string[] } => {
  const scoreMap = new Map<string, { id: string, score: number }>()
  for (const item of allMusicList.get(LIST_IDS.LOVE) ?? []) {
    scoreMap.set(getLoveKey(item), { id: item.id, score: getMusicQualityScore(item) })
  }

  const keep: LX.Music.MusicInfo[] = []
  const removeIds: string[] = []
  for (const item of musicInfos) {
    const key = getLoveKey(item)
    if (!key) continue
    const score = getMusicQualityScore(item)
    const exist = scoreMap.get(key)
    if (!exist) {
      scoreMap.set(key, { id: item.id, score })
      keep.push(item)
      continue
    }
    // 音质更好才替换，否则忽略这条
    if (score > exist.score) {
      removeIds.push(exist.id)
      scoreMap.set(key, { id: item.id, score })
      keep.push(item)
    }
  }
  return { keep, removeIds }
}

export const addListMusics = async(id: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType?: LX.AddMusicLocationType) => {
  if (id === LIST_IDS.LOVE) {
    const { keep, removeIds } = filterLoveDuplicate(musicInfos)
    if (removeIds.length) await removeListMusicsAction({ listId: LIST_IDS.LOVE, ids: removeIds })
    musicInfos = keep
    if (!musicInfos.length) return
  }
  return addListMusicsAction({
    id,
    musicInfos: toRaw(musicInfos),
    addMusicLocationType: addMusicLocationType ?? appSetting['list.addMusicLocationType'],
  })
}

export const moveListMusics = async(fromId: string, toId: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType?: LX.AddMusicLocationType) => {
  return moveListMusicsAction({
    fromId,
    toId,
    musicInfos: toRaw(musicInfos),
    addMusicLocationType: addMusicLocationType ?? appSetting['list.addMusicLocationType'],
  })
}

export const createUserList = async({ name, id = `userlist_${Date.now()}`, list = [], source, sourceListId, position = -1 }: {
  name?: string
  id?: string
  list?: LX.Music.MusicInfo[]
  source?: LX.OnlineSource
  sourceListId?: string
  position?: number
}) => {
  await createUserListAction({
    position: position < 0 ? userLists.length : position,
    listInfos: [
      {
        id,
        name: name ?? 'list',
        source,
        sourceListId,
        locationUpdateTime: position < 0 ? null : Date.now(),
      },
    ],
  })
  if (list) await addListMusics(id, list)
  return { id, name: name ?? 'list' }
}


export const setTempList = async(id: string, list: LX.Music.MusicInfoOnline[]) => {
  tempListMeta.id = id
  await overwriteListMusics({
    listId: LIST_IDS.TEMP,
    musicInfos: list,
  })
}

export {
  addListMusicsAction,
  moveListMusicsAction,
}

export {
  getUserLists,
  removeUserList,
  updateUserList,
  updateUserListPosition,
  getListMusics,
  removeListMusics,
  updateListMusics,
  updateListMusicsPosition,
  overwriteListMusics,
  clearListMusics,
  overwriteListFull,
  checkListExistMusic,
  getMusicExistListIds,
} from '@renderer/store/list/listManage'
