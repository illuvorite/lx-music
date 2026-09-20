import { isEmpty, setPause, setPlay, setResource, setStop } from '@renderer/plugins/player'
import { isPlay, playedList, playInfo, playMusicInfo, tempPlayList, musicInfo as _musicInfo } from '@renderer/store/player/state'
import {
  getList,
  clearPlayedList,
  clearTempPlayeList,
  setPlayMusicInfo,
  addPlayedList,
  setMusicInfo,
  setAllStatus,
  removeTempPlayList,
  setPlayListId,
  removePlayedList,
} from '@renderer/store/player/action'
import { appSetting } from '@renderer/store/setting'
import { getMusicUrl, getPicPath, getLyricInfo } from '../music'
import { filterList } from './utils'
import { tryAutoSwitchSource } from './autoSwitchSource'
import { requestMsg } from '@renderer/utils/message'
import { getRandom } from '@renderer/utils/index'
import { addListMusics, removeListMusics } from '@renderer/store/list/action'
import { loveList } from '@renderer/store/list/state'
import { addDislikeInfo } from '@renderer/core/dislikeList'

let gettingUrlId = ''
const createGettingUrlId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const tInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo.meta.toggleMusicInfo : musicInfo.meta.toggleMusicInfo
  return `${musicInfo.id}_${tInfo?.id ?? ''}`
}

const createDelayNextTimeout = (delay: number) => {
  let timeout: NodeJS.Timeout | null
  const clearDelayNextTimeout = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    timeout = setTimeout(() => {
      timeout = null
      if (window.lx.isPlayedStop) return
      console.warn('delay next timeout timeout', delay)
      playbackController.playNext(true)
    }, delay)
  }
  return { clearDelayNextTimeout, addDelayNextTimeout }
}

const { addDelayNextTimeout, clearDelayNextTimeout } = createDelayNextTimeout(5000)
const { addDelayNextTimeout: addLoadTimeout, clearDelayNextTimeout: clearLoadTimeout } = createDelayNextTimeout(100000)

let cancelDelayRetry: (() => void) | null = null

const delayRetry = async (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false): Promise<string | null> => {
  return new Promise<string | null>((resolve, reject) => {
    const time = getRandom(2, 6)
    setAllStatus(window.i18n.t('player__getting_url_delay_retry', { time }))
    const tiemout = setTimeout(() => {
      getMusicPlayUrl(musicInfo, isRefresh, true).then((result) => {
        cancelDelayRetry = null
        resolve(result)
      }).catch(async (err: any) => {
        cancelDelayRetry = null
        reject(err)
      })
    }, time * 1000)
    cancelDelayRetry = () => {
      clearTimeout(tiemout)
      cancelDelayRetry = null
      resolve(null)
    }
  })
}

const getMusicPlayUrl = async (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false, isRetryed = false): Promise<string | null> => {
  setAllStatus(window.i18n.t('player__getting_url'))
  if (appSetting['player.autoSkipOnError']) addLoadTimeout()

  let toggleMusicInfo = ('progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo).meta.toggleMusicInfo

  return (toggleMusicInfo ? getMusicUrl({
    musicInfo: toggleMusicInfo,
    isRefresh,
    allowToggleSource: false,
  }) : Promise.reject(new Error('not found'))).catch(async () => {
    return getMusicUrl({
      musicInfo,
      isRefresh,
      onToggleSource(mInfo) {
        if (diffCurrentMusicInfo(musicInfo)) return
        setAllStatus(window.i18n.t('toggle_source_try'))
      },
    })
  }).then(url => {
    if (window.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo)) return null
    return url
  }).catch(err => {
    if (window.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo) || err.message == requestMsg.cancelRequest) return null
    if (err.message == requestMsg.tooManyRequests) return delayRetry(musicInfo, isRefresh)
    if (!isRetryed) return getMusicPlayUrl(musicInfo, isRefresh, true)
    throw err
  })
}

const diffCurrentMusicInfo = (curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem): boolean => {
  return gettingUrlId != createGettingUrlId(curMusicInfo) || curMusicInfo.id != playMusicInfo.musicInfo?.id || isPlay.value
}

