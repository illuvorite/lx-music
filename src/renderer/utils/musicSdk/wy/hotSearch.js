import { eapiRequest } from './utils/index'

export default {
  _requestObj: null,
  async getList(retryNum = 0) {
    return this.getRawList(retryNum).then(rawList => ({ source: 'wy', list: this.filterList(rawList) }))
  },
  /**
   * 带热度的热搜词（搜索框下拉「热门搜索」用，热度取接口 score）
   * @returns {Promise<{source: string, list: Array<{name: string, hot: number}>}>}
   */
  async getListWithHot(retryNum = 0) {
    return this.getRawList(retryNum).then(rawList => ({ source: 'wy', list: this.filterListWithHot(rawList) }))
  },
  async getRawList(retryNum = 0) {
    if (this._requestObj) this._requestObj.cancelHttp()
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const _requestObj = eapiRequest('/api/search/chart/detail', {
      id: 'HOT_SEARCH_SONG#@#',
    })
    const { body, statusCode } = await _requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取热搜词失败')

    return body.data.itemList
  },
  filterList(rawList) {
    return rawList.map(item => item.searchWord)
  },
  // hot 为接口 score（搜索热度）
  filterListWithHot(rawList) {
    return rawList.map(item => ({ name: item.searchWord, hot: Number(item.score ?? item.hot ?? 0) || 0 }))
  },
}
