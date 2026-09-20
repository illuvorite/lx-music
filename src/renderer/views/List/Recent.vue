<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <h1 :class="$style.title">
        <svg-icon name="clock" :class="$style.titleIcon" />
        最近播放
      </h1>
      <span :class="$style.count">{{ displayedList.length }} 首</span>
    </header>
    <div :class="$style.content" class="scroll">
      <div v-if="!displayedList.length" :class="$style.empty">
        <svg-icon name="clock" :class="$style.emptyIcon" />
        <p>还没有播放记录</p>
        <p :class="$style.emptyHint">播放歌曲后会在这里显示</p>
      </div>
      <table v-else :class="$style.table">
        <thead>
          <tr>
            <th :class="$style.thNum">#</th>
            <th>歌曲标题</th>
            <th :class="$style.thSinger">歌手</th>
            <th :class="$style.thAlbum">专辑</th>
            <th :class="$style.thTime">时长</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in displayedList"
            :key="`${item.musicInfo?.id || ''}_${index}`"
            :class="[$style.row, { [$style.active]: isPlaying(item) }]"
            @dblclick="playMusic(item)"
          >
            <td :class="$style.tdNum">
              <span v-if="isPlaying(item)" :class="$style.playingIcon">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </span>
              <span v-else>{{ index + 1 }}</span>
            </td>
            <td :class="$style.tdName">
              <span>{{ item.musicInfo?.name || '—' }}</span>
            </td>
            <td :class="$style.tdSinger">
              <span>{{ item.musicInfo?.singer || '—' }}</span>
            </td>
            <td :class="$style.tdAlbum">
              <span>{{ item.musicInfo?.meta?.albumName || '—' }}</span>
            </td>
            <td :class="$style.tdTime">
              <span>{{ formatInterval(item.musicInfo?.interval) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { playedList, isPlay, playInfo } from '@renderer/store/player/state'
import { playListById } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'

export default {
  name: 'Recent',
  setup() {
    const displayedList = computed(() => {
      const src = playedList
      const seen = new Set()
      const list = []
      for (let i = src.length - 1; i >= 0; i--) {
        const it = src[i]
        const id = it.musicInfo?.id
        if (!id || seen.has(id)) continue
        seen.add(id)
        list.push(it)
        if (list.length >= 500) break
      }
      return list
    })

    const isPlaying = (item) => {
      return isPlay.value && playInfo.value.playInfo?.id === item.musicInfo?.id
    }

    const playMusic = (item) => {
      if (!item.musicInfo) return
      const ids = displayedList.value.map(it => it.musicInfo.id)
      const idx = ids.indexOf(item.musicInfo.id)
      if (idx < 0) return
      try {
        playListById(LIST_IDS.DEFAULT, idx)
      } catch (err) {
        console.error('playMusic failed:', err)
      }
    }

    const formatInterval = (sec) => {
      if (!sec) return '--:--'
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
      displayedList,
      isPlaying,
      playMusic,
      formatInterval,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  overflow: hidden;
  background-color: var(--qm-surface, var(--color-content-background));
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 12px;
  flex: none;
  border-bottom: 1px solid var(--color-divider, rgba(0,0,0,0.06));
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-font);
}

.titleIcon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  fill: currentColor;
}

.count {
  font-size: 12px;
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
}

.content {
  flex: auto;
  min-height: 0;
  overflow: auto;
  padding: 8px 0;
}

.empty {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-font-label, rgba(0,0,0,0.45));
  font-size: 14px;
  gap: 8px;
}

.emptyIcon {
  width: 64px;
  height: 64px;
  opacity: 0.4;
  fill: currentColor;
}

.emptyHint {
  font-size: 12px;
  opacity: 0.7;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--color-font);
}

.table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 12px;
  color: var(--color-font-label, rgba(0,0,0,0.55));
  font-weight: 500;
  border-bottom: 1px solid var(--color-divider, rgba(0,0,0,0.06));
}

.table td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-divider, rgba(0,0,0,0.04));
}

.row {
  cursor: pointer;
  transition: background-color 150ms ease;
}

.row:hover {
  background-color: var(--color-button-background-hover, rgba(0,0,0,0.04));
}

.row.active {
  background-color: var(--color-primary-light-300-alpha-700, rgba(0,0,0,0.04));
}

.thNum, .tdNum {
  width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-font-label, rgba(0,0,0,0.55));
}

.thSinger, .tdSinger {
  width: 20%;
}

.thAlbum, .tdAlbum {
  width: 25%;
  color: var(--color-font-label, rgba(0,0,0,0.65));
}

.thTime, .tdTime {
  width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-font-label, rgba(0,0,0,0.55));
}

.playingIcon {
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