class PlaybackController {
  setMusicUrl(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh?: boolean) {
    if (!diffCurrentMusicInfo(musicInfo)) return
    if (cancelDelayRetry) cancelDelayRetry()
    gettingUrlId = createGettingUrlId(musicInfo)
    void getMusicPlayUrl(musicInfo, isRefresh).then((url) => {
      if (!url) return
      setResource(url)
    }).catch(async(err: any) => {
      console.log(err)
      // 自动换源：命中则写入 meta.toggleMusicInfo 并重试（复用既有换源逻辑）
      const switched = await tryAutoSwitchSource(musicInfo).catch(() => null)
      if (switched) {
        const info = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
        info.meta.toggleMusicInfo = switched
        setAllStatus(window.i18n.t('player__auto_switch_source_tip', { source: switched.source }))
        this.setMusicUrl(musicInfo, true)
        return
      }
      setAllStatus(err.message)
      window.app_event.error()
      if (appSetting['player.autoSkipOnError']) addDelayNextTimeout()
    }).finally(() => {
      if (musicInfo === playMusicInfo.musicInfo) {
        gettingUrlId = ''
        clearLoadTimeout()
      }
    })
  }

  async handleRestorePlay(restorePlayInfo: LX.Player.SavedPlayInfo) {
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo) return

