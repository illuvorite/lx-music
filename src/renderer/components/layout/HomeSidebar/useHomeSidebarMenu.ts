import { ref, reactive, computed, nextTick, toRaw, type Ref } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { userLists, defaultList, loveList, allMusicList } from '@renderer/store/list/state'
import type { useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import musicSdk from '@renderer/utils/musicSdk'
import { openUrl } from '@common/utils/electron'
import { openSaveDir, showSelectDialog } from '@renderer/utils/ipc'
import { dialog } from '@renderer/plugins/Dialog'
import { addListMusics, createUserList, getListMusics, overwriteListMusics, removeUserList, updateUserList } from '@renderer/store/list/action'
import { filterFileName, fixNewMusicInfoQuality, filterMusicList, toNewMusicInfo } from '@renderer/utils'
import useImportTip from '@renderer/utils/compositions/useImportTip'
import { addLocalFile } from '@renderer/views/List/MyList/actions'

type ListKind = 'love' | 'default' | 'user'

interface MenuContext {
  listInfo: LX.List.MyListInfo
  kind: ListKind
}

export interface UseHomeSidebarMenuOptions {
  router: ReturnType<typeof useRouter>
  handleRename?: (index: number) => void
  isShowListSortModal?: Ref<boolean>
  sortListInfo?: { id: string, name: string }
  isShowDuplicateMusicModal?: Ref<boolean>
  duplicateListInfo?: { id: string, name: string }
}

/**
 *  HomeSidebar 右键菜单组合式函数：为侧栏中的"我喜欢"/"试听列表"/"已订阅歌单"
 *  提供与 /list 详情页一致的功能菜单（重命名/排序/复制/导入本地文件/同步/源详情/导出/删除等）。
 */
export default (options: UseHomeSidebarMenuOptions) => {
  const t = useI18n()
  const showImportTip = useImportTip()

  const menuLocation = reactive({ x: 0, y: 0 })
  const isShowMenu = ref(false)
  const menuContext = ref<MenuContext | null>(null)

  // 各菜单项的可用性：右键时根据歌单类型动态计算
  const menuControl = reactive({
    rename: true,
    duplicate: true,
    sort: true,
    local_file: true,
    sourceDetail: true,
    import: true,
    export: true,
    sync: false,
    remove: true,
  })

  const menus = computed(() => ([
    { name: t('lists__rename'), action: 'rename', disabled: !menuControl.rename },
    { name: t('lists__sort_list'), action: 'sort', disabled: !menuControl.sort },
    { name: t('lists__duplicate'), action: 'duplicate', disabled: !menuControl.duplicate },
    { name: t('lists__select_local_file'), action: 'local_file', disabled: !menuControl.local_file },
    { name: t('lists__sync'), action: 'sync', disabled: !menuControl.sync },
    { name: t('lists__source_detail'), action: 'sourceDetail', disabled: !menuControl.sourceDetail },
    { name: t('lists__import'), action: 'import', disabled: !menuControl.import },
    { name: t('lists__export'), action: 'export', disabled: !menuControl.export },
    { name: t('lists__remove'), action: 'remove', disabled: !menuControl.remove },
  ]))

  const assertSupportDetail = (listInfo: LX.List.MyListInfo): boolean => {
    const userList = listInfo as LX.List.UserListInfo
    if (!userList.source) return false
    const { source, sourceListId } = userList
    if (!sourceListId) return false
    const sdk = (musicSdk as Record<string, any>)[source]
    if (!sdk) return false
    if (sourceListId.includes('board__')) {
      return !!sdk.leaderboard?.getDetailPageUrl
    }
    return !!sdk.songList?.getDetailPageUrl
  }

  const computeMenuControl = (listInfo: LX.List.MyListInfo, kind: ListKind) => {
    const isBuiltin = kind === 'love' || kind === 'default'
    menuControl.rename = !isBuiltin
    menuControl.remove = !isBuiltin
    menuControl.sort = !isBuiltin && (allMusicList.get(listInfo.id)?.length ?? 0) > 0
    menuControl.local_file = true
    menuControl.import = true
    menuControl.export = true
    menuControl.duplicate = true
    menuControl.sync = false
    menuControl.sourceDetail = false

    if (!isBuiltin) {
      menuControl.sourceDetail = assertSupportDetail(listInfo)
      if ('source' in listInfo && listInfo.source) {
        menuControl.sync = !!(musicSdk as Record<string, any>)[listInfo.source]?.songList
      }
    }
  }

  const showMenu = (event: MouseEvent, listInfo: LX.List.MyListInfo, kind: ListKind) => {
    event.preventDefault()
    menuContext.value = { listInfo, kind }
    computeMenuControl(listInfo, kind)

    menuLocation.x = event.pageX
    menuLocation.y = event.pageY

    if (isShowMenu.value) return
    nextTick(() => {
      isShowMenu.value = true
    })
  }

  const hideMenu = () => {
    isShowMenu.value = false
  }

  // ===== 通用动作 =====
  const handleOpenSourceDetailPage = async(listInfo: LX.List.UserListInfo) => {
    const { sourceListId } = listInfo
    const source = listInfo.source
    if (!sourceListId || !source) return
    const sdk = (musicSdk as Record<string, any>)[source]
    if (!sdk) return
    let url: string | undefined
    if (sourceListId.includes('board__')) {
      const id = sourceListId.replace(/board__/, '')
      url = sdk.leaderboard?.getDetailPageUrl(id)
    } else if (sdk.songList?.getDetailPageUrl) {
      url = await sdk.songList.getDetailPageUrl(sourceListId)
    }
    if (!url) return
    void openUrl(url)
  }

  const handleExportList = (listInfo: LX.List.MyListInfo) => {
    if (!listInfo) return
    void openSaveDir({
      title: t('lists__export_part_desc'),
      defaultPath: `lx_list_part_${filterFileName(listInfo.name)}.lxmc`,
    }).then(async result => {
      if (result.canceled || !result.filePath) return
      void window.lx.worker.main.saveLxConfigFile(result.filePath, {
        type: 'playListPart_v2',
        data: { ...toRaw(listInfo), list: toRaw(await getListMusics(listInfo.id)) },
      })
    })
  }

  const handleImportList = (listInfo: LX.List.MyListInfo, index: number) => {
    void showSelectDialog({
      title: t('lists__import_part_desc'),
      properties: ['openFile'],
      filters: [
        { name: 'Play List Part', extensions: ['json', 'lxmc'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    }).then(async result => {
      if (result.canceled) return
      const filePath = result.filePaths[0]
      if (!filePath) return
      let configData: any
      try {
        configData = await window.lx.worker.main.readLxConfigFile(filePath)
      } catch (error) {
        return
      }
      let listData: LX.ConfigFile.MyListInfoPart['data']
      switch (configData.type) {
        case 'playListPart':
          listData = configData.data
          listData.list = filterMusicList(listData.list.map(m => toNewMusicInfo(m)))
          break
        case 'playListPart_v2':
          listData = configData.data
          listData.list = filterMusicList(listData.list).map(m => fixNewMusicInfoQuality(m))
          break
        default:
          showImportTip(configData.type)
          return
      }

      const targetList = [defaultList, loveList, ...userLists].find(l => l.id == listData.id)
      if (targetList) {
        const confirm = await dialog.confirm({
          message: t('lists__import_part_confirm', { importName: listData.name, localName: targetList.name }),
          cancelButtonText: t('lists__import_part_button_cancel'),
          confirmButtonText: t('lists__import_part_button_confirm'),
        })
        if (confirm) {
          listData.name = targetList.name
          switch (listData.id) {
            case defaultList.id:
            case loveList.id:
              break
            default:
              void updateUserList([
                {
                  name: listData.name,
                  id: listData.id,
                  source: (listData as LX.List.UserListInfo).source,
                  sourceListId: (listData as LX.List.UserListInfo).sourceListId,
                  locationUpdateTime: (targetList as LX.List.UserListInfo).locationUpdateTime,
                },
              ])
              break
          }
          void overwriteListMusics({
            listId: listData.id,
            musicInfos: listData.list.map(m => fixNewMusicInfoQuality(m)),
          })
          return
        }
        listData.id += `__${Date.now()}`
      }
      void createUserList({
        position: index,
        name: listData.name,
        id: listData.id,
        source: (listData as LX.List.UserListInfo).source,
        sourceListId: (listData as LX.List.UserListInfo).sourceListId,
      })
      void addListMusics(listData.id, listData.list.map(m => fixNewMusicInfoQuality(m)))
    })
  }

  const handleRemove = (listInfo: LX.List.MyListInfo) => {
    void dialog.confirm({
      message: t('lists__remove_tip', { name: listInfo.name }),
      confirmButtonText: t('lists__remove_tip_button'),
    }).then(isRemove => {
      if (!isRemove) return
      void removeUserList([listInfo.id])
      if (options.router.currentRoute.value.query.id === listInfo.id) {
        options.router.replace({
          path: '/list',
          query: { id: LIST_IDS.DEFAULT },
        }).catch(() => {})
      }
    })
  }

  const handleSync = async(listInfo: LX.List.UserListInfo) => {
    const { default: syncSourceList } = await import('@renderer/store/list/syncSourceList')
    void dialog.confirm({
      message: t('lists__sync_confirm_tip', { name: listInfo.name }),
      confirmButtonText: t('lists__remove_tip_button'),
    }).then(isSync => {
      if (!isSync) return
      void syncSourceList(listInfo)
    })
  }

  const handleSortList = (listInfo: LX.List.MyListInfo) => {
    if (options.isShowListSortModal && options.sortListInfo) {
      options.sortListInfo.id = listInfo.id
      options.sortListInfo.name = listInfo.name
      options.isShowListSortModal.value = true
    } else {
      options.router.push({ path: '/list', query: { id: listInfo.id } }).catch(() => {})
    }
  }

  const handleDuplicateList = (listInfo: LX.List.MyListInfo) => {
    if (options.isShowDuplicateMusicModal && options.duplicateListInfo) {
      options.duplicateListInfo.id = listInfo.id
      options.duplicateListInfo.name = listInfo.name
      options.isShowDuplicateMusicModal.value = true
    } else {
      options.router.push({ path: '/list', query: { id: listInfo.id } }).catch(() => {})
    }
  }

  const menuClick = (action: { action: string } | null) => {
    hideMenu()
    if (!action || !menuContext.value) return
    const { listInfo } = menuContext.value
    const listInfoRef = listInfo
    menuContext.value = null

    switch (action.action) {
      case 'rename':
        if (options.handleRename) {
          const idx = userLists.findIndex(l => l.id === listInfoRef.id)
          console.log('[HomeSidebarMenu] rename idx=', idx, 'listId=', listInfoRef.id)
          if (idx >= 0) {
            options.handleRename(idx)
          }
        } else {
          options.router.push({ path: '/list', query: { id: listInfoRef.id } }).catch(() => {})
        }
        break
      case 'duplicate':
        handleDuplicateList(listInfo)
        break
      case 'sort':
        handleSortList(listInfo)
        break
      case 'local_file':
        void addLocalFile(listInfo)
        break
      case 'sourceDetail':
        void handleOpenSourceDetailPage(listInfo as LX.List.UserListInfo)
        break
      case 'import':
        handleImportList(listInfo, userLists.length)
        break
      case 'export':
        handleExportList(listInfo)
        break
      case 'sync':
        void handleSync(listInfo as LX.List.UserListInfo)
        break
      case 'remove':
        handleRemove(listInfo)
        break
    }
  }

  return {
    menus,
    menuLocation,
    isShowMenu,
    showMenu,
    menuClick,
    hideMenu,
  }
}

