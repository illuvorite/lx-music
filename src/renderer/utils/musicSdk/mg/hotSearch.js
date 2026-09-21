import { httpFetch } from '../../request'

export default {
  _requestObj: null,
  async getList(retryNum = 0) {
    return this.getRawList(retryNum).then(rawList => ({ source: 'mg', list: this.filterList(rawList) }))
  },
  /**
   * 带热度的热搜词（搜索框下拉「热门搜索」用，热度取接口 note）
   * @returns {Promise<{source: string, list: Array<{name: string, hot: number}>}>}
   */
  async getListWithHot(retryNum = 0) {
    return this.getRawList(retryNum).then(rawList => ({ source: 'mg', list: this.filterListWithHot(rawList) }))
  },
  async getRawList(retryNum = 0) {
    if (this._requestObj) this._requestObj.cancelHttp()
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const _requestObj = httpFetch('http://jadeite.migu.cn:7090/music_search/v3/search/hotword')
    const { body, statusCode } = await _requestObj.promise
    if (statusCode != 200 || body.code !== '000000') throw new Error('获取热搜词失败')
    // console.log(body, statusCode)
    return body.data.hotwords[0].hotwordList
  },
  filterList(rawList) {
    return rawList.filter(item => item.resourceType == 'song').map(item => item.word)
  },
  // hot 为接口 note（搜索热度）
  filterListWithHot(rawList) {
    return rawList
      .filter(item => item.resourceType == 'song')
      .map(item => ({ name: item.word, hot: Number(item.note) || 0 }))
  },
}
