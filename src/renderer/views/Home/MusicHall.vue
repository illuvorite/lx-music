<template>
  <div :class="$style.page" class="qm-scroll">
    <header :class="$style.head">
      <h1 :class="$style.title">乐馆</h1>
      <nav :class="$style.tabs">
        <button v-for="item in tabs" :key="item.id" type="button" :class="[$style.tab, { [$style.tabActive]: tab === item.id }]" @click="tab = item.id">{{ item.label }}</button>
      </nav>
      <SourceTabs :model-value="source" @change="handleSourceChange" />
    </header>

    <template v-if="tab === 'featured'">
      <section v-if="banners.length" :class="$style.banner" @mouseenter="paused = true" @mouseleave="paused = false">
        <div :class="$style.bannerTrack" :style="{ transform: `translateX(-${bannerIndex * 100}%)` }">
          <div v-for="item in banners" :key="item.id" :class="$style.bannerSlide" @click="openPlaylist(item)">
            <img :src="item.img" alt="" loading="lazy">
            <span :class="$style.bannerMask" />
            <span :class="$style.bannerName" :title="item.name">{{ item.name }}</span>
          </div>
        </div>
        <div :class="$style.bannerDots">
          <i v-for="(item, index) in banners" :key="index" :class="{ [$style.dotActive]: index === bannerIndex }" @click.stop="bannerIndex = index" />
        </div>
      </section>

      <section v-for="sec in sections" :key="sec.key" :class="$style.block">
        <div :class="$style.blockHead">
          <h2 :class="$style.blockTitle">{{ sec.title }}<span v-if="sec.sub" :class="$style.blockSub">{{ sec.sub }}</span></h2>
          <button type="button" :class="$style.more" @click="goSquare(sec.sortId)">
            更多
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>
        <div :class="$style.row">
          <div v-for="item in sec.list" :key="item.id" :class="$style.card" @click="openPlaylist(item)">
            <div :class="$style.cardCover">
              <img v-if="item.img" :src="item.img" alt="" loading="lazy">
              <span v-else class="row-cover-empty"><svg-icon name="music" /></span>
              <span v-if="item.play_count" :class="$style.cardPlay">{{ item.play_count }}</span>
            </div>
            <p :class="$style.cardName" :title="item.name">{{ item.name }}</p>
            <p :class="$style.cardAuthor">{{ item.author || '—' }}</p>
          </div>
        </div>
      </section>
      <div v-if="!sections.length" :class="$style.tip">{{ loading ? '加载中…' : '该平台暂时没有取到歌单' }}</div>
    </template>

    <div v-else-if="tab === 'boards'" :class="$style.boards">
      <div v-for="board in boards" :key="board.id" :class="$style.board" @click="openBoard(board)">
        <div :class="$style.boardCover">
          <img v-if="board.img" :src="board.img" alt="" loading="lazy">
          <span v-else class="row-cover-empty"><svg-icon name="music" /></span>
        </div>
        <div :class="$style.boardInfo">
          <p :class="$style.boardName">{{ board.name }}</p>
          <p v-for="(song, index) in board.songs" :key="index" :class="$style.boardSong">
            <i>{{ index + 1 }}</i>
            <span :title="`${song.name} - ${song.singer}`">{{ song.name }}<template v-if="song.singer"> - {{ song.singer }}</template></span>
          </p>
        </div>
      </div>
      <div v-if="!boards.length" :class="$style.tip">{{ loading ? '加载中…' : '该平台暂时没有取到榜单' }}</div>
    </div>

    <div v-else :class="$style.squareTip">
      <p>分类歌单在「歌单广场」中浏览</p>
      <button type="button" :class="$style.btnGhost" @click="goSquare('')">前往歌单广场</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import SourceTabs from '@renderer/components/common/SourceTabs.vue'
import musicSdk from '@renderer/utils/musicSdk'
import { getInitialSource, saveSource } from '@renderer/utils/personalRecommend'

const router = useRouter()
const tabs = [
  { id: 'featured', label: '精选' },
  { id: 'boards', label: '排行榜' },
  { id: 'square', label: '分类歌单' },
]
const tab = ref('featured')
const source = ref(getInitialSource())
const loading = ref(false)
const banners = ref([])
const bannerIndex = ref(0)
const paused = ref(false)
const boards = ref([])
const officialList = ref([])
const newList = ref([])
const hotList = ref([])
const officialSortId = ref('')
const newSortId = ref('')
const hotSortId = ref('')

