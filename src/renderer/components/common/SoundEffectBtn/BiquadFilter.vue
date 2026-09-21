<template>
  <div :class="$style.content">
    <div :class="$style.presetGrid">
      <button
        v-for="item in presetItems"
        :key="item.key"
        type="button"
        :class="[$style.presetBtn, { [$style.active]: activePresetKey === item.key }]"
        :aria-label="item.label"
        @click="item.preset ? handleSetPreset(item.preset) : handleReset()"
      >
        <span :class="$style.presetLabel">{{ item.label }}</span>
        <svg v-if="activePresetKey === item.key" :class="$style.presetCheck" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div :class="$style.eqArea">
      <div :class="$style.eqMeta">
        <span :class="$style.dbLabel">{{ activeBandLabel }}</span>
        <base-btn min @click="handleReset">{{ $t('player__sound_effect_biquad_filter_reset_btn') }}</base-btn>
      </div>
      <div :class="$style.eqList">
        <div
          v-for="(v, i) in freqs"
          :key="v"
          :class="$style.eqItem"
          @mouseenter="hoverFreq = v"
          @mouseleave="hoverFreq = 0"
        >
          <div :class="$style.vslider" @mousedown="handleBandDown($event, v)">
            <span v-if="hoverFreq === v || dragFreq === v" :class="$style.bandValue">{{ bandText(v) }}</span>
            <div :class="$style.vtrack" />
            <div :class="$style.vfill" :style="{ height: bandRatio(v) * 100 + '%' }" />
            <div :class="$style.vthumb" :style="{ bottom: `calc(${bandRatio(v) * 100}% - 7px)` }" />
          </div>
          <span :class="$style.freqLabel">{{ labels[i] }}</span>
        </div>
      </div>
    </div>
    <!-- 增强效果滑条（QQ 银河音效同款 6 项，双击滑条行可重置） -->
    <div :class="$style.enhanceGrid">
      <div
        v-for="item in enhanceItems"
        :key="item.key"
        :class="$style.enhanceItem"
        :title="item.tip"
        @dblclick="item.reset()"
      >
        <span :class="$style.enhanceLabel">{{ item.label }}</span>
        <base-slider-bar
          :class="$style.enhanceSlider"
          :value="item.value"
          :min="item.min"
          :max="item.max"
          @change="item.change($event)"
        />
        <span :class="$style.enhanceValue">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from '@common/utils/vueTools'
import { freqs, freqsPreset, setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'

const labels = freqs.map(num => num < 1000 ? num : `${num / 1000}k`)

const ensureDefaultDevice = async() => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
}

const handleUpdate = async(key, value) => {
  await ensureDefaultDevice()
  value = Math.round(value)
  updateSetting({ [`player.soundEffect.biquadFilter.hz${key}`]: value })
}

const handleReset = () => {
  const setting = {}
  for (const key of freqs) {
    setting[`player.soundEffect.biquadFilter.hz${key}`] = 0
  }
  updateSetting(setting)
}

const handleSetPreset = (item) => {
  updateSetting({
    'player.soundEffect.biquadFilter.hz31': item.hz31,
    'player.soundEffect.biquadFilter.hz62': item.hz62,
    'player.soundEffect.biquadFilter.hz125': item.hz125,
    'player.soundEffect.biquadFilter.hz250': item.hz250,
    'player.soundEffect.biquadFilter.hz500': item.hz500,
    'player.soundEffect.biquadFilter.hz1000': item.hz1000,
    'player.soundEffect.biquadFilter.hz2000': item.hz2000,
    'player.soundEffect.biquadFilter.hz4000': item.hz4000,
    'player.soundEffect.biquadFilter.hz8000': item.hz8000,
    'player.soundEffect.biquadFilter.hz16000': item.hz16000,
  })
}

// ===== 预设宫格（QQ 银河音效顺序：关闭 + 10 内置 + 自定义） =====
const PRESET_ORDER = ['close', 'pop', 'dance', 'blues', 'classical', 'jazz', 'slow', 'electronic', 'rock', 'country', 'vocal', 'custom']
const presetItems = computed(() => {
  return PRESET_ORDER.map(key => {
    if (key === 'close') {
      return { key, label: window.i18n.t('player__sound_effect_biquad_filter_preset_close'), preset: null }
    }
    if (key === 'custom') {
      return { key, label: window.i18n.t('player__sound_effect_biquad_filter_preset_custom'), preset: null }
    }
    const preset = freqsPreset.find(p => p.name === key)
    return {
      key,
      label: window.i18n.t(`player__sound_effect_biquad_filter_preset_${key}`),
      preset: preset ?? null,
    }
  })
})

