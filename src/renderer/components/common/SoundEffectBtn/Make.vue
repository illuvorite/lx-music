<template>
  <!-- 音效制作：主页三卡片 / 通用音效编辑器 / DJ 音效 -->
  <div :class="$style.content">
    <!-- ===== 主页 ===== -->
    <template v-if="view === 'home'">
      <div :class="$style.cardGrid">
        <button type="button" :class="$style.bigCard" @click="view = 'general'">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5zM11 8h3v8h-3zM17 5h3v14h-3z" fill="none" stroke="currentColor" stroke-width="1.5" /><circle cx="6.5" cy="15" r="2" fill="currentColor" /><circle cx="12.5" cy="9" r="2" fill="currentColor" /><circle cx="18.5" cy="13" r="2" fill="currentColor" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_general') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_general_desc') }}</span>
        </button>
        <button type="button" :class="$style.bigCard" @click="view = 'dj'">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_dj') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_dj_desc') }}</span>
        </button>
        <button type="button" :class="$style.bigCard" @click="handleMultiTrack">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v13M10 4v16M14 4v9M18 4v13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><circle cx="6" cy="19" r="1.6" fill="currentColor" /><circle cx="10" cy="21" r="1.6" fill="currentColor" /><circle cx="14" cy="14" r="1.6" fill="currentColor" /><circle cx="18" cy="19" r="1.6" fill="currentColor" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_multi') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_multi_desc') }}</span>
        </button>
      </div>
      <footer :class="$style.homeFooter">
        <button type="button" :class="$style.footerLink" @click="importChain">{{ $t('player__sound_effect_make_import') }}</button>
        <button type="button" :class="$style.footerLink" @click="exportChain">{{ $t('player__sound_effect_make_upload') }}</button>
      </footer>
      <input ref="fileRef" type="file" accept=".json,application/json" style="display: none" @change="handleImportFile">
    </template>

    <!-- ===== 通用音效编辑器 ===== -->
    <template v-else-if="view === 'general'">
      <div :class="$style.subHeader">
        <button type="button" :class="$style.backBtn" :aria-label="$t('back')" @click="view = 'home'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <b :class="$style.subTitle">{{ $t('player__sound_effect_make_general') }}</b>
      </div>
      <div :class="$style.genToolbar">
        <input v-model="generalName" :class="$style.genName" type="text" :placeholder="$t('player__sound_effect_make_new_general')">
        <span :class="$style.genPhone">{{ $t('player__sound_effect_make_phone') }}</span>
        <button type="button" :class="[$style.genSwitch, { [$style.genSwitchOn]: chainEnabled }]" :aria-label="$t('player__sound_effect_make_enable_effect')" @click="toggleChainEnabled">
          <span :class="$style.genSwitchDot" />
        </button>
        <span :class="$style.genSwitchLabel">{{ $t('player__sound_effect_make_enable_effect') }}</span>
        <button type="button" :class="$style.genPill" @click="clearChain">{{ $t('player__sound_effect_make_clear') }}</button>
        <button type="button" :class="$style.genPill" @click="exportChain">{{ $t('player__sound_effect_make_export') }}</button>
      </div>
      <div v-if="showAddGrid" :class="$style.addArea">
        <div :class="$style.addHead">
          <b>{{ $t('player__sound_effect_make_add_effect') }}</b>
          <button type="button" :class="$style.addLocalBtn">{{ $t('player__sound_effect_make_add_local') }}</button>
        </div>
        <p :class="$style.addGroup">{{ $t('player__sound_effect_make_basic_effects') }}</p>
        <div :class="$style.fxGrid">
          <button
            v-for="fx in effectCatalog"
            :key="fx.id"
            type="button"
            :class="$style.fxBtn"
            @click="addEffect(fx)"
          >{{ $t('player__sound_effect_fx_' + fx.id) }}</button>
        </div>
      </div>
      <button v-else type="button" :class="$style.addBigBtn" @click="showAddGrid = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
      </button>

      <div :class="$style.chainList">
        <div v-for="(item, index) in chain" :key="item.uid" :class="$style.chainItem">
          <button type="button" :class="$style.chainHead" @click="toggleExpand(item.uid)">
            <span>{{ $t('player__sound_effect_fx_' + item.fxId) }}</span>
            <svg :class="[$style.arrow, { [$style.arrowOpen]: expandUid === item.uid }]" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" :class="$style.chainDelete" :aria-label="$t('player__sound_effect_delete')" @click="removeEffect(index)">&times;</button>
          <div v-if="expandUid === item.uid" :class="$style.paramArea">
            <label v-for="p in getFx(item.fxId).params" :key="p.key" :class="$style.paramRow">
              <span :class="$style.paramLabel">{{ $t(p.label) }}</span>
              <base-slider-bar
                :class="$style.paramSlider"
                :value="item.params[p.key] ?? p.def"
                :min="p.min"
                :max="p.max"
                @change="setParam(item.uid, p.key, $event)"
              />
              <span :class="$style.paramValue">{{ item.params[p.key] ?? p.def }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== DJ 音效 ===== -->
    <template v-else-if="view === 'dj'">
      <div :class="$style.subHeader">
        <button type="button" :class="$style.backBtn" :aria-label="$t('back')" @click="view = 'home'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <b :class="$style.subTitle">{{ $t('player__sound_effect_make_dj') }}</b>
      </div>
      <div :class="$style.djGrid">
        <div :class="$style.djAdd">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
          <span>{{ $t('player__sound_effect_make_new_dj') }}</span>
        </div>
        <button
          v-for="card in djCards"
          :key="card.id"
          type="button"
          :class="[$style.djCard, $style[card.themeCls]]"
          @click="playDj(card.id)"
        >
          <b :class="$style.djName">{{ $t('player__sound_effect_dj_' + card.id) }}</b>
          <span :class="$style.djDesc">{{ $t('player__sound_effect_dj_' + card.id + '_desc') }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import { playDjEffect } from '@renderer/plugins/player'

const view = ref<'home' | 'general' | 'dj'>('home')

// ===== 多轨混音（占位） =====
const handleMultiTrack = () => {
  void dialog({ message: window.i18n.t('player__sound_effect_make_multi_soon') })
}

// ===== 34 种基础音效器（QQ 银河音效名单） =====
// 支持实时应用：EQ 类（十段/30段）、低音类、高保真、声道平衡、环绕、混响（脉冲响应/混响器）、动态类（压缩/限制/推进）、变调
// 其余类型可添加保存，应用时忽略（面板标灰）
interface FxDef { id: string, params: Array<{ key: string, label: string, min: number, max: number, def: number }> }
const P = (key: string, label: string, min: number, max: number, def: number) => ({ key, label, min, max, def })
const EQ_BANDS: FxDef['params'] = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((f: number, i: number) => P(`b${i}`, `player__sound_effect_fx_band_${f}`, -15, 15, 0))
const effectCatalog: FxDef[] = [
  { id: 'impulse', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'volume', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'rotary', params: [P('speed', 'player__sound_effect_fx_param_speed', 1, 50, 25)] },
  { id: 'limiter', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 50, 20)] },
  { id: 'stacker', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'eq30', params: EQ_BANDS },
  { id: 'exciter', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'stereo_wide', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'delay', params: [P('time', 'player__sound_effect_fx_param_time', 0, 1000, 200)] },
  { id: 'hifi', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'surround', params: [P('amount', 'player__sound_effect_fx_param_amount', 1, 30, 5)] },
  { id: 'ambient', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'dynamic', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'balance', params: [P('pan', 'player__sound_effect_fx_param_pan', -50, 50, 0)] },
  { id: 'pitch', params: [P('rate', 'player__sound_effect_fx_param_rate', 50, 150, 100)] },
  { id: 'virtual_bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'lowpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 20000, 18000)] },
  { id: 'highpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 20, 2000, 100)] },
  { id: 'bandpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000)] },
  { id: 'notch', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000)] },
  { id: 'lowshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'highshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'bell', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000), P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'tilt', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'super_bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'clear_vocal', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'wide_field', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'reverb', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'compressor', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 50, 20)] },
  { id: 'eq10', params: EQ_BANDS },
  { id: 'dynamic_eq', params: EQ_BANDS.slice(0, 4) },
  { id: 'spatial', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'chorus', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
]
const effectMap = computed(() => {
  const map: Record<string, FxDef> = {}
  for (const fx of effectCatalog) map[fx.id] = fx
  return map
})
const getFx = (id: string) => effectMap.value[id] ?? { params: [] }