const sections = computed(() => ([
  // 部分平台「推荐/新歌」排序拿不到数据，回退用热门列表，避免空分区
  { key: 'official', title: '官方歌单', sub: '官方精选订阅歌单', sortId: officialSortId.value, list: officialList.value.length ? officialList.value : hotList.value },
  { key: 'new', title: '新歌首发', sub: '', sortId: newSortId.value, list: newList.value },
  { key: 'hot', title: '热门歌单', sub: '', sortId: hotSortId.value, list: hotList.value },
]).filter(sec => sec.list.length))

const parsePlayCount = (text) => {
  const match = /([\d.]+)\s*(亿|万)?/.exec(text ?? '')
  if (!match) return 0
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return 0
  if (match[2] === '亿') return value * 1e8
  if (match[2] === '万') return value * 1e4
  return value
}

const shuffle = (list) => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// 取一个排序下 2 页歌单并打乱：每次进入乐馆内容都不同
async function fetchPlaylistPool(sdk, sortId) {
  const pages = await Promise.all([1, 2].map(page => sdk.getList(sortId, '', page).catch(() => null)))
  return shuffle(pages.flatMap(page => (page?.list ?? []).filter(item => item?.id && item.name)))
}

async function loadFeatured() {
  loading.value = true
  try {
    const sdk = musicSdk[source.value]?.songList
    if (!sdk?.getList) return
    const sortList = sdk.sortList ?? []
    officialSortId.value = sortList[0]?.id ?? ''
    newSortId.value = (sortList.find(item => (item.name ?? '').includes('新')) ?? sortList[0])?.id ?? ''
    hotSortId.value = (sortList.find(item => (item.name ?? '').includes('热')) ?? sortList[0])?.id ?? ''
    const [official, fresh, hot] = await Promise.all([
      fetchPlaylistPool(sdk, officialSortId.value),
      fetchPlaylistPool(sdk, newSortId.value),
      fetchPlaylistPool(sdk, hotSortId.value),
    ])
    officialList.value = official.slice(0, 10)
    newList.value = fresh.slice(0, 10)
    hotList.value = hot.slice(0, 10)
    banners.value = [...official, ...hot]
      .sort((a, b) => parsePlayCount(b.play_count) - parsePlayCount(a.play_count))
      .slice(0, 5)
    bannerIndex.value = 0
  } finally {
    loading.value = false
  }
}

/** 排行榜：榜单封面 + 前 3 首歌（仿 QQ 乐馆「排行」） */
async function loadBoards() {
  loading.value = true
  try {
    const sdk = musicSdk[source.value]
    if (!sdk?.leaderboard?.getBoards) {
      boards.value = []
      return
    }
    const result = await sdk.leaderboard.getBoards().catch(() => null)
    const list = (result?.list ?? []).filter(board => board?.id).slice(0, 8)
    boards.value = list.map(board => ({ ...board, songs: [] }))
    await Promise.all(list.map(async(board, index) => {
      // tx 的 getList 第三参是 retryNum（传 3 会直接拒绝），所以只传页码
      const res = await sdk.leaderboard.getList(board.bangid || board.id, 1).catch(() => null)
      const songs = (res?.list ?? []).slice(0, 3).map(item => ({
        name: item.name ?? item.songName ?? '',
        singer: item.singer ?? '',
        img: item.img ?? '',
      }))
      boards.value[index] = {
        ...boards.value[index],
        img: board.img || songs[0]?.img || '',
        songs,
      }
    }))
  } finally {
    loading.value = false
  }
}

function reload() {
  bannerIndex.value = 0
  boards.value = []
  void loadFeatured()
  void loadBoards()
}

const handleSourceChange = (id) => {
  source.value = id
  saveSource(id)
  reload()
}

const openPlaylist = (item) => {
  void router.push({
    path: '/songList/detail',
    query: { source: item.source || source.value, id: item.id, picUrl: item.img ?? '', fromName: 'MusicHall' },
  }).catch(() => {})
}

const openBoard = (board) => {
  void router.push({
    path: '/home/board',
    query: { source: source.value, boardId: board.bangid || board.id, name: board.name, img: board.img || '' },
  }).catch(() => {})
}

const goSquare = (sortId) => {
  void router.push({ path: '/songList/list', query: { source: source.value, tagId: '', sortId } }).catch(() => {})
}

