// ============================================================
// 受保护文件：该文件已与 lx-music-desktop-2.12.2 同步，
// 包含修复音源切换卡在“初始化中”的关键逻辑。
// 未经授权不得修改。若需变更，请先移除本注释并联系相关负责人。
// ============================================================
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'


export default () => {
  mainHandle<LX.Download.ListItem[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_get, async() => {
    return global.lx.worker.dbService.getDownloadList()
  })
  mainHandle<LX.Download.saveDownloadMusicInfo>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_add, async({ params: { list, addMusicLocationType } }) => {
    await global.lx.worker.dbService.downloadInfoSave(list, addMusicLocationType)
  })
  mainHandle<LX.Download.ListItem[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_update, async({ params: list }) => {
    await global.lx.worker.dbService.downloadInfoUpdate(list)
  })
  mainHandle<string[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_remove, async({ params: ids }) => {
    await global.lx.worker.dbService.downloadInfoRemove(ids)
  })
  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.download_list_clear, async() => {
    await global.lx.worker.dbService.downloadInfoClear()
  })
}