// ===== 通用音效链（localStorage 持久化） =====
const CHAIN_KEY = 'lx_galaxy_general_chain'
const generalName = ref('') // 未命名音效
const chainEnabled = ref(false)
const chain = ref<Array<{ uid: string, fxId: string, params: Record<string, number> }>>([])
const showAddGrid = ref(false)
const expandUid = ref('')

const loadChain = () => {
  try {
    const raw = localStorage.getItem(CHAIN_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    chain.value = data.chain ?? []
    generalName.value = data.name ?? ''
    chainEnabled.value = !!data.enabled
  } catch {}
}
const persistChain = (enabled = chainEnabled.value) => {
  localStorage.setItem(CHAIN_KEY, JSON.stringify({ chain: chain.value, name: generalName.value, enabled }))
}
loadChain()

const toggleExpand = (uid: string) => {
  expandUid.value = expandUid.value === uid ? '' : uid
}
const addEffect = (fx: FxDef) => {
  const params: Record<string, number> = {}
  for (const p of fx.params) params[p.key] = p.def
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  chain.value = [...chain.value, { uid, fxId: fx.id, params }]
  expandUid.value = uid
  persistChain()
}
const removeEffect = (index: number) => {
  chain.value = chain.value.filter((_, i) => i !== index)
  persistChain()
}
const setParam = (uid: string, key: string, value: number) => {
  chain.value = chain.value.map(item => item.uid === uid ? { ...item, params: { ...item.params, [key]: Math.round(value) } } : item)
  persistChain()
}
const clearChain = () => {
  chain.value = []
  showAddGrid.value = false
  persistChain(false)
  chainEnabled.value = false
}

const toggleChainEnabled = () => {
  chainEnabled.value = !chainEnabled.value
  persistChain()
  // 通用音效的实时应用即将支持：当前开关仅保存状态，
  // 不写全局音效设置（避免与均衡器/推荐音效页的滑条互相覆盖）
  void dialog({ message: window.i18n.t('player__sound_effect_make_enable_soon') })
}

// ===== 导入 / 导出（JSON） =====
const fileRef = ref<HTMLInputElement | null>(null)
const exportChain = () => {
  const data = JSON.stringify({ type: 'lx-galaxy-general', name: generalName.value, chain: chain.value }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${generalName.value || 'sound-effect'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
const importChain = () => {
  fileRef.value?.click()
}
const handleImportFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      if (data.type != 'lx-galaxy-general' || !Array.isArray(data.chain)) throw new Error('bad format')
      chain.value = data.chain
      generalName.value = data.name ?? ''
      persistChain()
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_ok') })
    } catch {
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_bad') })
    }
  }
  reader.readAsText(file)
  ;(event.target as HTMLInputElement).value = ''
}

// ===== DJ 音效 =====
const djCards = [
  { id: 'clap', themeCls: 'djBlue' },
  { id: 'twist', themeCls: 'djTeal' },
  { id: 'jump', themeCls: 'djPink' },
  { id: 'shake', themeCls: 'djPurple' },
  { id: 'leg', themeCls: 'djIndigo' },
  { id: 'knock', themeCls: 'djGreen' },
]
const playDj = (type: 'clap' | 'twist' | 'jump' | 'shake' | 'leg' | 'knock') => {
  playDjEffect(type)
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}

// ===== 子页标题栏 =====
.subHeader {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  margin-bottom: 14px;
}
.backBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-font);
  cursor: pointer;
  transition: background-color @transition-fast;

  svg { width: 18px; height: 18px; }
  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, 0.06));
  }
}
.subTitle {
  flex: 1;
  text-align: center;
  margin-right: 30px;
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
}

