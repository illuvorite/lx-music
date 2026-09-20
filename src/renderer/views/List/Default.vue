<template>
  <div :class="$style.container">
    <MusicList
      ref="musicList"
      :list-id="listId"
      @show-menu="() => {}"
    />
  </div>
</template>

<script>
import { ref, watch } from '@common/utils/vueTools'
import MusicList from './MusicList/index.vue'
import { allMusicList, defaultList } from '@renderer/store/list/state'

export default {
  name: 'Default',
  components: { MusicList },
  setup() {
    const list = ref([])
    watch(
      () => allMusicList.get(defaultList.id),
      (v) => { list.value = v ? [...v] : [] },
      { immediate: true, deep: true },
    )
    return { listId: 'default', list }
  },
}
</script>

<style lang="less" module>
.container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
