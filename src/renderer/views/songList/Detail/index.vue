<template>
  <div :class="$style.container">
    <!-- 歌单头部：封面 + 信息 + 操作条 -->
    <div :class="$style.header">
      <div :class="$style.headerCover">
        <img
          v-if="picUrl || listDetailInfo.info.img"
          :src="picUrl || listDetailInfo.info.img" :alt="listDetailInfo.info.name"
        >
        <div v-else :class="$style.headerCoverPlaceholder">
          <svg-icon name="music" />
        </div>
      </div>

      <div :class="$style.headerInfo">
        <h1 :class="$style.headerTitle" :title="listDetailInfo.info.name">{{ listDetailInfo.info.name || '歌单' }}</h1>
        <p :class="$style.headerMeta">
          <span v-if="listDetailInfo.info.author">{{ listDetailInfo.info.author }}</span>
          <span v-if="listDetailInfo.total">共 {{ listDetailInfo.total }} 首</span>
          <span v-if="listDetailInfo.info.play_count">播放量 {{ listDetailInfo.info.play_count }}</span>
        </p>
        <p v-if="listDetailInfo.info.desc" :class="[$style.headerDesc, showFullDesc && $style.headerDescOpen]" :title="listDetailInfo.info.desc">
          {{ listDetailInfo.info.desc }}
        </p>

        <div :class="$style.headerActions">
          <button
            type="button" :class="$style.btnPrimary"
            :disabled="!!listDetailInfo.noItemLabel"
            @click="playSongListDetail(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
            </svg>
            播放全部
          </button>
          <button
            type="button" :class="$style.btnGhost"
            :disabled="!!listDetailInfo.noItemLabel"
            @click="addSongListDetail(listDetailInfo.id, listDetailInfo.source, listDetailInfo.info.name)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </svg>
            收藏歌单
          </button>
          <button v-if="listDetailInfo.info.desc" type="button" :class="$style.btnText" @click="showFullDesc = !showFullDesc">
            {{ showFullDesc ? '收起简介' : '展开简介' }}
          </button>
          <button type="button" :class="$style.btnText" @click="handleBack">{{ $t('back') }}</button>
        </div>
      </div>
    </div>
    <div :class="$style.list">
      <material-online-list
        ref="listRef"
        :page="listDetailInfo.page"
        :limit="listDetailInfo.limit"
        :total="listDetailInfo.total"
        :list="listDetailInfo.list"
        :no-item="listDetailInfo.noItemLabel"
        @play-list="handlePlayList"
        @toggle-page="togglePage"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { ref, watch } from '@common/utils/vueTools'
import { listDetailInfo } from '@renderer/store/songList/state'
import { setVisibleListDetail } from '@renderer/store/songList/action'
import { useRouter } from '@common/utils/vueRouter'
import { addSongListDetail, playSongListDetail } from './action'
import useList from './useList'
import useKeyBack from './useKeyBack'


const source = ref<LX.OnlineSource>('kw')
const id = ref<string>('')
const page = ref<number>(1)
const picUrl = ref<string>('')
const refresh = ref<boolean>(false)


interface Query {
  source?: string
  id?: string
  page?: string
  picUrl?: string
  refresh?: 'true'
  fromName?: string
}

const verifyQueryParams = async function(this: any, to: { query: Query, path: string }, from: any, next: (route?: { path: string, query: Query }) => void) {
  let _source = to.query.source
  let _id = to.query.id
  let _page: string | undefined = to.query.page
  let _picUrl: string | undefined = to.query.picUrl
  let _refresh: 'true' | undefined = to.query.refresh

  if (_source == null || _id == null) {
    if (listDetailInfo.key) {
      _source = listDetailInfo.source
      _id = listDetailInfo.id
      _page = listDetailInfo.page.toString()
      _picUrl = listDetailInfo.info.img
    } else {
      setVisibleListDetail(false)
      next({ path: '/songList/list', query: {} })
      return
    }

    next({
      path: to.path,
      query: { ...to.query, source: _source, id: _id, page: _page, picUrl: _picUrl, refresh: _refresh },
    })
    return
  }
  next()
  setVisibleListDetail(true)
  source.value = _source as LX.OnlineSource
  id.value = _id
  page.value = _page ? parseInt(_page) : 1
  picUrl.value = _picUrl ?? ''
  refresh.value = _refresh ? _refresh == 'true' : false
  if (to.query.fromName) window.lx.songListInfo.fromName = to.query.fromName
}


export default {
  beforeRouteEnter: verifyQueryParams,
  beforeRouteUpdate: verifyQueryParams,
  setup() {
    const router = useRouter()
    // 简介展开状态
    const showFullDesc = ref(false)

    const {
      listRef,
      listDetailInfo,
      getListData,
      handlePlayList,
    } = useList()


    const togglePage = (page: number) => {
      void getListData(source.value, id.value, page, refresh.value)
    }

    const handleBack = () => {
      setVisibleListDetail(false)
      if (window.lx.songListInfo.fromName) void router.replace({ name: window.lx.songListInfo.fromName })
      else router.back()
    }

    useKeyBack(handleBack)

    watch([source, id, page, refresh], async([_source, _id, _page, _refresh]) => {
      if (!_source || !_id) return router.replace({ path: '/songList/list' })
      // console.log(_source, _id, _page, _refresh, picUrl.value)
      // source.value = _source
      // id.value = _id
      // refresh.value = _refresh
      // page.value = _page ?? 1
      void getListData(_source, _id, _page, _refresh)
    }, {
      immediate: true,
    })

    return {
      source,
      id,
      page,
      picUrl,
      listDetailInfo,
      listRef,
      togglePage,
      addSongListDetail,
      playSongListDetail,
      handlePlayList,
      handleBack,
      showFullDesc,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  background-color: var(--qm-surface);
}

// ------- 歌单头部（QQ 音乐版式）-------
.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: var(--qm-s5);
  padding: var(--qm-s6) var(--qm-content-pad-right) var(--qm-s5) var(--qm-content-pad-left);
  background-color: var(--qm-surface);
}

.headerCover {
  position: relative;
  flex: none;
  width: 137px;
  height: 137px;
  border-radius: var(--qm-radius-card);
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.04);
  box-shadow: var(--qm-shadow-2);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.headerCoverPlaceholder {
  .qm-cover-placeholder();
  :global(.svg-icon) { width: 30px; height: 30px; fill: currentColor; }
}

.headerInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  gap: 6px;
}

.headerTitle {
  margin: 0;
  max-width: 100%;
  font-size: var(--qm-font-title-xl);
  font-weight: 700;
  line-height: 30px;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.headerMeta {
  margin: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-s4);
  font-size: var(--qm-font-meta);
  line-height: 18px;
  color: var(--qm-text-3);
}

.headerDesc {
  margin: 0;
  max-width: 100%;
  font-size: var(--qm-font-aux);
  line-height: 18px;
  color: var(--qm-text-4);
  .mixin-ellipsis(2);
}

// 展开：最多 5 行后内部滚动
.headerDescOpen {
  display: block;
  -webkit-line-clamp: initial;
  max-height: 90px;
  overflow-y: auto;
}

.headerActions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s3);
  margin-top: var(--qm-s2);
}

.btnPrimary {
  .qm-btn-primary();
  svg { display: block; }
}

.btnGhost {
  .qm-btn-ghost();
  svg { display: block; }
}

.btnText {
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-font-meta);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
}

.list {
  position: relative;
  width: 100%;
  min-height: 0;
  flex: auto;
  height: 100%;
  background-color: var(--qm-card);
}
</style>