// ===== 主页三卡片 =====
.cardGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding: 48px 20px 0;
}
.bigCard {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 34px 16px 28px;
  border: 1px solid var(--qm-line-1, rgba(0, 0, 0, 0.08));
  border-radius: var(--qm-radius-md, 10px);
  background: transparent;
  cursor: pointer;
  transition: box-shadow @transition-fast, transform @transition-fast, border-color @transition-fast;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--qm-shadow-1, 0 4px 12px rgba(0, 0, 0, 0.08));
    transform: translateY(-2px);
  }
}
.bigIcon {
  width: 44px;
  height: 44px;
  color: var(--color-font);
}
.bigName {
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
}
.bigDesc {
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.6;
  color: var(--qm-text-3, #888);
  text-align: center;
  max-width: 100%;
}
.homeFooter {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 40px 0 8px;
}
.footerLink {
  border: none;
  background: transparent;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--color-font);
  cursor: pointer;

  &:hover {
    color: var(--color-primary);
  }
}

// ===== 通用音效编辑器 =====
.genToolbar {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  margin-bottom: var(--qm-sp-7, 16px);
}
.genName {
  width: 160px;
  padding: 6px 10px;
  border: none;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--color-font);
  box-sizing: border-box;

  &:focus {
    outline: none;
    background-color: var(--qm-field, rgba(0, 0, 0, 0.04));
  }
}
.genPhone {
  margin-left: auto;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #aaa);
}
.genSwitch {
  position: relative;
  width: 40px;
  height: 22px;
  border: none;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-line-2, rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: background-color @transition-normal;
  padding: 0;

  .genSwitchDot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left @transition-normal;
  }
  &.genSwitchOn {
    background-color: var(--color-primary);
    .genSwitchDot { left: 20px; }
  }
}
.genSwitchLabel {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #999);
}
.genPill {
  border: none;
  border-radius: var(--qm-radius-chip, 999px);
  padding: 6px 16px;
  background-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;

  &:hover {
    background-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
}

.addArea {
  margin-bottom: 14px;
}
.addHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--qm-sp-4, 10px);

  b {
    font-size: var(--qm-fs-md, 14px);
    color: var(--color-font);
  }
}
.addLocalBtn {
  border: none;
  border-radius: var(--qm-radius-chip, 999px);
  padding: 7px 16px;
  background-color: var(--color-primary);
  color: #fff;
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
}
.addGroup {
  margin: 0 0 8px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #999);
}
.fxGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--qm-sp-4, 10px);
}
.fxBtn {
  height: 32px;
  border: none;
  border-radius: var(--qm-radius-xs, 6px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.05));
  color: var(--color-font);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 6px;

  &:hover {
    background-color: var(--qm-primary-soft, rgba(0, 0, 0, 0.06));
    color: var(--color-primary);
  }
}
.addBigBtn {
  width: 100%;
  height: 52px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.05));
  color: var(--qm-text-3, #999);
  cursor: pointer;

  svg { width: 20px; height: 20px; }
  &:hover {
    color: var(--color-primary);
  }
}

