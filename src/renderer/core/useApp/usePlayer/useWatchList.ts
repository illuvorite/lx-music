import { onBeforeUnmount } from '@common/utils/vueTools'

import { playInfo, playMusicInfo } from '@renderer/store/player/state'
import { setPlayMusicInfo, updatePlayIndex } from '@renderer/store/player/action'
import { throttle } from '@common/utils'
import { playNext, stop } from '@renderer/core/player'
import { loveList } from '@renderer/store/list/state'

const changedListIds = new Set<string | null>()

export default () => {
  const throttleListChange = throttle(() => {
    // loveList（我喜欢）是收藏列表，其变更永远不应触发自动切歌
    // 无论当前播放列表是否为 loveList，取消喜欢都应保持当前歌曲继续播放
    const hasPlayingListChange = changedListIds.has(playInfo.playerListId) || changedListIds.has(playMusicInfo.listId)
    const onlyLoveListChanged = Array.from(changedListIds).every(id => id === loveList.id)
    const isSkip = playMusicInfo.listId && (!hasPlayingListChange || onlyLoveListChanged)
    changedListIds.clear()
    if (isSkip) return

    const { playIndex } = updatePlayIndex()
    if (playIndex < 0) { // 歌曲被移除
      if (window.lx.isPlayedStop) {
        stop()
        setTimeout(() => {
          setPlayMusicInfo(null, null)
        })
      } else if (!playMusicInfo.isTempPlay) {
        console.log('current music removed')
        void playNext(true)
      }
    }
  })

  const handleListChange = (listIds: string[]) => {
    for (const id of listIds) {
      changedListIds.add(id)
    }
    throttleListChange()
  }

  const handleDownloadListChange = () => {
    handleListChange(['download'])
  }

  window.app_event.on('myListUpdate', handleListChange)
  window.app_event.on('downloadListUpdate', handleDownloadListChange)

  onBeforeUnmount(() => {
    window.app_event.off('myListUpdate', handleListChange)
    window.app_event.off('downloadListUpdate', handleDownloadListChange)
  })
}
