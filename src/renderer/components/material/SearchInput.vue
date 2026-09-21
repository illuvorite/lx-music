<template>
  <div :class="$style.container">
    <div :class="[$style.search, { [$style.active]: focus }, { [$style.big]: big }, { [$style.small]: small }]">
      <div :class="$style.form">
        <button type="button" :class="$style.iconBtn" :aria-label="$t('search')" ignore-tip @click="handleSearch">
          <slot>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <circle cx="10.6" cy="10.6" r="5.7" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path d="M14.9 14.9 19.5 19.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </slot>
        </button>
        <input
          ref="dom_input"
          v-model.trim="text"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
          @input="$emit('update:modelValue', text)"
          @change="sendEvent('change')"
          @keyup.enter="handleSearch"
          @keydown.arrow-down.arrow-up.prevent
          @keyup.arrow-down.prevent="handleKeyDown"
          @keyup.arrow-up.prevent="handleKeyUp"
          @contextmenu="handleContextMenu"
        >
        <transition enter-active-class="animated zoomIn" leave-active-class="animated zoomOut">
          <button v-show="text" type="button" :class="$style.clearBtn" :aria-label="$t('close')" ignore-tip @click="handleClearList">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="currentColor" />
              <path d="M8.8 8.8 15.2 15.2M15.2 8.8 8.8 15.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </transition>
      </div>
      <div v-if="list" :class="$style.list" :style="listStyle">
        <ul ref="dom_list" @mouseleave="selectIndex = -1">
          <li
            v-for="(item, index) in list"
            :key="item"
            :class="{[$style.select]: selectIndex === index }"
            @mouseenter="selectIndex = index"
            @click="handleTemplistClick(index)"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'
import { HOTKEY_COMMON } from '@common/hotKey'
import { appSetting } from '@renderer/store/setting'