.chainList {
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-3, 8px);
}
.chainItem {
  position: relative;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.04));
}
.chainHead {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 40px 10px 14px;
  border: none;
  background: transparent;
  color: var(--color-font);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;

  &:hover {
    color: var(--color-primary);
  }
}
.arrow {
  width: 16px;
  height: 16px;
  transition: transform @transition-fast;

  &.arrowOpen {
    transform: rotate(180deg);
  }
}
.chainDelete {
  position: absolute;
  right: 12px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--qm-text-3, #999);
  font-size: var(--qm-fs-lg, 15px);
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: var(--color-btn-close, #e74c3c);
    color: #fff;
  }
}
.paramArea {
  padding: 4px 14px 12px;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-3, 8px);
}
.paramRow {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  min-width: 0;
}
.paramLabel {
  flex: none;
  width: 70px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--color-font);
}
.paramSlider {
  flex: 1 1 auto;
  min-width: 0;
}
.paramValue {
  flex: none;
  width: 36px;
  text-align: right;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3, #999);
  font-variant-numeric: tabular-nums;
}

// ===== DJ 音效 =====
.djGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding-top: var(--qm-sp-7, 16px);
}
.djAdd {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-2, 6px);
  min-height: 118px;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.05));
  color: var(--qm-text-3, #999);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;

  svg { width: 22px; height: 22px; }
  &:hover {
    color: var(--color-primary);
  }
}
.djCard {
  min-height: 118px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-3, 8px);
  border: 1px solid var(--qm-line-1);
  border-radius: var(--qm-radius-card, 10px);
  cursor: pointer;
  // 与「精选音效」一致：低饱和柔和渐变 + 主题墨色文字，去掉了原来的白字 + 重描边阴影
  background-color: var(--qm-card);
  color: var(--qm-text-1);
  transition: transform var(--qm-t-fast), border-color var(--qm-t-fast);

  &:hover {
    transform: translateY(-1px);
    border-color: var(--qm-line-2);
  }
  &:active {
    transform: scale(0.99);
  }
}
.djName {
  font-size: var(--qm-fs-xl, 16px);
  font-weight: var(--qm-fw-semibold, 600);
}
.djDesc {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
}

// 色相族：与精选音效卡同一套取值方式（改这两个百分比即可整体调浓淡）
.djBlue   { --tile-hue: 74, 157, 196; }
.djTeal   { --tile-hue: 79, 179, 165; }
.djPink   { --tile-hue: 201, 106, 99; }
.djPurple { --tile-hue: 142, 124, 195; }
.djIndigo { --tile-hue: 107, 127, 199; }
.djGreen  { --tile-hue: 90, 164, 105; }

.djBlue, .djTeal, .djPink, .djPurple, .djIndigo, .djGreen {
  background-image: linear-gradient(
    135deg,
    color-mix(in srgb, rgb(var(--tile-hue)) 18%, var(--qm-card)),
    color-mix(in srgb, rgb(var(--tile-hue)) 7%, var(--qm-card))
  );
}
</style>
