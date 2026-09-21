<template>
  <button :class="$style.btn" :aria-label="$t('player__sound_effect')" @click="visible = true">
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="90%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-tune-variant" />
    </svg>
  </button>
  <teleport :to="teleport">
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-if="visible" :class="$style.container">
        <div :class="$style.mask" @click="visible = false" />
        <div :class="$style.panel">
          <header :class="$style.header">
            <svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve">
              <use xlink:href="#icon-tune-variant" />
            </svg>
            <b :class="$style.headerTitle">{{ $t('player__sound_effect_galaxy_title') }}</b>
            <button
              type="button"
              :class="[$style.switch, { [$style.switchOn]: isAnyActive }]"
              :aria-label="isAnyActive ? $t('player__sound_effect_state_on') : $t('player__sound_effect_state_off')"
              @click="handleToggleAll"
            >
              <span :class="$style.switchDot" />
            </button>
            <span :class="$style.headerState">{{ isAnyActive ? $t('player__sound_effect_state_on') : $t('player__sound_effect_state_off') }}</span>
            <span v-if="isAnyActive" :class="$style.headerPreset">{{ eqPresetText }}</span>
            <button type="button" :class="$style.closeBtn" aria-label="close" @click="visible = false">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M5.8 5.8 18.2 18.2M18.2 5.8 5.8 18.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </header>
          <div :class="$style.body">
            <nav :class="$style.side">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                :class="[$style.navBtn, { [$style.navBtnActive]: activeTab === tab.id }]"
                :aria-label="tab.label"
                @click="activeTab = tab.id"
              >
                <svg :class="$style.navIcon" viewBox="0 0 24 24" aria-hidden="true" v-html="tab.icon" />
                <span :class="$style.navLabel">{{ tab.label }}</span>
                <b v-if="tab.sub" :class="$style.navSub">{{ tab.sub }}</b>
              </button>
            </nav>
            <main class="scroll" :class="$style.main">
              <div v-show="activeTab === 'recommend'">
                <AudioConvolution />
              </div>
              <div v-show="activeTab === 'acoustic'" :class="$style.acousticPanel">
                <AudioPanner />
                <PitchShifter />
              </div>
              <div v-show="activeTab === 'eq'">
                <BiquadFilter />
              </div>
              <div v-show="activeTab === 'make'">
                <Make />
              </div>
            </main>
          </div>
          <p v-if="showTip" :class="$style.tip">{{ $t('player__sound_effect_features_tip') }}</p>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from '@common/utils/vueTools'
import BiquadFilter from './BiquadFilter.vue'
import AudioPanner from './AudioPanner.vue'
import AudioConvolution from './AudioConvolution.vue'
import PitchShifter from './PitchShifter.vue'
import Make from './Make.vue'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { freqs, freqsPreset } from '@renderer/plugins/player'

defineProps({
  teleport: {
    type: String,
    default: '#root',
  },
})

const visible = ref(false)

const showTip = ref(false)

watch(visible, (visible) => {
  if (visible) showTip.value = appSetting['player.mediaDeviceId'] != 'default'
})

// 当前均衡器预设（关闭 / 内置预设名 / 自定义）
const eqPreset = computed(() => {
  const vals = freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`])
  if (vals.every(v => v === 0)) return { i18n: 'close' }
  for (const preset of freqsPreset) {
    if (freqs.every((f, i) => preset[`hz${f}`] === vals[i])) return { i18n: preset.name }
  }
  return { i18n: 'custom' }
})
const eqPresetText = computed(() => window.i18n.t(`player__sound_effect_biquad_filter_preset_${eqPreset.value.i18n}`))

// 是否有任一音效生效
const isAnyActive = computed(() => {
  if (freqs.some(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`] !== 0)) return true
  if (appSetting['player.soundEffect.panner.enable']) return true
  if (appSetting['player.soundEffect.convolution.fileName']) return true
  if (appSetting['player.soundEffect.pitchShifter.playbackRate'] !== 1) return true
  if (appSetting['player.soundEffect.enhance.bass'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.hifi'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.dynamic'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.balance'] !== 0) return true
  return false
})

// 总开关：一键关闭全部音效（与各子功能的原有逻辑一致，仅批量复位）
const handleToggleAll = () => {
  if (!isAnyActive.value) return
  const setting = {}
  for (const f of freqs) setting[`player.soundEffect.biquadFilter.hz${f}`] = 0
  setting['player.soundEffect.panner.enable'] = false
  setting['player.soundEffect.panner.soundR'] = 0
  setting['player.soundEffect.convolution.fileName'] = ''
  setting['player.soundEffect.pitchShifter.playbackRate'] = 1
  setting['player.soundEffect.enhance.bass'] = 0
  setting['player.soundEffect.enhance.hifi'] = 0
  setting['player.soundEffect.enhance.dynamic'] = 0
  setting['player.soundEffect.enhance.balance'] = 0
  updateSetting(setting)
  // 同步关闭通用音效链的「开启效果」状态，防止其后续再写全局音效
  try {
    const raw = localStorage.getItem('lx_galaxy_general_chain')
    if (raw) {
      const data = JSON.parse(raw)
      if (data.enabled) {
        data.enabled = false
        localStorage.setItem('lx_galaxy_general_chain', JSON.stringify(data))
      }
    }
  } catch {}
}

const activeTab = ref('recommend')

