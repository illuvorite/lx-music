<template>
  <div :class="$style.view">
    <router-view v-slot="{ Component }">
      <transition
        mode="out-in"
        enter-active-class="view-fade-enter-active"
        leave-active-class="view-fade-leave-active"
      >
        <component :is="Component" :key="routeKey" class="view-container" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { routeReloadKey } from '@renderer/store/navigation'

// routeKey 变化时强制重新挂载当前路由组件
// 1. 路由变化 → router-view 默认行为已经处理
// 2. 刷新按钮递增 routeReloadKey → 这里 key 自增，组件重新挂载
const routeKey = routeReloadKey
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.view {
  position: relative;
  z-index: 1;
  // 普通页面撑满主视图；全屏覆盖页（设置页，带 data-fullcover 属性）保持自己的 fixed 定位
  // 用属性选择器而非类名：CSS Modules 会把 :not(.类名) 里的类名也哈希化导致排除失效
  > :global(.view-container:not([data-fullcover])) {
    position: absolute !important;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
  }
}

// 全局路由切换淡入（用 module 之外写以避免 scoped 干扰）
</style>

<style lang="less">
.view-fade-enter-active {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.view-fade-leave-active {
  transition: opacity 160ms cubic-bezier(0.4, 0, 1, 1);
}
.view-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
// 全屏覆盖页（设置）：不加位移，避免 transform 破坏 fixed 定位
.view-fade-enter-from.view-fullcover {
  transform: none;
}
.view-fade-leave-to {
  opacity: 0;
}
</style>
