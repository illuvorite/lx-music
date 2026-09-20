import { qualityList } from '@renderer/store'
import { assertApiSupport } from '@renderer/store/utils'
import musicSdk from '@renderer/utils/musicSdk'
import {
  getMusicUrl as getStoreMusicUrl,
  getPlayerLyric as getStoreLyric,
  saveMusicUrl,
  saveLyric,
} from '@renderer/utils/ipc'
import { appSetting } from '@renderer/store/setting'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@renderer/utils'
import { requestMsg } from '@renderer/utils/message'
import { apis } from '@renderer/utils/musicSdk/api-source'
import { getOtherSource, buildLyricInfo, getCachedLyricInfo, getPlayQuality, TRY_QUALITYS_LIST } from '../utils'

const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/

export interface GetMusicUrlParams {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  quality?: LX.Quality
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}

export interface GetPicUrlParams {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  listId?: string | null
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}

export interface GetLyricInfoParams {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}

export interface ToggleSourceResult<T> {
  data: T
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isFromCache: boolean
}

abstract class MusicSourceStrategy {
  protected async getCachedOrFetch<T>(
    cacheKey: LX.Music.MusicInfo,
    quality: LX.Quality,
    fetcher: () => Promise<T>,
    isRefresh: boolean
  ): Promise<T> {
    const cached = await getStoreMusicUrl(cacheKey, quality)
    if (cached && !isRefresh) return cached as unknown as T
    return fetcher()
  }

  protected async handleToggleSourceMusicUrl(
    musicInfos: LX.Music.MusicInfoOnline[],
    quality: LX.Quality | undefined,
    onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void,
    isRefresh: boolean,
    retryedSource: LX.OnlineSource[] = []
  ): Promise<ToggleSourceResult<string>> {
    if (!await window.lx.apiInitPromise[0]) throw new Error('source init failed')

    let musicInfo: LX.Music.MusicInfoOnline | null = null
    let itemQuality: LX.Quality | null = null

    while (musicInfo = musicInfos.shift()!) {
      if (retryedSource.includes(musicInfo.source)) continue
      retryedSource.push(musicInfo.source)
      if (!assertApiSupport(musicInfo.source)) continue
      itemQuality = quality ?? getPlayQuality(appSetting['player.playQuality'], musicInfo)
      if (!musicInfo.meta._qualitys[itemQuality]) continue

      console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
      onToggleSource(musicInfo)
      break
    }
    if (!musicInfo || !itemQuality) throw new Error(window.i18n.t('toggle_source_failed'))

    const cachedUrl = await getStoreMusicUrl(musicInfo, itemQuality)
    if (cachedUrl && !isRefresh) return { data: cachedUrl, musicInfo, quality: itemQuality, isFromCache: true }

    let reqPromise: Promise<{ url: string; type: LX.Quality }>
    try {
      reqPromise = musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), itemQuality).promise
    } catch (err: any) {
      reqPromise = Promise.reject(err)
    }

    return reqPromise.then(({ url, type }) => {
      return { data: url, musicInfo, quality: type, isFromCache: false }
    }).catch((err: any) => {
      if (err.message == requestMsg.tooManyRequests) throw err
      console.log(err)
      return this.handleToggleSourceMusicUrl(musicInfos, quality, onToggleSource, isRefresh, retryedSource)
    })
  }

  protected async handleToggleSourcePicUrl(
    musicInfos: LX.Music.MusicInfoOnline[],
    onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void,
    isRefresh: boolean,
    retryedSource: LX.OnlineSource[] = []
  ): Promise<ToggleSourceResult<string>> {
    let musicInfo: LX.Music.MusicInfoOnline | null = null

    while (musicInfo = musicInfos.shift()!) {
      if (retryedSource.includes(musicInfo.source)) continue
      retryedSource.push(musicInfo.source)
      console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
      onToggleSource(musicInfo)
      break
    }
    if (!musicInfo) throw new Error(window.i18n.t('toggle_source_failed'))

    if (musicInfo.meta.picUrl && !isRefresh) return { data: musicInfo.meta.picUrl, musicInfo, isFromCache: true }

    let reqPromise: Promise<string>
    try {
      reqPromise = musicSdk[musicInfo.source].getPic(toOldMusicInfo(musicInfo))
    } catch (err: any) {
      reqPromise = Promise.reject(err)
    }

    return reqPromise.then((url: string) => {
      return { data: url, musicInfo, isFromCache: false }
    }).catch((err: any) => {
      console.log(err)
      return this.handleToggleSourcePicUrl(musicInfos, onToggleSource, isRefresh, retryedSource)
    })
  }

  protected async handleToggleSourceLyricInfo(
    musicInfos: LX.Music.MusicInfoOnline[],
    onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void,
    isRefresh: boolean,
    retryedSource: LX.OnlineSource[] = []
  ): Promise<ToggleSourceResult<LX.Music.LyricInfo>> {
    let musicInfo: LX.Music.MusicInfoOnline | null = null

    while (musicInfo = musicInfos.shift()!) {
      if (retryedSource.includes(musicInfo.source)) continue
      retryedSource.push(musicInfo.source)
      console.log('try toggle to: ', musicInfo.source, musicInfo.name, musicInfo.singer, musicInfo.interval)
      onToggleSource(musicInfo)
      break
    }
    if (!musicInfo) throw new Error(window.i18n.t('toggle_source_failed'))

    if (!isRefresh) {
      const lyricInfo = await getCachedLyricInfo(musicInfo)
      if (lyricInfo) return { data: lyricInfo as LX.Music.LyricInfo, musicInfo, isFromCache: true }
    }

    let reqPromise: Promise<LX.Music.LyricInfo>
    try {
      reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
    } catch (err: any) {
      reqPromise = Promise.reject(err)
    }

    return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
      return existTimeExp.test(lyricInfo.lyric) ? {
        data: lyricInfo,
        musicInfo,
        isFromCache: false,
      } : Promise.reject(new Error('failed'))
    }).catch((err: any) => {
      console.log(err)
      return this.handleToggleSourceLyricInfo(musicInfos, onToggleSource, isRefresh, retryedSource)
    })
  }

  abstract getMusicUrl(params: GetMusicUrlParams): Promise<string>
  abstract getPicUrl(params: GetPicUrlParams): Promise<string>
  abstract getLyricInfo(params: GetLyricInfoParams): Promise<LX.Player.LyricInfo>
}

export { MusicSourceStrategy }