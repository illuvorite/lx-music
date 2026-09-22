<template>
  <!-- 三种进度条样式（迷你 / 中等 / 全宽）共用同一套控件区，仅进度条的摆放不同：
       组件内部按 variant 切换，避免出现多套外观不一致的播放栏 -->
  <MiniWidthProgress :variant="appSetting['common.playBarProgressStyle'] || 'mini'" />
</template>

<script setup>
import { appSetting } from '@renderer/store/setting'
import MiniWidthProgress from './MiniWidthProgress.vue'

</script>
