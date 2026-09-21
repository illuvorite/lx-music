<template lang="pug">
dt#search {{ $t('setting__search') }}
dd
  //- 「显示热门搜索 / 显示搜索历史」开关已移除：这两块内容统一由顶部搜索框下拉面板展示
  .gap-top
    base-checkbox(id="setting_search_focusSearchBox_enable" :model-value="appSetting['search.isFocusSearchBox']" :label="$t('setting__search_focus_search_box')" @update:model-value="updateSetting({'search.isFocusSearchBox': $event})")

</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingSearch',
  setup() {
    return {
      appSetting,
      updateSetting,
    }
  },
}
</script>
