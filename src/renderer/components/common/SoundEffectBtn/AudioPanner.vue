<template>
  <div :class="$style.contnet">
    <div class="player__sound_effect_title" :class="$style.header">
      <h3>{{ $t('player__sound_effect_panner') }}</h3>
      <base-checkbox
        id="player__sound_effect_panner_enabled"
        :class="$style.checkbox"
        :label="$t('player__sound_effect_panner_enabled')"
        :model-value="appSetting['player.soundEffect.panner.enable']"
        @update:model-value="updateEnabled"
      />
    </div>
    <div :class="$style.eqList">
      <div :class="$style.eqItem">
        <span :class="$style.label">{{ $t('player__sound_effect_panner_sound_speed') }}</span>
        <base-slider-bar :class="$style.slider" :value="appSetting['player.soundEffect.panner.speed']" :min="1" :max="50" @change="handleUpdateSpeed" />
        <span :class="[$style.value, { [$style.active]: appSetting['player.soundEffect.panner.speed'] != 25 }]">{{ appSetting['player.soundEffect.panner.speed'] }}</span>
      </div>
      <div :class="$style.eqItem">
        <span :class="$style.label">{{ $t('player__sound_effect_panner_sound_r') }}</span>
        <base-slider-bar :class="$style.slider" :value="appSetting['player.soundEffect.panner.soundR']" :min="1" :max="30" @change="handleUpdateSoundR" />
        <span :class="[$style.value, { [$style.active]: appSetting['player.soundEffect.panner.soundR'] != 5 }]">{{ appSetting['player.soundEffect.panner.soundR'] }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { reactive } from '@common/utils/vueTools'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'

// const setting = reactive({
//   enabled: false,
//   soundR: 5,
//   speed: 25,
// })

const updateEnabled = async(enabled) => {
  // console.log(enabled)
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
  // 半径为 0（可能由增强滑条或总开关关闭）时直接开启会静默无声，补一个可感知的默认半径
  if (enabled && !(appSetting['player.soundEffect.panner.soundR'] > 0)) {
    updateSetting({ 'player.soundEffect.panner.enable': true, 'player.soundEffect.panner.soundR': 5 })
    return
  }
  updateSetting({ 'player.soundEffect.panner.enable': enabled })
}

const handleUpdateSoundR = (value) => {
  value = Math.round(value)
  // 半径拖到 0 不再是合法取值（0 = 关闭，走开关），钳制到最小可感知值
  updateSetting({ 'player.soundEffect.panner.soundR': Math.max(1, value) })
}
const handleUpdateSpeed = (value) => {
  updateSetting({ 'player.soundEffect.panner.speed': Math.round(value) })
}


</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.contnet {
  padding-top: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-4, 10px);
  min-height: 0;
  flex: none;
}
.header {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 5px;
  // padding-top: 5px;
}
.eqList {
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-6, 15px);
  width: 100%;
}
.eqItem {
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-3, 8px);
}
.label {
  flex: none;
  // width: 50px;
  font-size: var(--qm-fs-xs, 12px);
}
.value {
  flex: none;
  width: 40px;
  font-size: var(--qm-fs-xs, 12px);
  text-align: center;

  &.active {
    color: var(--color-primary-font);
  }
}

.footer {
  display: flex;
  flex-flow: row nowrap;
  // justify-content: space-between;
  justify-content: center;
  align-items: center;
  // font-size: 13px;
  span {
    line-height: 1.2;
  }
}

.slider {
  flex: auto;
}

.checkbox {
  margin-right: var(--qm-sp-4, 10px);
  font-size: var(--qm-fs-sm, 13px);
}

</style>