const activePresetKey = computed(() => {
  const vals = freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`])
  if (vals.every(v => v === 0)) return 'close'
  for (const preset of freqsPreset) {
    if (freqs.every((f, i) => preset[`hz${f}`] === vals[i])) return preset.name
  }
  return 'custom'
})

// ===== 竖向频段滑杆 =====
const MIN_DB = -15
const MAX_DB = 15
const RANGE_DB = MAX_DB - MIN_DB

const hoverFreq = ref(0)
const dragFreq = ref(0)
const dragState = { startY: 0, startVal: 0, height: 0 }

const clampDb = val => Math.min(MAX_DB, Math.max(MIN_DB, val))

const bandRatio = v => (appSetting[`player.soundEffect.biquadFilter.hz${v}`] - MIN_DB) / RANGE_DB
const bandText = v => {
  const val = appSetting[`player.soundEffect.biquadFilter.hz${v}`]
  return `${val > 0 ? '+' : ''}${val}dB`
}

const handleBandDown = (event, freq) => {
  const height = event.currentTarget.clientHeight
  if (!height) return
  const ratio = 1 - (event.offsetY / height)
  const val = clampDb(Math.round(MIN_DB + ratio * RANGE_DB))
  dragFreq.value = freq
  dragState.startY = event.clientY
  dragState.height = height
  dragState.startVal = val
  void handleUpdate(freq, val)
}
const handleBandMove = event => {
  if (!dragFreq.value) return
  // 兜底：按键已松开却仍处于拖拽状态时强制结束，防止取值乱跳
  if (event.buttons === 0) {
    dragFreq.value = 0
    return
  }
  const delta = (dragState.startY - event.clientY) / dragState.height * RANGE_DB
  void handleUpdate(dragFreq.value, clampDb(Math.round(dragState.startVal + delta)))
}
const handleBandUp = () => {
  dragFreq.value = 0
}

const activeBandLabel = computed(() => {
  const f = dragFreq.value || hoverFreq.value
  if (!f) return '±15dB'
  const val = appSetting[`player.soundEffect.biquadFilter.hz${f}`]
  const label = f < 1000 ? f : `${f / 1000}k`
  return `${label} ${val > 0 ? '+' : ''}${val}dB`
})

// ===== 增强效果滑条（高保真度/超重低音/混响强度/动态推进/环绕强度/声道平衡） =====
const DEFAULT_REVERB = { source: 'matrix-reverb1.wav', mainGain: 10 }

const ensureReverbOn = () => {
  if (appSetting['player.soundEffect.convolution.fileName']) return
  updateSetting({
    'player.soundEffect.convolution.fileName': DEFAULT_REVERB.source,
    'player.soundEffect.convolution.mainGain': DEFAULT_REVERB.mainGain,
    // 尊重用户当前混响强度；为 0 时给一个可感知的默认值
    'player.soundEffect.convolution.sendGain': appSetting['player.soundEffect.convolution.sendGain'] || 15,
  })
}

const enhanceItems = computed(() => {
  return [
    {
      key: 'hifi',
      label: window.i18n.t('player__sound_effect_enhance_hifi'),
      tip: '提亮高频细节，让人声与乐器更通透（双击重置）',
      value: appSetting['player.soundEffect.enhance.hifi'],
      min: 0,
      max: 50,
      text: `${appSetting['player.soundEffect.enhance.hifi']}%`,
      change: v => { updateSetting({ 'player.soundEffect.enhance.hifi': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.hifi': 0 }) },
    },
    {
      key: 'bass',
      label: window.i18n.t('player__sound_effect_enhance_bass'),
      tip: '增强 120Hz 以下低频力度（双击重置）',
      value: appSetting['player.soundEffect.enhance.bass'],
      min: 0,
      max: 50,
      text: `${appSetting['player.soundEffect.enhance.bass']}%`,
      change: v => { updateSetting({ 'player.soundEffect.enhance.bass': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.bass': 0 }) },
    },
    {
      key: 'reverb',
      label: window.i18n.t('player__sound_effect_enhance_reverb'),
      tip: '为声音添加空间混响（双击重置；拖动会自动启用默认混响）',
      value: appSetting['player.soundEffect.convolution.sendGain'],
      min: 0,
      max: 50,
      text: `${appSetting['player.soundEffect.convolution.sendGain']}%`,
      change: v => {
        if (Math.round(v) === 0) {
          // 拖回 0 = 关闭混响（保留用户选择的采样文件，仅静音）
          updateSetting({ 'player.soundEffect.convolution.sendGain': 0 })
          return
        }
        ensureReverbOn()
        updateSetting({ 'player.soundEffect.convolution.sendGain': Math.round(v) })
      },
      reset: () => { updateSetting({ 'player.soundEffect.convolution.sendGain': 0 }) },
    },
    {
      key: 'dynamic',
      label: window.i18n.t('player__sound_effect_enhance_dynamic'),
      tip: '动态压缩让响度更饱满、强弱对比更明显（双击重置）',
      value: appSetting['player.soundEffect.enhance.dynamic'],
      min: 0,
      max: 50,
      text: `${appSetting['player.soundEffect.enhance.dynamic']}%`,
      change: v => { updateSetting({ 'player.soundEffect.enhance.dynamic': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.dynamic': 0 }) },
    },
    {
      key: 'surround',
      label: window.i18n.t('player__sound_effect_enhance_surround'),
      tip: '3D 环绕：声音围绕头部旋转，0% 为关闭（双击重置）',
      value: appSetting['player.soundEffect.panner.soundR'],
      min: 0,
      max: 30,
      text: appSetting['player.soundEffect.panner.soundR'] === 0
        ? window.i18n.t('player__sound_effect_biquad_filter_preset_close')
        : `${appSetting['player.soundEffect.panner.soundR']}%`,
      change: v => {
        v = Math.round(v)
        if (v <= 0) {
          // 0% = 真正关闭环绕（停掉 panner 旋转，释放 CPU）
          updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 })
          return
        }
        if (!appSetting['player.soundEffect.panner.enable']) updateSetting({ 'player.soundEffect.panner.enable': true })
        updateSetting({ 'player.soundEffect.panner.soundR': v })
      },
      reset: () => { updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 }) },
    },
    {
      key: 'balance',
      label: window.i18n.t('player__sound_effect_enhance_balance'),
      tip: '左右声道平衡，居中为标准立体声（双击重置）',
      value: appSetting['player.soundEffect.enhance.balance'],
      min: -50,
      max: 50,
      text: window.i18n.t(appSetting['player.soundEffect.enhance.balance'] < -5
        ? 'player__sound_effect_enhance_balance_left'
        : appSetting['player.soundEffect.enhance.balance'] > 5
          ? 'player__sound_effect_enhance_balance_right'
          : 'player__sound_effect_enhance_balance_center'),
      change: v => { updateSetting({ 'player.soundEffect.enhance.balance': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.balance': 0 }) },
    },
  ]
})

onMounted(() => {
  document.addEventListener('mousemove', handleBandMove)
  document.addEventListener('mouseup', handleBandUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleBandMove)
  document.removeEventListener('mouseup', handleBandUp)
})

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}
.presetGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--qm-sp-4, 10px);
}
.presetBtn {
  position: relative;
  height: 32px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.05));
  color: var(--color-font);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color @transition-fast, border-color @transition-fast, color @transition-fast;
  box-sizing: border-box;

  .presetLabel {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .presetCheck {
    position: absolute;
    right: 3px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    color: var(--color-primary);
  }

  &:hover {
    background-color: var(--qm-hover-strong, rgba(0, 0, 0, 0.08));
  }
  &.active {
    border-color: var(--color-primary);
    background-color: var(--qm-primary-soft, rgba(0, 0, 0, 0.04));
    color: var(--color-primary);
  }
}

.eqArea {
  margin-top: 18px;
}
.eqMeta {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: var(--qm-sp-2, 6px);

  .dbLabel {
    font-size: var(--qm-fs-xs, 12px);
    color: var(--color-primary);
  }
}
.eqList {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  padding: 0 4px;
}
.eqItem {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  width: 44px;
}
.bandValue {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--qm-fs-2xs, 11px);
  line-height: 14px;
  color: var(--color-primary);
  white-space: nowrap;
  pointer-events: none;
}
.vslider {
  position: relative;
  width: 18px;
  height: 110px;
  cursor: pointer;
}
.vtrack {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 4px;
  height: 100%;
  border-radius: var(--qm-radius-2xs, 4px);
  background-color: color-mix(in srgb, var(--color-1000) 14%, transparent);
}
.vfill {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 4px;
  border-radius: var(--qm-radius-2xs, 4px);
  background-color: var(--color-primary);
}
.vthumb {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--color-main-background, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06);
}
.freqLabel {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font);
}

// ===== 增强效果滑条 =====
.enhanceGrid {
  margin-top: var(--qm-sp-7, 16px);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 28px;
  padding: 0 4px;
}
.enhanceItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  min-width: 0;
}
.enhanceLabel {
  flex: none;
  width: 60px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font);
  white-space: nowrap;
}
.enhanceSlider {
  flex: 1 1 auto;
  min-width: 0;
}
.enhanceValue {
  flex: none;
  width: 34px;
  text-align: right;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #999);
  font-variant-numeric: tabular-nums;
}
</style>