export default {
  props: {
    placeholder: {
      type: String,
      default: '搜索音乐',
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    visibleList: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    big: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'event'],
  data() {
    return {
      isShow: false,
      text: '',
      selectIndex: -1,
      focus: false,
      listStyle: {
        height: 0,
      },
    }
  },
  watch: {
    list(n) {
      if (!this.visibleList) return
      if (this.selectIndex > -1) this.selectIndex = -1
      this.$nextTick(() => {
        this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
      })
    },
    modelValue(n) {
      this.text = n
    },
    visibleList(n) {
      n ? this.showList() : this.hideList()
    },
  },
  mounted() {
    if (appSetting['search.isFocusSearchBox']) this.handleFocusInput()
    this.handleRegisterEvent('on')
  },
  beforeUnmount() {
    this.handleRegisterEvent('off')
  },
  methods: {
    handleRegisterEvent(action) {
      let eventHub = window.key_event
      let name = action == 'on' ? 'on' : 'off'
      // eslint-disable-next-line @typescript-eslint/unbound-method
      eventHub[name](HOTKEY_COMMON.focusSearchInput.action, this.handleFocusInput)
    },
    handleFocusInput() {
      this.$refs.dom_input.focus()
    },
    handleTemplistClick(index) {
      console.log(index)
      this.sendEvent('listClick', index)
    },
    handleFocus() {
      this.focus = true
      this.sendEvent('focus')
    },
    handleBlur() {
      setTimeout(() => {
        this.focus = false
        this.sendEvent('blur')
      }, 80)
    },
    handleSearch() {
      this.hideList()
      if (this.selectIndex < 0) {
        this.sendEvent('submit')
        return
      }
      this.sendEvent('listClick', this.selectIndex)
    },
    showList() {
      this.isShow = true
      this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
    },
    hideList() {
      this.isShow = false
      this.listStyle.height = 0
      this.$nextTick(() => {
        this.selectIndex = -1
      })
    },
    sendEvent(action, data) {
      this.$emit('event', {
        action,
        data,
      })
    },
    handleKeyDown() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex + 1 < this.list.length ? this.selectIndex + 1 : 0
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleKeyUp() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex - 1 < -1 ? this.list.length - 1 : this.selectIndex - 1
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleContextMenu() {
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      let dom_input = this.$refs.dom_input
      this.text = this.text.substring(0, dom_input.selectionStart) + str + this.text.substring(dom_input.selectionEnd, this.text.length)
      this.$emit('update:modelValue', this.text)
    },
    handleClearList() {
      this.text = ''
      this.$emit('update:modelValue', this.text)
      this.sendEvent('submit')
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// 胶囊搜索框（按设计稿：227 × 31，底 #E0E0E0，放大镜在左）
.container {
  position: relative;
  width: 227px;
  height: 31px;
  -webkit-app-region: no-drag;
}

// 注意：聚焦光圈只能画在 31px 的胶囊上（.form），
// 否则下拉展开后容器变高，光圈会跟着变成一整圈巨大的绿色圆弧
.search {
  position: absolute;
  width: 100%;
  z-index: 30;

  .form {
    display: flex;
    align-items: center;
    height: 31px;
    padding: 0 9px 0 11px;
    border-radius: var(--qm-radius-chip, 999px);
    background-color: var(--home-field-bg, rgba(0, 0, 0, .08));
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .04);
    transition: background-color var(--transition-base), box-shadow var(--transition-base);

    &:hover {
      background-color: rgba(0, 0, 0, .1);
    }

    input {
      flex: auto;
      min-width: 0;
      height: 100%;
      padding: 0 6px 0 8px;
      border: none;
      outline: none;
      background-color: transparent;
      color: var(--home-text, rgb(74, 74, 74));
      font-size: var(--qm-fs-md, 14px);
      overflow: hidden;

      &::placeholder {
        color: rgb(166, 166, 166);
        font-size: var(--qm-fs-md, 14px);
      }
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      outline: none;
      background-color: transparent;
      cursor: pointer;
      transition: color var(--transition-fast), opacity var(--transition-fast);
    }

    .iconBtn {
      flex: none;
      width: 15px;
      height: 15px;
      color: rgb(166, 166, 166);

      &:hover { color: var(--home-text, rgb(74, 74, 74)); }
    }

    .clearBtn {
      flex: none;
      width: 16px;
      height: 16px;
      margin-left: var(--qm-sp-2, 6px);
      border-radius: 50%;
      color: rgb(198, 198, 198);
      transition: color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);

      &:hover {
        color: var(--qm-primary);
        background-color: var(--qm-primary-soft);
        transform: scale(1.06);
      }
    }
  }

  // 聚焦态：胶囊白底 + 主色光圈
  &.active .form {
    background-color: var(--qm-card, #fff);
    box-shadow: 0 0 0 2px var(--qm-primary), 0 6px 18px rgba(0, 0, 0, .08);
  }

  .list {
    position: absolute;
    top: 39px;
    left: 0;
    width: 280px;
    font-size: var(--qm-fs-sm, 13px);
    height: 0;
    padding: 0;
    transition: height 200ms var(--ease-out);
    transition-property: height;
    overflow: hidden;
    border-radius: var(--qm-radius-lg, 12px);
    background-color: #fff;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16), 0 0 0 1px rgba(0, 0, 0, .04);

    ul {
      max-height: 320px;
      overflow-y: auto;
      padding: var(--qm-sp-2, 6px);
      box-sizing: border-box;

      &::-webkit-scrollbar { width: 6px; }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, .12);
        border-radius: var(--qm-radius-chip, 999px);
      }
    }

    li {
      position: relative;
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 10px 0 28px;
      border-radius: var(--qm-radius-sm, 8px);
      cursor: pointer;
      color: var(--qm-text-2, rgb(51, 51, 51));
      transition: background-color var(--transition-fast), color var(--transition-fast);

      // 左侧放大镜图标
      &::before {
        content: '';
        position: absolute;
        left: 9px;
        top: 50%;
        width: 12px;
        height: 12px;
        margin-top: -6px;
        background-color: currentColor;
        opacity: .45;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10.6 4.9a5.7 5.7 0 1 0 3.2 10.4l3.9 3.9 1.4-1.4-3.9-3.9A5.7 5.7 0 0 0 10.6 4.9zm0 2a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z'/%3E%3C/svg%3E") center/contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10.6 4.9a5.7 5.7 0 1 0 3.2 10.4l3.9 3.9 1.4-1.4-3.9-3.9A5.7 5.7 0 0 0 10.6 4.9zm0 2a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z'/%3E%3C/svg%3E") center/contain no-repeat;
      }

      span {
        min-width: 0;
        line-height: 1.3;
        .mixin-ellipsis-1();
      }

      &:hover {
        background-color: var(--qm-hover, rgba(0, 0, 0, .05));
      }

      &.select {
        background-color: var(--qm-primary-soft, rgba(49, 194, 124, .12));
        color: var(--qm-primary, rgb(49, 194, 124));
        font-weight: var(--qm-fw-semibold, 600);

        &::before { opacity: .9; }
      }
    }
  }
}

.big {
  width: 100%;
}
</style>
