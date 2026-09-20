<template>
  <div :class="[$style.sliderContent, { [$style.disabled]: disabled }, className]">
    <div :class="[$style.slider]">
      <div ref="dom_sliderBar" :class="$style.sliderBar" :style="{ transform: `scaleX(${(value - min) / (max - min) || 0})` }" />
    </div>
    <div :class="$style.sliderMask" @mousedown="handleSliderMsDown" />
  </div>
</template>

<script>
import { ref, onBeforeUnmount } from '@common/utils/vueTools'
// import { player as eventPlayerNames } from '@renderer/event/names'

export default {
  props: {
    className: {
      type: String,
      default: '',
    },
    value: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    step: {
      type: Number,
      default: 1,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const sliderEvent = {
      isMsDown: false,
      msDownX: 0,
      msDownRatio: 0,
      msDownValue: 0,
      moved: false,
    }
    const dom_sliderBar = ref(null)

    const clampValue = val => {
      if (val < props.min) return props.min
      if (val > props.max) return props.max
      return val
    }
    const getSteppedValue = val => {
      const step = props.step > 0 ? props.step : 1
      const stepped = Math.round((val - props.min) / step) * step + props.min
      return clampValue(Number(stepped.toFixed(10)))
    }
    const getSliderWidth = () => dom_sliderBar.value?.clientWidth || 0
    const getRange = () => props.max - props.min
    const emitSteppedValue = rawValue => {
      const value = getSteppedValue(rawValue)
      emit('change', value)
      return value
    }

    const handleSliderMsDown = event => {
      if (props.disabled) return
      const width = getSliderWidth()
      if (!width) return

      sliderEvent.isMsDown = true
      sliderEvent.msDownX = event.clientX
      // 记录按下时的当前值：拖动位移超过 4px 才开始改值（防误触跳变），
      // 之后以按下时的值 + 位移量计算，thumb 不会瞬移到点击处
      sliderEvent.msDownValue = props.value
      sliderEvent.msDownRatio = getRange() === 0 ? 0 : (props.value - props.min) / getRange()
      // 复位死区标记：否则首次拖动后 moved 永久为 true，4px 防误触死区失效，
      // 之后轻点/轻蹭 1px 都会被当成拖拽立刻改值（表现为滑杆「一碰就自己动」）
      sliderEvent.moved = false
    }
    const handleSliderMsUp = () => {
      sliderEvent.isMsDown = false
      sliderEvent.moved = false
    }
    const handleSliderMsMove = event => {
      if (!sliderEvent.isMsDown) return
      // 兜底：鼠标按键已松开（buttons === 0）却仍处于拖拽状态，
      // 说明 mouseup 被组件重挂载等场景吞掉，立即结束拖拽，
      // 否则之后每次移动鼠标都会被换算成取值写入（表现为滑杆自己乱跳）
      if (event.buttons === 0) {
        sliderEvent.isMsDown = false
        return
      }
      if (props.disabled) return
      const width = getSliderWidth()
      if (!width) return

      const dx = event.clientX - sliderEvent.msDownX
      // 误触保护：位移在 4px 内不视为拖拽，避免划过/轻点误改取值
      if (Math.abs(dx) <= 4 && !sliderEvent.moved) return
      sliderEvent.moved = true
      const ratio = sliderEvent.msDownRatio + dx / width
      const rawValue = ratio * getRange() + props.min
      emitSteppedValue(rawValue)
    }

    document.addEventListener('mousemove', handleSliderMsMove)
    document.addEventListener('mouseup', handleSliderMsUp)
    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleSliderMsMove)
      document.removeEventListener('mouseup', handleSliderMsUp)
    })

    return {
      handleSliderMsDown,
      dom_sliderBar,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.sliderContent {
  flex: none;
  position: relative;
  width: 100px;
  padding: 5px 0;
  // margin-right: 10px;
  display: flex;
  align-items: center;
  opacity: .5;
  transition: opacity @transition-normal;
  &:hover {
    opacity: 1;
  }
  &.disabled {
    opacity: .3;
    .sliderMask {
      cursor: default;
    }
  }
}

.slider {
  // cursor: pointer;
  width: 100%;
  height: 5px;
  border-radius: 20px;
  overflow: hidden;
  transition: @transition-normal;
  transition-property: background-color, opacity;
  background-color: var(--color-primary-alpha-700);
  // background-color: #f5f5f5;
  position: relative;
  // border-radius: @radius-progress-border;
}

// .muted {
//   opacity: .5;
// }

.sliderBar {
  position: absolute;
  left: 0;
  top: 0;
  transform: scaleX(0);
  transform-origin: 0;
  // 不加 transform 过渡：组件重渲染时过渡会重播，视觉上表现为“滑杆自己滑动”
  width: 100%;
  height: 100%;
  // border-radius: @radius-progress-border;
  background-color: var(--color-button-font);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
}

.sliderMask {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

</style>
