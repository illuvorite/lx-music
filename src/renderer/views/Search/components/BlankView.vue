<template>
  <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
    <div v-show="props.visible" :class="[$style.blank, 'qm-scroll']">
      <div :class="$style.welcome">
        <svg-icon name="search" :class="$style.welcomeIcon" />
        <p :class="$style.welcomeText">{{ $t('search__welcome') }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
// 搜索页空态：只保留欢迎提示。
// 「热门搜索」「搜索历史」已统一放在顶部搜索框的下拉面板里（material/SearchInput.vue），此处不再重复展示。
const props = defineProps({
  visible: Boolean,
  source: {
    type: String,
    default: '',
  },
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.blank {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: var(--qm-content-pad-top) var(--qm-content-pad-right) var(--qm-s7) var(--qm-content-pad-left);
  overflow: hidden auto;
}

.welcome {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-s3);
  color: var(--qm-text-4);

  .welcomeIcon { width: 56px; height: 56px; fill: currentColor; opacity: 0.4; }
  .welcomeText { margin: 0; font-size: var(--qm-font-body); }
}
</style>
