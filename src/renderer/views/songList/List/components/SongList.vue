<template>
  <div :class="$style.container">
    <div v-show="!props.listInfo.noItemLabel" ref="dom_list_ref" :class="[$style.listContent, 'qm-scroll']">
      <div :class="$style.grid">
        <common-song-card
          v-for="item in props.listInfo.list" :key="item.id"
          :img="item.img"
          :name="item.name"
          :meta="item.author"
          :play-count="item.play_count || ''"
          @click="toDetail(item)"
        />
      </div>
      <div :class="$style.pagination">
        <material-pagination :count="props.listInfo.total" :limit="props.listInfo.limit" :page="props.listInfo.page" @btn-click="togglePage" />
      </div>
    </div>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-show="props.listInfo.noItemLabel" :class="$style.noitem">
        <svg-icon name="music" :class="$style.noitemIcon" />
        <p v-text="props.listInfo.noItemLabel" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from '@common/utils/vueTools'
import type { ListInfo, ListInfoItem } from '@renderer/store/songList/state'
import { useRoute, useRouter } from '@common/utils/vueRouter'


const props = withDefaults(defineProps<{
  listInfo: ListInfo
  visibleSource?: boolean
}>(), {
  visibleSource: false,
})

const router = useRouter()
const route = useRoute()

const dom_list_ref = ref<HTMLElement | null>(null)

const emit = defineEmits(['toggle-page'])


const togglePage = (page: number) => {
  emit('toggle-page', page)
}

const toDetail = (info: ListInfoItem) => {
  void router.push({
    path: '/songList/detail',
    query: {
      source: info.source,
      id: info.id,
      picUrl: info.img,
      fromName: route.name as string,
    },
  })
}

defineExpose({
  scrollTo(top: number) {
    dom_list_ref.value?.scrollTo({
      top,
      // behavior: 'smooth',
    })
  },
  getScrollTop() {
    return dom_list_ref.value?.scrollTop ?? 0
  },
})


</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  background-color: var(--qm-surface);
}

.listContent {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: var(--qm-content-pad-top) var(--qm-content-pad-right) 0 var(--qm-content-pad-left);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
  gap: var(--qm-s6);
}

.pagination {
  text-align: center;
  padding: var(--qm-s5) 0 var(--qm-s7);
}

.noitem {
  position: absolute;
  inset: 0;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  gap: var(--qm-s3);
  color: var(--qm-text-4);

  .noitemIcon { width: 56px; height: 56px; fill: currentColor; opacity: 0.5; }
  p {
    margin: 0;
    font-size: var(--qm-font-meta);
    color: var(--qm-text-4);
  }
}
</style>
