import { ref } from '@common/utils/vueTools'

/**
 * 顶层路由刷新 key：每次自增以触发 <router-view> 重新挂载当前路由组件。
 * 由 Toolbar 顶部的刷新按钮触发。
 */
export const routeReloadKey = ref(0)

export const triggerRouteReload = () => {
  routeReloadKey.value++
}

