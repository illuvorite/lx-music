<template>
  <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
    <div v-show="props.visible" :class="[$style.blank, 'qm-scroll']">
      <template v-if="appSetting['search.isShowHotSearch'] || historyList.length">
        <!-- 热搜榜 -->
        <section v-if="appSetting['search.isShowHotSearch']" :class="$style.block">
          <header :class="$style.blockHeader">
            <h2 :class="$style.blockTitle">{{ $t('search__hot_search') }}</h2>
            <span :class="$style.blockMeta">{{ sourceName }}</span>
          </header>
          <ul :class="$style.hotList">
            <li
              v-for="(item, index) in hotSearchList" :key="index"
              :class="$style.hotItem"
              :title="item"
              @click="handleSearch(item)"
            >
              <span :class="[$style.hotRank, index < 3 && $style.hotRankTop]">{{ index + 1 }}</span>
              <span :class="$style.hotText">{{ item }}</span>
            </li>
          </ul>
        </section>

        <!-- 搜索历史 -->
        <section v-if="historyList.length" :class="$style.block">
          <header :class="$style.blockHeader">
            <h2 :class="$style.blockTitle">{{ $t('history_search') }}</h2>
            <button
              type="button" :class="$style.clearBtn"
              :aria-label="$t('history_clear')" :title="$t('history_clear')"
              @click="clearHistoryList"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M4.5 7h15M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7M6.5 7l.9 11.1A1.9 1.9 0 0 0 9.3 20h5.4a1.9 1.9 0 0 0 1.9-1.9L17.5 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              清空
            </button>
          </header>
          <ul :class="$style.historyList">
            <li
              v-for="(item, index) in historyList" :key="index + item"
              :class="$style.historyItem"
              :aria-label="$t('history_remove')"
              :title="item"
              @contextmenu="removeHistoryWord(index)"
              @click="handleSearch(item)"
            >{{ item }}</li>
          </ul>
        </section>
      </template>

      <div v-else :class="$style.welcome">
        <svg-icon name="search" :class="$style.welcomeIcon" />
        <p :class="$style.welcomeText">{{ $t('search__welcome') }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch, shallowRef } from '@common/utils/vueTools'
import { historyList } from '@renderer/store/search/state'
import { getHistoryList, removeHistoryWord, clearHistoryList } from '@renderer/store/search/action'
import { getList } from '@renderer/store/hotSearch'
import { appSetting } from '@renderer/store/setting'
import { sourceNames } from '@renderer/store'
import { useRouter } from '@common/utils/vueRouter'

const props = defineProps({
  visible: Boolean,
  source: {
    type: String,
    required: true,
  },
})

const sourceName = computed(() => sourceNames.value[props.source] || '热搜')

const hotSearchList = shallowRef([])

if (appSetting['search.isShowHotSearch']) {
  watch(() => props.visible, (visible) => {
    if (!visible) return
    void getList(props.source).then(list => {
      hotSearchList.value = list
    })
  }, {
    immediate: true,
  })

  watch(() => props.source, (source) => {
    if (!props.visible) return
    void getList(source).then(list => {
      if (source != props.source) return
      hotSearchList.value = list
    })
  })
}

if (appSetting['search.isShowHistorySearch']) {
  void getHistoryList()
}

const router = useRouter()
const handleSearch = (text) => {
  void router.replace({
    path: '/search',
    query: {
      text,
    },
  })
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.blank {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: var(--qm-content-pad-top) var(--qm-content-pad-right) var(--qm-s7) var(--qm-content-pad-left);
  overflow: hidden auto;
}

.block {
  + .block { margin-top: var(--qm-s7); }
}

.blockHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-s3);
  margin-bottom: var(--qm-s4);
}

.blockTitle {
  margin: 0;
  font-size: var(--qm-font-title-lg);
  font-weight: 700;
  line-height: 22px;
  color: var(--qm-text-1);
}

.blockMeta {
  font-size: var(--qm-font-meta);
  color: var(--qm-text-4);
}

.clearBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--qm-text-4);
  font-size: var(--qm-font-meta);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
  svg { display: block; }
}

// 热搜：两列序号榜
.hotList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--qm-s2) var(--qm-s6);
}

.hotItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s3);
  height: 32px;
  padding: 0 var(--qm-s2);
  border-radius: var(--qm-radius-btn);
  cursor: pointer;
  transition: background-color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-card);
    .hotText { color: var(--qm-primary); }
  }
}

.hotRank {
  flex: none;
  width: 18px;
  text-align: center;
  font-size: var(--qm-font-meta);
  font-weight: 600;
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.hotRankTop {
  color: #FF5A5F;
}

.hotText {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-font-meta);
  color: var(--qm-text-2);
  transition: color var(--qm-t-fast);
  .mixin-ellipsis-1();
}

// 历史：标签
.historyList {
  display: flex;
  flex-flow: row wrap;
  gap: var(--qm-s2);
}

.historyItem {
  max-width: 180px;
  padding: 0 12px;
  height: 28px;
  line-height: 28px;
  border-radius: var(--qm-radius-chip);
  background-color: var(--qm-card);
  color: var(--qm-text-2);
  font-size: var(--qm-font-meta);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);
  .mixin-ellipsis-1();

  &:hover {
    background-color: var(--qm-primary-soft);
    color: var(--qm-primary);
  }
}

.welcome {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-s3);
  color: var(--qm-text-4);

  .welcomeIcon { width: 56px; height: 56px; fill: currentColor; opacity: 0.4; }
  .welcomeText { margin: 0; font-size: var(--qm-font-body); }
}
</style>