    setImmediate(() => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      window.app_event.setProgress(appSetting['player.isSavePlayTime'] ? restorePlayInfo.time : 0, restorePlayInfo.maxTime)
      window.app_event.pause()
    })

    void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id || url == _musicInfo.pic) return
      setMusicInfo({ pic: url })
      window.app_event.picUpdated()
    }).catch(_ => _)

    void getLyricInfo({ musicInfo }).then((lyricInfo) => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setMusicInfo({
        lrc: lyricInfo.lyric,
        tlrc: lyricInfo.tlyric,
        lxlrc: lyricInfo.lxlyric,
        rlrc: lyricInfo.rlyric,
        rawlrc: lyricInfo.rawlrcInfo.lyric,
      })
      window.app_event.lyricUpdated()
    }).catch((err) => {
      console.log(err)
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setAllStatus(window.i18n.t('lyric__load_error'))
    })

    if (appSetting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) {
      addPlayedList({ ...playMusicInfo as LX.Player.PlayMusicInfo })
    }
  }

  private handlePlay() {
    window.lx.isPlayedStop &&= false
    this.resetRandomNextMusicInfo()
    if (window.lx.restorePlayInfo) {
      void this.handleRestorePlay(window.lx.restorePlayInfo)
      window.lx.restorePlayInfo = null
      return
    }
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo) return

    setStop()
    window.app_event.pause()
    clearDelayNextTimeout()
    clearLoadTimeout()

    if (appSetting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) {
      addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })
    }

    this.setMusicUrl(musicInfo)

    void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id || url == _musicInfo.pic) return
      setMusicInfo({ pic: url })
      window.app_event.picUpdated()
    }).catch(_ => _)

    void getLyricInfo({ musicInfo }).then((lyricInfo) => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setMusicInfo({
        lrc: lyricInfo.lyric,
        tlrc: lyricInfo.tlyric,
        lxlrc: lyricInfo.lxlyric,
        rlrc: lyricInfo.rlyric,
        rawlrc: lyricInfo.rawlrcInfo.lyric,
      })
      window.app_event.lyricUpdated()
    }).catch((err) => {
      console.log(err)
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setAllStatus(window.i18n.t('lyric__load_error'))
    })

  }

  private handleToggleStop() {
    this.stop()
    setTimeout(() => {
      setPlayMusicInfo(null, null)
    })
  }

  private randomNextMusicInfo = {
    info: null as LX.Player.PlayMusicInfo | null,
  }

  resetRandomNextMusicInfo() {
    if (this.randomNextMusicInfo.info) {
      this.randomNextMusicInfo.info = null
    }
  }

  private async filterAndGetNext(isNext: boolean): Promise<{ filteredList: (LX.Music.MusicInfo | LX.Download.ListItem)[]; playerIndex: number } | null> {
    if (playMusicInfo.musicInfo == null) return null

    if (this.randomNextMusicInfo.info) return { filteredList: [this.randomNextMusicInfo.info.musicInfo], playerIndex: 0 }

    const currentListId = playInfo.playerListId
    if (!currentListId) return null
    const currentList = getList(currentListId)

    if (playedList.length) {
      let currentId: string
      if (playMusicInfo.isTempPlay) {
        const musicInfo = currentList[playInfo.playerPlayIndex]
        if (musicInfo) currentId = musicInfo.id
      } else {
        currentId = playMusicInfo.musicInfo.id
      }
      let index
      for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + (isNext ? 1 : -1); 
           isNext ? index < playedList.length : index > -1; 
           index += isNext ? 1 : -1) {
        const playMusicInfo = playedList[index]
        const currentId = playMusicInfo.musicInfo.id
        if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
          removePlayedList(index)
          continue
        }
        break
      }
      if (isNext ? index < playedList.length : index > -1) {
        return { filteredList: [playedList[index].musicInfo], playerIndex: 0 }
      }
    }

    let result = await filterList({
      listId: currentListId,
      list: currentList,
      playedList,
      playerMusicInfo: currentList[playInfo.playerPlayIndex],
      isNext,
    })
    return result
  }

  private applyPlayMode(filteredList: (LX.Music.MusicInfo | LX.Download.ListItem)[], playerIndex: number, togglePlayMethod: LX.AppSetting['player.togglePlayMethod'], isAutoToggle: boolean, isNext: boolean): number {
    if (!isAutoToggle) {
      switch (togglePlayMethod) {
        case 'list':
        case 'singleLoop':
        case 'none':
          togglePlayMethod = 'listLoop'
      }
    }
    let nextIndex = playerIndex
    switch (togglePlayMethod) {
      case 'listLoop':
        nextIndex = isNext 
          ? (playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1)
          : (playerIndex === 0 ? filteredList.length - 1 : playerIndex - 1)
        break
      case 'random':
        nextIndex = getRandom(0, filteredList.length)
        break
      case 'list':
        nextIndex = isNext
          ? (playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1)
          : (playerIndex === 0 ? -1 : playerIndex - 1)
        break
      case 'singleLoop':
        break
      default:
        return -1
    }
    return nextIndex
  }

  private handlePlayNext(playMusicInfo: LX.Player.PlayMusicInfo) {
    setPlayMusicInfo(playMusicInfo.listId, playMusicInfo.musicInfo, playMusicInfo.isTempPlay)
    this.handlePlay()
  }

  async playNext(isAutoToggle = false): Promise<void> {
    console.log('skip next', isAutoToggle)
    if (tempPlayList.length) {
      const playMusicInfo = tempPlayList[0]
      removeTempPlayList(0)
      this.handlePlayNext(playMusicInfo)
      console.log('play temp list')
      return
    }

    if (playMusicInfo.musicInfo == null) {
      this.handleToggleStop()
      console.log('musicInfo empty')
      return
    }

    const currentListId = playInfo.playerListId
    if (!currentListId) {
      this.handleToggleStop()
      console.log('currentListId empty')
      return
    }
    const currentList = getList(currentListId)

    if (playedList.length) {
      let currentId: string
      if (playMusicInfo.isTempPlay) {
        const musicInfo = currentList[playInfo.playerPlayIndex]
        if (musicInfo) currentId = musicInfo.id
      } else {
        currentId = playMusicInfo.musicInfo.id
      }
      let index
      for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + 1; index < playedList.length; index++) {
        const playMusicInfo = playedList[index]
        const currentId = playMusicInfo.musicInfo.id
        if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
          removePlayedList(index)
          continue
        }
        break
      }
      if (index < playedList.length) {
        this.handlePlayNext(playedList[index])
        console.log('play played list')
        return
      }
    }
    if (this.randomNextMusicInfo.info) {
      this.handlePlayNext(this.randomNextMusicInfo.info)
      return
    }

    const filteredResult = await this.filterAndGetNext(true)
    if (!filteredResult || !filteredResult.filteredList.length) {
      this.handleToggleStop()
      console.log('filtered list empty')
      return
    }
    let { filteredList, playerIndex } = filteredResult
    if (playerIndex == -1 && filteredList.length) playerIndex = 0

    let togglePlayMethod = appSetting['player.togglePlayMethod']
    const nextIndex = this.applyPlayMode(filteredList, playerIndex, togglePlayMethod, isAutoToggle, true)
    if (nextIndex < 0) {
      console.log('next index empty')
      return
    }

    this.handlePlayNext({
      musicInfo: filteredList[nextIndex],
      listId: currentListId,
      isTempPlay: false,
    })
  }

  async playPrev(isAutoToggle = false): Promise<void> {
    if (playMusicInfo.musicInfo == null) {
      this.handleToggleStop()
      return
    }

    const currentListId = playInfo.playerListId
    if (!currentListId) {
      this.handleToggleStop()
      return
    }
    const currentList = getList(currentListId)

    if (playedList.length) {
      let currentId: string
      if (playMusicInfo.isTempPlay) {
        const musicInfo = currentList[playInfo.playerPlayIndex]
        if (musicInfo) currentId = musicInfo.id
      } else {
        currentId = playMusicInfo.musicInfo.id
      }
      let index
      for (index = playedList.findIndex(m => m.musicInfo.id === currentId) - 1; index > -1; index--) {
        const playMusicInfo = playedList[index]
        const currentId = playMusicInfo.musicInfo.id
        if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
          removePlayedList(index)
          continue
        }
        break
      }
      if (index > -1) {
        this.handlePlayNext(playedList[index])
        return
      }
    }

    const filteredResult = await this.filterAndGetNext(false)
    if (!filteredResult || !filteredResult.filteredList.length) {
      this.handleToggleStop()
      return
    }
    let { filteredList, playerIndex } = filteredResult
    if (playerIndex == -1 && filteredList.length) playerIndex = 0

    let togglePlayMethod = appSetting['player.togglePlayMethod']
    const nextIndex = this.applyPlayMode(filteredList, playerIndex, togglePlayMethod, isAutoToggle, false)
    if (nextIndex < 0) return

    this.handlePlayNext({
      musicInfo: filteredList[nextIndex],
      listId: currentListId,
      isTempPlay: false,
    })
  }

  play() {
    window.lx.isPlayedStop &&= false
    if (playMusicInfo.musicInfo == null) return
    if (isEmpty()) {
      if (createGettingUrlId(playMusicInfo.musicInfo) != gettingUrlId) this.setMusicUrl(playMusicInfo.musicInfo)
      return
    }
    setPlay()
  }

  pause() {
    setPause()
  }

  stop() {
    setStop()
    setTimeout(() => {
      window.app_event.stop()
    })
  }

  togglePlay() {
    window.lx.isPlayedStop &&= false
    if (isPlay.value) {
      this.pause()
    } else {
      this.play()
    }
  }

  collectMusic() {
    if (!playMusicInfo.musicInfo) return
    void addListMusics(loveList.id, ['progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo])
  }

  uncollectMusic() {
    if (!playMusicInfo.musicInfo) return
    void removeListMusics({ listId: loveList.id, ids: ['progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo.id : playMusicInfo.musicInfo.id] })
  }

  async dislikeMusic() {
    if (!playMusicInfo.musicInfo) return
    const minfo = 'progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo
    await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
    await this.playNext(true)
  }

  async getNextPlayMusicInfo(): Promise<LX.Player.PlayMusicInfo | null> {
    return this.filterAndGetNext(true).then(result => {
      if (!result || !result.filteredList.length) return null
      let { filteredList, playerIndex } = result
      if (playerIndex == -1 && filteredList.length) playerIndex = 0

      let togglePlayMethod = appSetting['player.togglePlayMethod']
      const nextIndex = this.applyPlayMode(filteredList, playerIndex, togglePlayMethod, false, true)
      if (nextIndex < 0) return null

      return {
        musicInfo: filteredList[nextIndex],
        listId: playInfo.playerListId!,
        isTempPlay: false,
      }
    })
  }
}

export const playbackController = new PlaybackController()

export const setMusicUrl = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh?: boolean) => playbackController.setMusicUrl(musicInfo, isRefresh)
export const playListById = (listId: string, id: string) => {
  const prevListId = playInfo.playerListId
  setPlayListId(listId)
  const musicInfo = getList(listId).find(m => m.id == id)
  if (!musicInfo) return
  setPlayMusicInfo(listId, musicInfo)
  if (appSetting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  playbackController['handlePlay']()
}
export const playList = (listId: string, index: number) => {
  const prevListId = playInfo.playerListId
  setPlayListId(listId)
  setPlayMusicInfo(listId, getList(listId)[index])
  if (appSetting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  playbackController['handlePlay']()
}
export const playNext = (isAutoToggle?: boolean) => playbackController.playNext(isAutoToggle)
export const playPrev = (isAutoToggle?: boolean) => playbackController.playPrev(isAutoToggle)
export const play = () => playbackController.play()
export const pause = () => playbackController.pause()
export const stop = () => playbackController.stop()
export const togglePlay = () => playbackController.togglePlay()
export const collectMusic = () => playbackController.collectMusic()
export const uncollectMusic = () => playbackController.uncollectMusic()
export const dislikeMusic = () => playbackController.dislikeMusic()
export const resetRandomNextMusicInfo = () => playbackController.resetRandomNextMusicInfo()

export const getNextPlayMusicInfo = () => playbackController.getNextPlayMusicInfo()