let timer = null
onMounted(() => {
  reload()
  timer = setInterval(() => {
    if (paused.value || banners.value.length < 2) return
    bannerIndex.value = (bannerIndex.value + 1) % banners.value.length
  }, 5000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.page {
  height: 100%;
  overflow-y: auto;
  background-color: var(--qm-surface);
}

.head {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-9, 24px);
  padding: 20px var(--qm-content-pad-right) 14px var(--qm-content-pad-left);
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.tabs { display: flex; align-items: center; gap: 22px; flex: none; }

.tab {
  position: relative;
  padding: 4px 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-md, 14px);
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color var(--qm-t-fast);
  &:hover { color: var(--qm-text-1); }
}

.tabActive {
  color: var(--qm-text-1);
  font-weight: var(--qm-fw-semibold, 600);
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -4px;
    width: 18px;
    height: 3px;
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: var(--qm-primary);
    transform: translateX(-50%);
  }
}

.banner {
  position: relative;
  margin: 4px var(--qm-content-pad-right) 28px var(--qm-content-pad-left);
  border-radius: var(--qm-radius-lg, 12px);
  overflow: hidden;
}

.bannerTrack { display: flex; transition: transform 500ms var(--qm-ease); }

.bannerSlide {
  position: relative;
  flex: none;
  width: 100%;
  aspect-ratio: 1080 / 340;
  cursor: pointer;
  background-color: var(--qm-field);
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.bannerMask { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.25), transparent 40%); }

.bannerName {
  position: absolute;
  left: 24px;
  bottom: 16px;
  max-width: 70%;
  font-size: var(--qm-fs-3xl, 20px);
  font-weight: var(--qm-fw-semibold, 600);
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,.4);
  .mixin-ellipsis-1();
}

.bannerDots {
  position: absolute;
  right: 18px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);

  i { width: 6px; height: 6px; border-radius: var(--qm-radius-2xs, 4px); background-color: rgba(255,255,255,.55); cursor: pointer; transition: width var(--qm-t-fast), background-color var(--qm-t-fast); }
}

.dotActive { width: 16px !important; background-color: #fff !important; }

.block { margin: 0 var(--qm-content-pad-right) 34px var(--qm-content-pad-left); }

.blockHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

.blockTitle {
  margin: 0;
  font-size: 19px;
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.blockSub { margin-left: 10px; font-size: var(--qm-fs-xs, 12px); font-weight: var(--qm-fw-regular, 400); color: var(--qm-text-4); }

.more {
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-0, 2px);
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  cursor: pointer;
  transition: color var(--qm-t-fast);
  &:hover { color: var(--qm-primary); }
}

.row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 4 * 16px) / 5);
  gap: var(--qm-sp-7, 16px);
  overflow-x: auto;
  padding-bottom: var(--qm-sp-2, 6px);
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.card { min-width: 0; cursor: pointer; }

.cardCover {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-cover);
  overflow: hidden;
  background-color: rgba(0,0,0,.04);
  img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform var(--qm-t-slow); }
}

.card:hover .cardCover img { transform: scale(1.05); }

.cardPlay {
  position: absolute;
  right: 6px;
  bottom: 6px;
  font-size: var(--qm-fs-2xs, 11px);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,.5);
  font-variant-numeric: tabular-nums;
}

.cardName {
  margin: 8px 0 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  .mixin-ellipsis-2();
}

.cardAuthor { margin: 4px 0 0; font-size: var(--qm-fs-xs, 12px); color: var(--qm-text-4); .mixin-ellipsis-1(); }

.boards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 4px var(--qm-content-pad-right) 30px var(--qm-content-pad-left);
}

// 仿 QQ 乐馆「排行」卡片：左封面 + 右榜单名 + 前 3 首
.board {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: var(--qm-sp-4, 10px);
  border-radius: var(--qm-radius-lg, 12px);
  background-color: var(--qm-hover);
  color: var(--qm-text-1);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), box-shadow var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-card);
    box-shadow: var(--qm-shadow-1);
    transform: translateY(-1px);
  }
}

.boardCover {
  flex: none;
  width: 104px;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-sm, 8px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .06);

  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.boardInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 5px;
  padding-right: var(--qm-sp-1, 4px);
}

.boardName {
  margin: 0 0 2px;
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.boardSong {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  margin: 0;
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);

  i {
    flex: none;
    width: 12px;
    font-style: normal;
    color: var(--qm-text-5);
    font-variant-numeric: tabular-nums;
  }

  span { min-width: 0; .mixin-ellipsis-1(); }
}

.tip { padding: 40px 0; text-align: center; font-size: var(--qm-fs-sm, 13px); color: var(--qm-text-4); }

.squareTip {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 60px 0;
  p { margin: 0; font-size: var(--qm-fs-sm, 13px); color: var(--qm-text-4); }
}

.btnGhost {
  padding: 6px 18px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-btn);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  &:hover { background-color: var(--qm-primary-soft-hover); }
}
</style>
