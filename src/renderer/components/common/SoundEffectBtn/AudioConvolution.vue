<template>
  <div :class="$style.content">
    <h4 :class="$style.sectionTitle">{{ $t('player__sound_effect_recommend_featured') }}</h4>
    <div :class="$style.featuredGrid">
      <button
        v-for="item in featuredList"
        :key="item.id"
        type="button"
        :class="[$style.featuredCard, $style[item.themeCls], { [$style.active]: activeFeaturedId === item.id }]"
        :aria-label="item.name"
        @click="applyEffect(item.effect)"
      >
        <span :class="$style.featuredName">{{ item.name }}</span>
        <svg v-if="activeFeaturedId === item.id" :class="$style.checkBadge" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <h4 :class="$style.sectionTitle">{{ $t('player__sound_effect_recommend_master') }}</h4>
    <div :class="$style.masterGrid">
      <div :class="$style.masterAdd" @click="saveCurrentAsMaster">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        <span>{{ $t('player__sound_effect_recommend_save_current') }}</span>
      </div>
      <div
        v-for="item in masterItems"
        :key="item.id"
        :class="[$style.masterItem, { [$style.masterActive]: activeMasterId === item.id }]"
        :aria-label="item.name"
        @click="applyEffect(item.effect)"
      >
        <span :class="$style.masterName">{{ item.name }}</span>
        <button
          v-if="item.removable"
          type="button"
          :class="$style.masterDelete"
          :aria-label="$t('player__sound_effect_delete')"
          @click.stop="removeMaster(item.id)"
        >&times;</button>
        <span :class="$style.masterUse">{{ $t('player__sound_effect_recommend_use') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from '@common/utils/vueTools'
import { freqs, freqsPreset } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import { getUserEQPresetList, removeUserEQPreset, saveUserEQPreset } from '@renderer/store/soundEffect'

const ZERO_EQ = { hz31: 0, hz62: 0, hz125: 0, hz250: 0, hz500: 0, hz1000: 0, hz2000: 0, hz4000: 0, hz8000: 0, hz16000: 0 }
const presetMap = {}
for (const p of freqsPreset) presetMap[p.name] = p
const eqOf = name => {
  const out = {}
  for (const f of freqs) out[`hz${f}`] = presetMap[name] ? presetMap[name][`hz${f}`] : 0
  return out
}

// effect: { eq, conv: [source, main, send] | null, panner, bass, hifi, dynamic, balance }
const C = (id, themeCls, name, eq, conv, opts = {}) => ({ id, themeCls, name, effect: { eq, conv: conv ? { source: conv[0], mainGain: conv[1], sendGain: conv[2] } : null, panner: !!opts.panner, bass: opts.bass || 0, hifi: opts.hifi || 0, dynamic: opts.dynamic || 0, balance: 0, pitch: 1 } })

const featuredList = [
  C('close', 'themeRed', window.i18n.t('player__sound_effect_biquad_filter_preset_close'), { ...ZERO_EQ }, null),
  C('smart', 'themePurple', window.i18n.t('player__sound_effect_featured_smart'), eqOf('pop'), ['matrix-reverb1.wav', 12, 6], { bass: 6, hifi: 6, dynamic: 5 }),
  C('superdj', 'themeTeal', window.i18n.t('player__sound_effect_featured_superdj'), eqOf('dance'), ['feedback-spring.wav', 15, 5], { bass: 18, hifi: 6, dynamic: 10 }),
  C('panorama', 'themeGreen', window.i18n.t('player__sound_effect_featured_panorama'), eqOf('soft'), ['bright-hall.wav', 10, 12], { panner: true, bass: 4, hifi: 4 }),
  C('stereo51', 'themeIndigo', window.i18n.t('player__sound_effect_featured_stereo51'), eqOf('pop'), ['s3_r1_bd.wav', 15, 5], { panner: true, bass: 6, hifi: 8, dynamic: 5 }),
  C('bass', 'themeCyan', window.i18n.t('player__sound_effect_featured_bass'), eqOf('subwoofer'), null, { bass: 25, dynamic: 8 }),
  C('clearvocal', 'themeAqua', window.i18n.t('player__sound_effect_featured_clearvocal'), eqOf('vocal'), null, { hifi: 12 }),
  C('livebeat', 'themeGreen2', window.i18n.t('player__sound_effect_featured_livebeat'), eqOf('rock'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 10, hifi: 8, dynamic: 12 }),
  C('outdoor', 'themeViolet', window.i18n.t('player__sound_effect_featured_outdoor'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { bass: 3, hifi: 10, dynamic: 10 }),
  C('china', 'themeRed2', window.i18n.t('player__sound_effect_featured_china'), eqOf('classical'), ['s2_r4_bd.wav', 15, 6], { bass: 4, hifi: 4, dynamic: 3 }),
]

const builtinMasters = [
  C('m_galaxy_hifi', '', window.i18n.t('player__sound_effect_master_galaxy_hifi'), eqOf('pop'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 6, hifi: 12, dynamic: 5 }),
  C('m_virtual_hall', '', window.i18n.t('player__sound_effect_master_virtual_hall'), eqOf('classical'), ['bright-hall.wav', 10, 12], { bass: 4, hifi: 3 }),
  C('m_hifi_surround', '', window.i18n.t('player__sound_effect_master_hifi_surround'), eqOf('soft'), ['tim-omni-35-10-magnetic.wav', 10, 2], { bass: 3, hifi: 10, dynamic: 3 }),
  C('m_wide', '', window.i18n.t('player__sound_effect_master_wide'), eqOf('electronic'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 5, hifi: 10, dynamic: 5 }),
  C('m_vr', '', window.i18n.t('player__sound_effect_master_vr'), eqOf('dance'), ['matrix-reverb2.wav', 13, 6], { panner: true, bass: 6, hifi: 5, dynamic: 6 }),
  C('m_oxygen_vocal', '', window.i18n.t('player__sound_effect_master_oxygen_vocal'), eqOf('vocal'), ['spreader50-65ms.wav', 10, 8], { bass: 3, hifi: 6, dynamic: 12 }),
  C('m_highreal', '', window.i18n.t('player__sound_effect_master_highreal'), eqOf('subwoofer'), null, { bass: 12, hifi: 15, dynamic: 4 }),
  C('m_sound_real', '', window.i18n.t('player__sound_effect_master_sound_real'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { bass: 3, hifi: 12, dynamic: 10 }),
  C('m_folk_dj', '', window.i18n.t('player__sound_effect_master_folk_dj'), eqOf('country'), ['feedback-spring.wav', 15, 5], { bass: 10, hifi: 5, dynamic: 8 }),
  C('m_lsk', '', window.i18n.t('player__sound_effect_master_lsk'), eqOf('pop'), ['matrix-reverb2.wav', 13, 6], { bass: 5, hifi: 8, dynamic: 5 }),
  C('m_ierz1r', '', window.i18n.t('player__sound_effect_master_ierz1r'), eqOf('slow'), ['s2_r4_bd.wav', 15, 6], { bass: 4, hifi: 6, dynamic: 3 }),
  C('m_hifi_wrap', '', window.i18n.t('player__sound_effect_master_hifi_wrap'), eqOf('subwoofer'), ['cinema-diningroom.wav', 6, 12], { panner: true, bass: 8, hifi: 5, dynamic: 5 }),
  C('m_outdoor_only', '', window.i18n.t('player__sound_effect_master_outdoor_only'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { hifi: 10, dynamic: 10 }),
  C('m_perfect_vocal', '', window.i18n.t('player__sound_effect_master_perfect_vocal'), eqOf('vocal'), ['living-bedroom-leveled.wav', 6, 11], { bass: 3, hifi: 8, dynamic: 4 }),
  C('m_soundbar', '', window.i18n.t('player__sound_effect_master_soundbar'), eqOf('vocal'), ['bright-hall.wav', 8, 10], { bass: 6, hifi: 5, dynamic: 5 }),
  C('m_ethereal', '', window.i18n.t('player__sound_effect_master_ethereal'), eqOf('slow'), ['matrix-reverb1.wav', 15, 6], { panner: true, bass: 3, hifi: 6, dynamic: 3 }),
]

// ===== 应用组合（统一入口） =====
const applyEffect = effect => {
  if (appSetting['player.mediaDeviceId'] != 'default') saveMediaDeviceId('default')
  const setting = {
    'player.soundEffect.enhance.bass': effect.bass ?? 0,
    'player.soundEffect.enhance.hifi': effect.hifi ?? 0,
    'player.soundEffect.enhance.dynamic': effect.dynamic ?? 0,
    'player.soundEffect.enhance.balance': effect.balance ?? 0,
    'player.soundEffect.pitchShifter.playbackRate': effect.pitch ?? 1,
    'player.soundEffect.panner.enable': effect.panner ?? false,
    // 开启环绕时若半径为 0（之前被用户关掉），给一个可感知的默认值，否则 panner 半径为 0 会导致音效静默失效
    'player.soundEffect.panner.soundR': effect.panner
      ? (appSetting['player.soundEffect.panner.soundR'] || 5)
      : appSetting['player.soundEffect.panner.soundR'],
  }
  const eq = effect.eq ?? { ...ZERO_EQ }
  for (const f of freqs) setting[`player.soundEffect.biquadFilter.hz${f}`] = eq[`hz${f}`] ?? 0
  setting['player.soundEffect.convolution.fileName'] = effect.conv ? effect.conv.source : ''
  setting['player.soundEffect.convolution.mainGain'] = effect.conv ? Math.round(effect.conv.mainGain * 10) : 10
  // 混响强度（sendGain）是用户的独立滑条，组合预设不覆盖它；
  // 启用混响且当前强度为 0 时给一个可感知的默认值
  if (effect.conv) {
    setting['player.soundEffect.convolution.sendGain'] = appSetting['player.soundEffect.convolution.sendGain'] || 12
  } else {
    setting['player.soundEffect.convolution.sendGain'] = 0
  }
  updateSetting(setting)
}

// ===== 当前选中项（值匹配） =====
const currentSnapshot = computed(() => ({
  eq: freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`]).join(','),
  conv: appSetting['player.soundEffect.convolution.fileName'],
  panner: appSetting['player.soundEffect.panner.enable'] ? 1 : 0,
  bass: appSetting['player.soundEffect.enhance.bass'],
  hifi: appSetting['player.soundEffect.enhance.hifi'],
  dynamic: appSetting['player.soundEffect.enhance.dynamic'],
  balance: appSetting['player.soundEffect.enhance.balance'],
}))
const matchSnapshot = effect => {
  const cur = currentSnapshot.value
  const eq = effect.eq ?? { ...ZERO_EQ }
  const eqStr = freqs.map(f => eq[`hz${f}`] ?? 0).join(',')
  const convMatch = effect.conv ? cur.conv === effect.conv.source : cur.conv === ''
  return cur.eq === eqStr && convMatch && cur.panner === (effect.panner ? 1 : 0) && cur.bass === (effect.bass ?? 0) && cur.hifi === (effect.hifi ?? 0) && cur.dynamic === (effect.dynamic ?? 0) && cur.balance === (effect.balance ?? 0)
}
const activeFeaturedId = computed(() => featuredList.find(item => matchSnapshot(item.effect))?.id ?? '')
const activeMasterId = computed(() => masterItems.value.find(item => matchSnapshot(item.effect))?.id ?? '')

// ===== 达人音效：内置 + 用户保存（复用 userEQPreset 存储） =====
const userMasters = ref([])
const masterItems = computed(() => {
  const userItems = userMasters.value.map(item => {
    const eq = {}
    for (const f of freqs) eq[`hz${f}`] = item[`hz${f}`] ?? 0
    return { id: 'u_' + item.id, name: item.name, removable: true, effect: { eq, conv: null, bass: 0, hifi: 0, dynamic: 0, balance: 0, pitch: 1 } }
  })
  return [...userItems, ...builtinMasters]
})

const refreshUserMasters = () => {
  void getUserEQPresetList().then(list => {
    userMasters.value = list
  })
}

const saveCurrentAsMaster = () => {
  const snapshot = currentSnapshot.value
  const name = window.i18n.t('player__sound_effect_recommend_my_effect') + ' ' + new Date().toLocaleTimeString()
  const preset = { id: Date.now().toString(), name }
  freqs.forEach((f, i) => { preset[`hz${f}`] = Number(snapshot.eq.split(',')[i]) })
  void saveUserEQPreset(preset).then(() => {
    refreshUserMasters()
  })
}

const removeMaster = id => {
  if (!id.startsWith('u_')) return
  void removeUserEQPreset(id.slice(2)).then(() => {
    refreshUserMasters()
  })
}

onMounted(() => {
  refreshUserMasters()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}
.sectionTitle {
  margin: 0 0 12px;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-1);
}

// ===== 精选音效卡 =====
// 设计取向（对应 Apple HIG 卡片的「渐变承担明确作用、不牺牲文字可读性」）：
// 原实现是 10 组霓虹双色强渐变 + 白字 + 重描边阴影，其中两个预设因白字读不清
// 被临时改成深色字——说明配色体系本身有问题。
// 现改为「低饱和同色相柔和渐变 + 主题墨色文字」：
//   · 颜色仅用于区分预设（承担明确作用），不再做视觉主角
//   · 文字统一走 --qm-text-1，浅色/深色主题下对比度都稳定达标
//   · 选中态改用主题主色，与全局「选中」语言一致
.featuredGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--qm-sp-5, 12px);
}
.featuredCard {
  position: relative;
  height: 74px;
  border: 1px solid var(--qm-line-1);
  border-radius: var(--qm-radius-card, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;
  background-color: var(--qm-card);
  color: var(--qm-text-1);
  transition: transform var(--qm-t-fast), border-color var(--qm-t-fast);

  &:hover {
    transform: translateY(-1px);
    border-color: var(--qm-line-2);
  }
  &.active {
    border-color: var(--qm-primary);
    background-image: linear-gradient(
      135deg,
      color-mix(in srgb, var(--qm-primary) 16%, var(--qm-card)),
      color-mix(in srgb, var(--qm-primary) 6%, var(--qm-card))
    );
    color: var(--qm-primary);

    .checkBadge {
      display: block;
    }
  }
}

// 预设色相族：统一以「墨色三元组」定义，再以相同比例混入卡片底色。
// 调整整体浓淡只需改下面两个百分比。
.themeRed    { --tile-hue: 201, 106, 99; }
.themePurple { --tile-hue: 142, 124, 195; }
.themeTeal   { --tile-hue: 79, 179, 165; }
.themeGreen  { --tile-hue: 90, 164, 105; }
.themeIndigo { --tile-hue: 107, 127, 199; }
.themeCyan   { --tile-hue: 74, 157, 196; }
.themeAqua   { --tile-hue: 79, 176, 184; }
.themeGreen2 { --tile-hue: 120, 176, 132; }
.themeViolet { --tile-hue: 160, 108, 192; }
.themeRed2   { --tile-hue: 176, 96, 88; }

.themeRed, .themePurple, .themeTeal, .themeGreen, .themeIndigo,
.themeCyan, .themeAqua, .themeGreen2, .themeViolet, .themeRed2 {
  background-image: linear-gradient(
    135deg,
    color-mix(in srgb, rgb(var(--tile-hue)) 18%, var(--qm-card)),
    color-mix(in srgb, rgb(var(--tile-hue)) 7%, var(--qm-card))
  );
}

.featuredName {
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
}
.checkBadge {
  display: none;
  position: absolute;
  right: 5px;
  bottom: 4px;
  width: 16px;
  height: 16px;
  color: var(--qm-primary);
  // 由白色描边阴影改为跟随卡片底色的柔光，浅色卡面上也能看清
  filter: drop-shadow(0 0 2px color-mix(in srgb, var(--qm-card) 90%, transparent));
}

// ===== 达人音效列表 =====
.masterGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 18px;
}
.masterAdd {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-1, 4px);
  min-height: 40px;
  border-radius: var(--qm-radius-xs, 6px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.04));
  color: var(--qm-text-3, #999);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;

  svg { width: 18px; height: 18px; }
  &:hover {
    color: var(--color-primary);
    background-color: var(--qm-primary-soft, rgba(0, 0, 0, 0.05));
  }
}
.masterItem {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--qm-radius-xs, 6px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.04));
  cursor: pointer;
  transition: background-color @transition-fast, border-color @transition-fast;

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, 0.06));
  }
  &.masterActive {
    border-color: var(--color-primary);
  }
}
.masterName {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.masterActive .masterName {
  color: var(--color-primary);
}
.masterDelete {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  color: var(--qm-text-3, #999);
  font-size: var(--qm-fs-md, 14px);
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: var(--color-btn-close, #e74c3c);
    color: #fff;
  }
}
.masterUse {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #999);
  cursor: pointer;
}
.masterItem:hover .masterUse {
  color: var(--color-primary);
}
</style>

