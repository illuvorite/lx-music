<template>
  <div :class="$style.btns">
    <button v-if="playBtn" type="button" :aria-label="$t('list__play')" @contextmenu.capture.stop @click.stop="handleClick('play')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
      </svg>
    </button>
    <button
      v-if="likeBtn" type="button" :class="{ [$style.liked]: liked }"
      :aria-label="liked ? '取消收藏' : '收藏'" @contextmenu.capture.stop @click.stop="handleClick('like')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path
          d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z"
          :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"
        />
      </svg>
    </button>
    <button v-if="downloadBtn" type="button" :aria-label="$t('list__download')" @contextmenu.capture.stop @click.stop="handleClick('download')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M12 4v11m0 0l-4-4m4 4l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>
    <button v-if="listAddBtn" type="button" :aria-label="$t('list__add_to')" @contextmenu.capture.stop @click.stop="handleClick('listAdd')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M12 8.6v6.8M8.6 12h6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
    <button v-if="moreBtn" type="button" :aria-label="$t('action')" @contextmenu.capture.stop @click.stop="handleClick('more', $event)">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
      </svg>
    </button>
    <button v-if="removeBtn" type="button" :aria-label="$t('list__remove')" @contextmenu.capture.stop @click.stop="handleClick('remove')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M6 7h12M10 7V5h4v2M8 7l.8 12h6.4L16 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      </svg>
    </button>
    <button v-if="searchBtn" type="button" :aria-label="$t('list__search')" @contextmenu.capture.stop @click.stop="handleClick('search')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M15.5 15.5L20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
    </button>
    <button v-if="startBtn" type="button" :aria-label="$t('list__start')" @contextmenu.capture.stop @click.stop="handleClick('start')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
    </button>
    <button v-if="pauseBtn" type="button" :aria-label="$t('list__pause')" @contextmenu.capture.stop @click.stop="handleClick('pause')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 5h2.5v14H9zM12.5 5H15v14h-2.5z" fill="currentColor" /></svg>
    </button>
    <button v-if="fileBtn" type="button" :aria-label="$t('list__file')" @contextmenu.capture.stop @click.stop="handleClick('file')">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
        <path d="M14 3v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<script>
import { appSetting } from '@renderer/store/setting'

export default {
  props: {
    index: {
      type: Number,
      required: true,
    },
    startBtn: {
      type: Boolean,
      default: false,
    },
    pauseBtn: {
      type: Boolean,
      default: false,
    },
    removeBtn: {
      type: Boolean,
      default: false,
    },
    downloadBtn: {
      type: Boolean,
      default: true,
    },
    playBtn: {
      type: Boolean,
      default: true,
    },
    listAddBtn: {
      type: Boolean,
      default: true,
    },
    // 收藏（我喜欢）
    likeBtn: {
      type: Boolean,
      default: true,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    // 更多（打开该行右键菜单）
    moreBtn: {
      type: Boolean,
      default: true,
    },
    searchBtn: {
      type: Boolean,
      default: false,
    },
    fileBtn: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['btn-click'],
  setup() {
    return {
      appSetting,
    }
  },
  methods: {
    handleClick(action, event) {
      // 带上原生事件：行内「更多」需要用它定位弹出菜单
      this.$emit('btn-click', { action, index: this.index, event })
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btns {
  line-height: 1.2;
  display: inline-flex;
  gap: 2px;

  button {
    background-color: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    width: 26px;
    height: 26px;
    padding: 0;
    color: var(--qm-text-3);
    outline: none;
    transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;

    svg { transition: transform @transition-fast; }

    &:hover {
      background-color: var(--qm-primary-soft);
      color: var(--qm-primary);
      svg { transform: scale(1.1); }
    }
    &:active {
      background-color: var(--qm-primary);
      color: #fff;
      transform: scale(.92);
    }
  }

  // 已收藏：红心
  .liked {
    color: #f0484b;
    &:hover { color: #f0484b; background-color: rgba(240, 72, 75, .1); }
  }
}

</style>
