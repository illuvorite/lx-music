import { updateListMusics } from '@renderer/store/list/action'
import { saveLyric, saveMusicUrl } from '@renderer/utils/ipc'
import { getLocalFilePath } from '@renderer/utils/music'
import { encodePath } from '@common/utils/common'
import {
  getOtherSource,
  getOnlineOtherSourceMusicUrlByLocal,
  getOnlineOtherSourceLyricByLocal,
  getOnlineOtherSourcePicByLocal,
  getOnlineOtherSourceMusicUrl,
  getOnlineOtherSourcePicUrl,
  getOnlineOtherSourceLyricInfo,
  getCachedLyricInfo,
  buildLyricInfo,
} from '../utils'
import { MusicSourceStrategy, GetMusicUrlParams, GetPicUrlParams, GetLyricInfoParams } from './MusicSourceStrategy'

const getOtherSourceByLocal = async<T>(musicInfo: LX.Music.MusicInfoLocal, handler: (infos: LX.Music.MusicInfoOnline[]) => Promise<T>) => {
  let result: LX.Music.MusicInfoOnline[] = []
  result = await getOtherSource(musicInfo)
  if (result.length) try { return await handler(result) } catch {}
  if (musicInfo.name.includes('-')) {
    const [name, singer] = musicInfo.name.split('-').map(val => val.trim())
    result = await getOtherSource({
      ...musicInfo,
      name,
      singer,
    }, true)
    if (result.length) try { return await handler(result) } catch {}
    result = await getOtherSource({
      ...musicInfo,
      name: singer,
      singer: name,
    }, true)
    if (result.length) try { return await handler(result) } catch {}
  }
  let fileName = musicInfo.meta.filePath.split(/\/|\\/).at(-1)
  if (fileName) {
    fileName = fileName.substring(0, fileName.lastIndexOf('.'))
    if (fileName != musicInfo.name) {
      if (fileName.includes('-')) {
        const [name, singer] = fileName.split('-').map(val => val.trim())
        result = await getOtherSource({
          ...musicInfo,
          name,
          singer,
        }, true)
        if (result.length) try { return await handler(result) } catch {}
        result = await getOtherSource({
          ...musicInfo,
          name: singer,
          singer: name,
        }, true)
      } else {
        result = await getOtherSource({
          ...musicInfo,
          name: fileName,
          singer: '',
        }, true)
      }
      if (result.length) try { return await handler(result) } catch {}
    }
  }

  throw new Error('source not found')
}

export class LocalMusicStrategy extends MusicSourceStrategy {
  async getMusicUrl(params: GetMusicUrlParams): Promise<string> {
    const { musicInfo, isRefresh = false, allowToggleSource = true, onToggleSource = () => {} } = params
    const localMusicInfo = musicInfo as LX.Music.MusicInfoLocal

    if (!isRefresh) {
      const path = await getLocalFilePath(localMusicInfo)
      if (path) return encodePath(path)
    }

    try {
      return await getOnlineOtherSourceMusicUrlByLocal(localMusicInfo, isRefresh)
        .then(({ url, quality, isFromCache }) => {
          if (!isFromCache) void saveMusicUrl(localMusicInfo, quality, url)
          return url
        })
    } catch {}

    if (!allowToggleSource) throw new Error('failed')

    onToggleSource()
    return getOtherSourceByLocal(localMusicInfo, async (otherSource) => {
      return getOnlineOtherSourceMusicUrl({
        musicInfos: [...otherSource],
        onToggleSource,
        isRefresh,
      }).then(({ url, quality: targetQuality, musicInfo: targetMusicInfo, isFromCache }) => {
        if (!isFromCache) void saveMusicUrl(targetMusicInfo, targetQuality, url)
        return url
      })
    })
  }

  async getPicUrl(params: GetPicUrlParams): Promise<string> {
    const { musicInfo, listId, isRefresh = false, onToggleSource = () => {} } = params
    const localMusicInfo = musicInfo as LX.Music.MusicInfoLocal

    if (!isRefresh) {
      const pic = await window.lx.worker.main.getMusicFilePic(localMusicInfo.meta.filePath)
      if (pic) return pic
      if (localMusicInfo.meta.picUrl) return localMusicInfo.meta.picUrl
    }

    try {
      return await getOnlineOtherSourcePicByLocal(localMusicInfo).then(({ url }) => url)
    } catch {}

    onToggleSource()
    return getOtherSourceByLocal(localMusicInfo, async (otherSource) => {
      return getOnlineOtherSourcePicUrl({
        musicInfos: [...otherSource],
        onToggleSource,
        isRefresh,
      }).then(({ url, musicInfo: targetMusicInfo, isFromCache }) => {
        if (listId) {
          localMusicInfo.meta.picUrl = url
          void updateListMusics([{ id: listId, musicInfo: localMusicInfo }])
        }
        return url
      })
    })
  }

  async getLyricInfo(params: GetLyricInfoParams): Promise<LX.Player.LyricInfo> {
    const { musicInfo, isRefresh = false, onToggleSource = () => {} } = params
    const localMusicInfo = musicInfo as LX.Music.MusicInfoLocal

    if (!isRefresh) {
      const [lyricInfo, fileLyricInfo] = await Promise.all([
        getCachedLyricInfo(localMusicInfo),
        window.lx.worker.main.getMusicFileLyric(localMusicInfo.meta.filePath)
      ])
      if (lyricInfo?.lyric && lyricInfo.lyric != fileLyricInfo?.lyric) {
        return buildLyricInfo({ ...lyricInfo, rawlrcInfo: fileLyricInfo ?? lyricInfo.rawlrcInfo })
      }
      if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)
      if (lyricInfo?.lyric) return buildLyricInfo(lyricInfo)
    }

    try {
      return await getOnlineOtherSourceLyricByLocal(localMusicInfo, isRefresh)
        .then(({ lyricInfo, isFromCache }) => {
          if (!isFromCache) void saveLyric(localMusicInfo, lyricInfo)
          return buildLyricInfo(lyricInfo)
        })
    } catch {}

    onToggleSource()
    return getOtherSourceByLocal(localMusicInfo, async (otherSource) => {
      return getOnlineOtherSourceLyricInfo({
        musicInfos: [...otherSource],
        onToggleSource,
        isRefresh,
      }).then(async ({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
        void saveLyric(localMusicInfo, lyricInfo)
        if (isFromCache) return buildLyricInfo(lyricInfo)
        void saveLyric(targetMusicInfo, lyricInfo)
        return buildLyricInfo(lyricInfo)
      })
    })
  }
}