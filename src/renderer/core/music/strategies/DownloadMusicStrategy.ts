import { getDownloadFilePath } from '@renderer/utils/music'
import { buildSavePath } from '@renderer/store/download/utils'
import { MusicSourceStrategy, GetMusicUrlParams, GetPicUrlParams, GetLyricInfoParams } from './MusicSourceStrategy'
import { handleGetOnlineMusicUrl, handleGetOnlinePicUrl, handleGetOnlineLyricInfo, buildLyricInfo, getCachedLyricInfo } from '../utils'

export class DownloadMusicStrategy extends MusicSourceStrategy {
  async getMusicUrl(params: GetMusicUrlParams): Promise<string> {
    const { musicInfo, isRefresh = false, allowToggleSource = true, onToggleSource = () => {} } = params
    const downloadMusicInfo = musicInfo as LX.Download.ListItem

    if (!isRefresh) {
      const path = await getDownloadFilePath(downloadMusicInfo, buildSavePath(downloadMusicInfo))
      if (path) return path
    }

    const result = await handleGetOnlineMusicUrl({
      musicInfo: downloadMusicInfo.metadata.musicInfo,
      isRefresh,
      onToggleSource,
      allowToggleSource,
    })
    return result.url
  }

  async getPicUrl(params: GetPicUrlParams): Promise<string> {
    const { musicInfo, isRefresh = false, listId, onToggleSource = () => {} } = params
    const downloadMusicInfo = musicInfo as LX.Download.ListItem

    if (!isRefresh) {
      const path = await getDownloadFilePath(downloadMusicInfo, buildSavePath(downloadMusicInfo))
      if (path) {
        const pic = await window.lx.worker.main.getMusicFilePic(path)
        if (pic) return pic
      }
      const onlineMusicInfo = downloadMusicInfo.metadata.musicInfo
      if (onlineMusicInfo.meta.picUrl) return onlineMusicInfo.meta.picUrl
    }

    const result = await handleGetOnlinePicUrl({
      musicInfo: downloadMusicInfo.metadata.musicInfo,
      isRefresh,
      onToggleSource,
      allowToggleSource: true,
    })
    return result.url
  }

  async getLyricInfo(params: GetLyricInfoParams): Promise<LX.Player.LyricInfo> {
    const { musicInfo, isRefresh = false, onToggleSource = () => {} } = params
    const downloadMusicInfo = musicInfo as LX.Download.ListItem

    if (!isRefresh) {
      const lyricInfo = await getCachedLyricInfo(downloadMusicInfo.metadata.musicInfo)
      if (lyricInfo) return buildLyricInfo(lyricInfo)
    }

    try {
      const result = await handleGetOnlineLyricInfo({
        musicInfo: downloadMusicInfo.metadata.musicInfo,
        isRefresh,
        onToggleSource,
        allowToggleSource: true,
      })
      return buildLyricInfo(result.lyricInfo as LX.Music.LyricInfo)
    } catch {
      const path = await getDownloadFilePath(downloadMusicInfo, buildSavePath(downloadMusicInfo))
      if (path) {
        const rawlrcInfo = await window.lx.worker.main.getMusicFileLyric(path)
        if (rawlrcInfo) return buildLyricInfo(rawlrcInfo)
      }
      throw new Error('failed')
    }
  }
}