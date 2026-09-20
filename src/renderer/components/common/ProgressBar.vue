<template>
  <div ref="dom_progress" :class="[$style.progress, className]" @mousedown="handleMsDown">
    <div :class="[$style.progressBar, $style.progressBar2, {[$style.barTransition]: isActiveTransition && !dragging}]" :style="{ transform: `scaleX(${displayProgress || 0})` }" @transitionend="handleTransitionEnd" />
    <div v-if="showDragIndicator" v-show="dragging" :class="[$style.progressBar, $style.progressBar3]" :style="{ transform: `scaleX(${dragProgress || 0})` }" />
  </div>
</template>

<script>
import { computed, ref, onBeforeUnmount } from '@common/utils/vueTools'
import { playProgress } from '@renderer/store/player/playProgress'

export default {
  props: {
    className: {
      type: String,
      default: '',
    },
    progress: {
      type: Number,
      required: true,
    },
    isActiveTransition: {
      type: Boolean,
      required: true,
    },
    handleTransitionEnd: {
      type: Function,
      required: true,
    },
    // 兼容旧用法：传 true 时松开鼠标会向 app_event 发送播放进度；不传或 false 时只 emit change 事件
    emitPlaybackProgress: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const msEvent = {
      isMsDown: false,
      msDownX: 0,
      msDownProgress: 0,
    }
    const dom_progress = ref(null)
    const dragging = ref(false)
    const dragProgress = ref(0)

    // 主进度条在拖动期间实时跟随鼠标，松手后回到外部传入的 progress
    const displayProgress = computed(() => dragging.value ? dragProgress.value : props.progress)

    // 拖动指示条（叠加在主条上的浅色预览条）只在播放进度条模式下启用
    // 音量条不需要这层叠加，因为主条已经跟随鼠标
    const showDragIndicator = computed(() => props.emitPlaybackProgress)

    const handleMsDown = event => {
      msEvent.isMsDown = true
      msEvent.msDownX = event.clientX

      // 用 getBoundingClientRect 相对屏幕坐标计算，避免受内部子元素 transform 或 hit-test 影响
      const rect = dom_progress.value.getBoundingClientRect()
      const width = rect.width || 1
      let val = (event.clientX - rect.left) / width
      if (val < 0) val = 0
      if (val > 1) val = 1

      dragProgress.value = msEvent.msDownProgress = val
    }
    const handleMsUp = () => {
      if (msEvent.isMsDown) {
        const value = dragProgress.value
        emit('change', value)
        // 旧式播放进度条用法（保持原有行为）
        if (props.emitPlaybackProgress) {
          window.app_event.setProgress(value * playProgress.maxPlayTime)
        }
      }
      msEvent.isMsDown = false
      dragging.value = false
    }
    const handleMsMove = event => {
      if (!msEvent.isMsDown) return
      dragging.value ||= true

      let progress = msEvent.msDownProgress + (event.clientX - msEvent.msDownX) / dom_progress.value.clientWidth
      if (progress > 1) progress = 1
      else if (progress < 0) progress = 0
      dragProgress.value = progress
    }

    document.addEventListener('mousemove', handleMsMove)
    document.addEventListener('mouseup', handleMsUp)
    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleMsMove)
      document.removeEventListener('mouseup', handleMsUp)
    })

    return {
      dom_progress,
      dragging,
      dragProgress,
      displayProgress,
      showDragIndicator,
      handleMsDown,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.progress {
  width: 100%;
  height: 5px;
  overflow: hidden;
  transition: @transition-normal;
  transition-property: background-color;
  // 允许使用方（如沉浸式播放详情页）通过 --progress-track 覆盖轨道颜色
  background-color: var(--progress-track, var(--color-primary-light-100-alpha-800));
  // background-color: #f5f5f5;
  position: relative;
  cursor: pointer;
  border-radius: 40px;
}
.progressBar {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0;
}
.progressBar1 {
  background-color: var(--color-primary-light-100-alpha-600);
}

.progressBar2 {
  background-color: var(--progress-fill, var(--color-primary-light-100-alpha-400));
  will-change: transform;
}

.progressBar3 {
  background-color: var(--progress-drag, var(--color-primary-light-100-alpha-200));
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  opacity: 0.5;
}

.barTransition {
  transition-property: transform;
  transition-timing-function: ease-out;
  transition-duration: 0.2s;
}

</style>
