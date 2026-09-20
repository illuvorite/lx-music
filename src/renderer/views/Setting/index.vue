<template>
  <div class="view-fullcover" data-fullcover :class="$style.main">
      <!-- 无边框窗口：顶部拖拽区（覆盖工具栏后自备） -->
    <div :class="$style.dragBar" />
    <div class="scroll" :class="$style.toc">
      <div :class="$style.tocHead">
        <button type="button" :class="$style.backBtn" aria-label="返回" title="返回" @click="handleBack">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          返回
        </button>
        <h1 :class="$style.pageTitle">设置</h1>
      </div>
      <ul :class="$style.tocList" role="toolbar">
        <li v-for="h2 in tocList" :key="h2.id" :class="$style.tocListItem" role="presentation">
          <h2
            :class="[$style.tocH2, {[$style.active]: avtiveComponentName == h2.id }]"
            role="tab" :aria-selected="avtiveComponentName == h2.id"
            :aria-label="h2.title" ignore-tip @click="toggleTab(h2.id)"
          >
            <transition name="list-active">
              <svg-icon v-if="avtiveComponentName == h2.id" name="angle-right-solid" :class="$style.activeIcon" />
            </transition>
            {{ h2.title }}
          </h2>
          <!-- <ul v-if="h2.children.length" :class="$style.tocList">
            <li v-for="h3 in h2.children" :key="h3.id" :class="$style.tocSubListItem">
              <h3 :class="[$style.tocH3, toc.activeId == h3.id ? $style.active : null]" :aria-label="h3.title">
                <a :href="'#' + h3.id" @click.stop="toc.activeId = h3.id">{{ h3.title }}</a>
              </h3>
            </li>
          </ul> -->
        </li>
      </ul>
    </div>
    <!-- 窗口控制按钮（最小化 / 最大化 / 关闭），全屏设置页时工具栏被隐藏，这里补上 -->
    <div :class="$style.winControls">
      <win-control-btns />
    </div>
    <div ref="dom_content_ref" class="scroll" :class="$style.setting">
      <dl>
        <component :is="avtiveComponentName" />
        <!-- <SettingBasic />
        <SettingPlay />
        <SettingPlayDetail />
        <SettingDesktopLyric />
        <SettingSearch />
        <SettingList />
        <SettingDownload />
        <SettingSync />
        <SettingHotKey />
        <SettingNetwork />
        <SettingOdc />
        <SettingBackup />
        <SettingOther />
        <SettingUpdate />
        <SettingAbout /> -->
      </dl>
      </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from '@common/utils/vueTools'
// import { currentStting } from './setting'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute, useRouter } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingUpdate from './components/SettingUpdate.vue'
import SettingAbout from './components/SettingAbout.vue'
import WinControlBtns from '@renderer/components/layout/Toolbar/ControlBtns.vue'

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingUpdate,
    SettingAbout,
    WinControlBtns,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()
    const router = useRouter()

    const dom_content_ref = ref(null)

    const handleBack = () => {
      router.push('/home').catch(() => {})
    }

    const tocList = computed(() => {
      return [
        { id: 'SettingBasic', title: t('setting__basic') },
        { id: 'SettingPlay', title: t('setting__play') },
        { id: 'SettingPlayDetail', title: t('setting__play_detail') },
        { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric') },
        { id: 'SettingSearch', title: t('setting__search') },
        { id: 'SettingList', title: t('setting__list') },
        { id: 'SettingDownload', title: t('setting__download') },
        { id: 'SettingHotKey', title: t('setting__hot_key') },
        { id: 'SettingSync', title: t('setting__sync') },
        { id: 'SettingOpenAPI', title: t('setting__open_api') },
        { id: 'SettingNetwork', title: t('setting__network') },
        { id: 'SettingOdc', title: t('setting__odc') },
        { id: 'SettingBackup', title: t('setting__backup') },
        { id: 'SettingOther', title: t('setting__other') },
        { id: 'SettingUpdate', title: t('setting__update') },
        { id: 'SettingAbout', title: t('setting__about') },
      ]
    })

    const avtiveComponentName = ref(route.query.name && tocList.value.some(t => t.id == route.query.name)
      ? route.query.name
      : tocList.value[0].id)

    const toggleTab = id => {
      avtiveComponentName.value = id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      })
    }

    return {
      tocList,
      avtiveComponentName,
      dom_content_ref,
      toggleTab,
      handleBack,
    }
  },
  // mounted() {
  //   this.initTOC()
  // },
  // methods: {
  //   initTOC() {
  //     const list = this.$refs.dom_setting_list.children
  //     const toc = []
  //     let prevTitle
  //     for (const item of list) {
  //       if (item.tagName == 'DT') {
  //         prevTitle = {
  //           title: item.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: item.getAttribute('id'),
  //           dom: item,
  //           children: [],
  //         }
  //         toc.push(prevTitle)
  //         continue
  //       }
  //       const h3 = item.querySelector('h3')
  //       if (h3) {
  //         prevTitle.children.push({
  //           title: h3.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: h3.getAttribute('id'),
  //           dom: h3,
  //         })
  //       }
  //     }
  //     console.log(toc)
  //     this.toc.list = toc
  //   },
  //   handleListScroll(event) {
  //     // console.log(event.target.scrollTop)
  //   },
  // },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  // 全屏覆盖整个应用视口（底部留出播放栏），不改变外层布局 → 进入/离开无跳动、无残留
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(@height-player + var(--home-gap-panel));
  // 层级契约：高于工具栏(40)；低于播放详情页(65)、teleport 弹层(70)、全局弹窗(99)
  // （在设置页打开播放详情时由详情页整页接管，关闭后回到设置页）
  z-index: 60;
  display: flex;
  flex-flow: row nowrap;
  overflow: hidden;
  // 设置页为功能性全屏页：底色要比面板（--qm-surface，82%）更实，
  // 避免底下的工具栏/壁纸透出形成「幽灵」导致文字看不清
  background-color: color-mix(in srgb, var(--color-main-background) 94%, transparent);
  animation: lxSettingIn 170ms ease-out both;
}

