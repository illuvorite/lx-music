import { appSetting } from '@renderer/store/setting'
import { toNewMusicInfo } from '@renderer/utils'
import musicSdk from '@renderer/utils/musicSdk'

// 已经尝试过换源的歌曲（source_id），避免同一首歌反复搜索
const triedKeys = new Set<string>()

const getMusicInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): LX.Music.MusicInfoOnline | null => {
  const info = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  // 本地 / 下载列表中的歌曲没有在线来源，无法换源
  if (!info.meta || !('source' in info) || !info.source) return null
  if (info.source == 'local') return null
  return info as LX.Music.MusicInfoOnline
}

/**
 * 播放失败时尝试在其它音源里找同一首歌。
 * 命中则返回新的歌曲信息（调用方写入 meta.toggleMusicInfo 后重试即可复用既有换源逻辑）。
 */
export const tryAutoSwitchSource = async(
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
): Promise<LX.Music.MusicInfoOnline | null> => {
  if (!appSetting['player.autoSwitchSource']) return null
  const info = getMusicInfo(musicInfo)
  if (!info) return null
  const key = `${info.source}_${info.id}`
  if (triedKeys.has(key)) return null
  triedKeys.add(key)

  const lists = await musicSdk.searchMusic({
    name: info.name,
    singer: info.singer,
    source: '',
  })
  for (const item of lists) {
    const hit = item.list.find((music: any) =>
      music.name == info.name &&
      music.singer == info.singer &&
      !(music.source == info.source && music.id == info.id),
    )
    if (hit) return toNewMusicInfo(hit) as LX.Music.MusicInfoOnline
  }
  return null
}

export const resetAutoSwitchSource = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const info = getMusicInfo(musicInfo)
  if (!info) return
  triedKeys.delete(`${info.source}_${info.id}`)
}