const tabs = computed(() => {
  return [
    {
      id: 'recommend',
      label: window.i18n.t('player__sound_effect_tab_recommend'),
      sub: '',
      icon: '<path d="M9.2 17.6V6l9-1.7v11.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.9" cy="17.7" r="2.3" fill="currentColor"/><circle cx="15.9" cy="15.5" r="2.3" fill="currentColor"/>',
    },
    {
      id: 'acoustic',
      label: window.i18n.t('player__sound_effect_tab_acoustic'),
      sub: '',
      icon: '<path d="M4.2 13.2a7.8 7.8 0 0 1 15.6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="3.2" y="12.8" width="4.2" height="6.4" rx="1.8" fill="currentColor"/><rect x="16.6" y="12.8" width="4.2" height="6.4" rx="1.8" fill="currentColor"/>',
    },
    {
      id: 'eq',
      label: window.i18n.t('player__sound_effect_biquad_filter'),
      sub: isAnyActive.value ? eqPresetText.value : '',
      icon: '<path d="M6 4v16M12 4v16M18 4v16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="6" cy="14.5" r="2" fill="currentColor"/><circle cx="12" cy="8.5" r="2" fill="currentColor"/><circle cx="18" cy="16.5" r="2" fill="currentColor"/>',
    },
    {
      id: 'make',
      label: window.i18n.t('player__sound_effect_tab_make'),
      sub: '',
      icon: '<path d="M4.5 19.5 14 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.2 3.4l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor"/><path d="M19.6 9.4l.6 1.3 1.3.6-1.3.6-.6 1.3-.6-1.3-1.3-.6 1.3-.6z" fill="currentColor"/>',
    },
  ]
})
</script>

<style lang="less">
@import '@renderer/assets/styles/layout.less';
// 子组件仍在使用的全局标题样式
.player__sound_effect_title {
  font-size: var(--qm-fs-md, 14px);
  padding-bottom: var(--qm-sp-3, 8px);
}
</style>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btn {
  position: relative;
  justify-content: center;
  align-items: center;
  transition: color @transition-normal;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 24px;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;

  svg {
    transition: opacity @transition-fast;
    opacity: .6;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    svg {
      opacity: .9;
    }
  }
  &:active {
    svg {
      opacity: 1;
    }
  }
}

.container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.35);
}
.panel {
  position: relative;
  width: 780px;
  max-width: 92%;
  height: 560px;
  max-height: 90%;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--color-main-background, #fff);
  border-radius: var(--qm-radius-lg, 12px);
  box-shadow: var(--qm-shadow-3, 0 12px 32px rgba(0, 0, 0, 0.2));
  overflow: hidden;
}

// ===== 标题栏 =====
.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 14px 16px 12px 18px;
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, 0.06));
}
.headerIcon {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  fill: currentColor;
}
.headerTitle {
  flex: none;
  font-size: var(--qm-fs-xl, 16px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
  margin-right: var(--qm-sp-2, 6px);
}
.switch {
  flex: none;
  position: relative;
  width: 36px;
  height: 20px;
  border: none;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-line-2, rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: background-color @transition-normal;
  padding: 0;

  .switchDot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left @transition-normal;
  }
  &.switchOn {
    background-color: var(--color-primary);
    .switchDot {
      left: 18px;
    }
  }
}
.headerState {
  flex: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font);
}
.headerPreset {
  flex: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-primary);
}
.closeBtn {
  flex: none;
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-font);
  cursor: pointer;
  transition: background-color @transition-fast;

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, 0.06));
  }
}

// ===== 主体：左侧导航 + 内容 =====
.body {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: row nowrap;
}
.side {
  flex: none;
  width: 132px;
  padding: 14px 10px;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-1, 4px);
  border-right: 1px solid var(--qm-line-1, rgba(0, 0, 0, 0.06));
  overflow-y: auto;
}
.navBtn {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  padding: 14px 6px 12px;
  border: none;
  border-radius: var(--qm-radius-md, 10px);
  background: transparent;
  color: var(--color-font);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  .navIcon {
    width: 26px;
    height: 26px;
  }
  .navLabel {
    font-size: var(--qm-fs-sm, 13px);
    line-height: 1.2;
  }
  .navSub {
    max-width: 100%;
    font-size: var(--qm-fs-2xs, 11px);
    font-weight: var(--qm-fw-regular, 400);
    line-height: 1.2;
    color: var(--color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, 0.05));
  }
  &.navBtnActive {
    color: var(--color-primary);
    background-color: var(--qm-primary-soft, rgba(0, 0, 0, 0.04));
    .navLabel {
      font-weight: var(--qm-fw-semibold, 600);
    }
  }
}
.main {
  flex: auto;
  min-width: 0;
  padding: 16px 20px;
}
.acousticPanel {
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-1, 4px);
}

// ===== 音效制作 =====
.makePanel {
  display: flex;
  flex-flow: column nowrap;
  gap: 18px;
}
.makeSection {
  min-width: 0;
}
.makeTitle {
  margin: 0 0 10px;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
}
.chipList {
  display: flex;
  flex-flow: row wrap;
  gap: var(--qm-sp-4, 10px);
}
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  padding: 5px 12px;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.05));
  color: var(--color-font);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  &:hover {
    background-color: var(--qm-primary-soft, rgba(0, 0, 0, 0.06));
    color: var(--color-primary);
  }
}
.chipDelete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: -4px;
  border: none;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  color: var(--qm-text-3, #888);
  font-size: var(--qm-fs-sm, 13px);
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: var(--color-btn-close, #e74c3c);
    color: #fff;
  }
}
.makeEmpty {
  margin: 0;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.5;
  color: var(--qm-text-3, #888);
}

.tip {
  flex: none;
  padding: 8px 18px 12px;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.25;
  color: var(--color-font);
  border-top: 1px dashed var(--qm-line-1, rgba(0, 0, 0, 0.06));
}
</style>