@keyframes lxSettingIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// 顶部拖拽条（无边框窗口）
.dragBar {
  position: absolute;
  top: 0;
  left: 220px; // 避开左侧「返回」按钮
  right: 168px; // 避开右上角窗口控制按钮
  height: 48px;
  z-index: 1;
  -webkit-app-region: drag;
}

// 右上角窗口控制按钮（悬浮于内容之上）
.winControls {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 5;
  -webkit-app-region: no-drag;
}

.toc {
  flex: 0 0 220px;
  min-width: 200px;
  padding: 16px 12px;
  border-right: 1px solid var(--color-border-subtle);
  background-color: var(--qm-surface);
}

.tocHead {
  position: relative;
  z-index: 6; // 高于顶部拖拽条，保证「返回」可点击
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  padding: 2px 6px 14px;
  margin-bottom: 4px;
}

.backBtn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px 4px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--qm-text-3);
  font-size: 13px;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  svg { display: block; }

  &:hover {
    background-color: var(--color-button-background-hover);
    color: var(--qm-primary);
  }
}

.pageTitle {
  margin: 0;
  padding-left: 6px;
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  color: var(--qm-text-1);
}
.tocH2 {
  line-height: 1.5;
  .mixin-ellipsis-1();
  font-size: 13px;
  font-weight: 500;
  color: var(--color-font);
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: var(--color-button-background-hover);
      color: var(--color-accent);
    }
  }
  &.active {
    color: var(--qm-primary);
    background-color: var(--qm-primary-soft);
    font-weight: 600;
  }
}
.activeIcon {
  height: .9em;
  width: .9em;
  margin-left: -0.45em;
  vertical-align: -0.05em;
  color: var(--qm-primary);
}
// .tocH3 {
//   font-size: 13px;
//   opacity: .8;
// }

// .tocList {
//   .tocList {
//     // padding-left: 15px;
//   }
// }
// .tocSubListItem {
//   padding-top: 10px;
// }

.setting {
  padding: 20px 40px 40px;
  font-size: 14px;
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;
  position: relative;
  width: 100%;

  // 内容居中限宽：大屏下不显得空散，普通窗口内充分利用空间
  > :global(dl) {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  :global {
    // 分组标题：QQ 风格为纯深色粗体（不再用主题色竖条）
    dt {
      padding: 0;
      margin: 22px 0 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--qm-text-1);
      transition: background-color @transition-base;

      + dd h3 {
        margin-top: 0;
      }
    }

    // 分组内容：白卡承载，与浅灰底形成层次
    dd {
      margin: 0 0 6px;
      border-radius: 8px;
      background-color: var(--qm-card);
      box-shadow: 0 1px 2px rgba(0, 0, 0, .04);

      > div {
        padding: 0 16px;
      }
    }
    h3 {
      font-size: 13px;
      font-weight: 600;
      margin: 22px 0 14px;
      color: var(--color-font);
    }
    .p {
      padding: 8px 0;
      line-height: 1.45;
      .btn {
        + .btn {
          margin-left: 10px;
        }
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.4em;
      border: none;
      background: none;
      color: var(--color-button-font);
      cursor: pointer;
      transition: opacity @transition-fast, color @transition-fast;
      &:hover {
        color: var(--color-accent);
        opacity: 1;
      }
    }
    .help-icon {
      margin: 0 0.4em;
    }
  }
}

// .btn-content {
//   display: inline-block;
//   transition: @transition-theme;
//   transition-property: opacity, transform;
//   opacity: 1;
//   transform: scale(1);

//   &.hide {
//     opacity: 0;
//     transform: scale(0);
//   }
// }


// :global(dt):target, :global(h3):target {
//   animation: highlight 1s ease;
// }

// @keyframes highlight {
//   from { background: yellow; }
//   to { background: transparent; }
// }

</style>

