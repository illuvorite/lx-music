import { httpFetch } from '../../request'

import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

export const filterMusicInfoItem = item => {
  const types = []
  const _types = {}
  if (item.file.size_128mp3 != 0) {
    let size = sizeFormate(item.file.size_128mp3)
    types.push({ type: '128k', size })
    _types['128k'] = {
      size,
    }
  }
  if (item.file.size_320mp3 !== 0) {
    let size = sizeFormate(item.file.size_320mp3)
    types.push({ type: '320k', size })
    _types['320k'] = {
      size,
    }
  }
  if (item.file.size_flac !== 0) {
    let size = sizeFormate(item.file.size_flac)
    types.push({ type: 'flac', size })
    _types.flac = {
      size,
    }
  }
  if (item.file.size_hires !== 0) {
    let size = sizeFormate(item.file.size_hires)
    types.push({ type: 'flac24bit', size })
    _types.flac24bit = {
      size,
    }
  }

  const albumId = item.album.id ?? ''
  const albumMid = item.album.mid ?? ''
  const albumName = item.album.name ?? ''
  return {
    source: 'tx',
    singer: formatSingerName(item.singer, 'name'),
    name: item.title,
    albumName,
    albumId,
    albumMid,
    interval: formatPlayTime(item.interval),
    songId: item.id,
    songmid: item.mid,
    strMediaMid: item.file.media_mid,
    img: (albumId === '' || albumId === '空')
      ? item.singer?.length ? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg` : ''
      : `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`,
    types,
    _types,
    typeUrl: {},
  }
}


/**
 * 创建一个适用于TX的Http请求
 * @param {*} url
 * @param {*} options
 * @param {*} retryNum
 */
const createMusicuFetch = async(data, options, retryNum = 0) => {
  if (retryNum > 2) throw new Error('try max num')

  let result
  try {
    result = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      body: {
        comm: {
          cv: 4747474,
          ct: 24,
          format: 'json',
          inCharset: 'utf-8',
          outCharset: 'utf-8',
          uin: 0,
        },
        ...data,
      },
      headers: {
        'User-Angent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
      },
    }).promise
  } catch (err) {
    console.log(err)
    return createMusicuFetch(data, options, ++retryNum)
  }
  if (result.statusCode !== 200 || result.body.code != 0) return createMusicuFetch(data, options, ++retryNum)

  return result.body
}

// 乐馆「歌手」筛选值 → 接口参数
const SINGER_AREA_MAP = {
  all: -100,
  mainland: 200,
  hktw: 2,
  western: 5,
  japan: 4,
  korea: 3,
}
const SINGER_SEX_MAP = {
  all: -100,
  male: 0,
  female: 1,
  group: 2,
}
const SINGER_PAGE_SIZE = 80

const getSingerIndexValue = index => {
  if (!index || index === 'all') return -100
  if (index === '#') return 27
  const value = String(index).toUpperCase().charCodeAt(0) - 64
  return value >= 1 && value <= 26 ? value : -100
}

// 头像统一取 300x300 并走 https，避免出现小图与混合内容
const fixSingerPic = pic => {
  if (!pic) return ''
  return pic.replace(/^http:/, 'https:').replace(/T001R\d+x\d+M000/, 'T001R300x300M000')
}

export default {
  /**
   * 获取歌手列表（乐馆 - 歌手页）
   * @param {object} [options]
   * @param {string} [options.area] 地区：all/mainland/hktw/western/japan/korea
   * @param {string} [options.sex] 性别：all/male/female/group
   * @param {string} [options.index] 首字母：all / A-Z / #
   * @param {number} [options.page] 页码
   */
  getSingerList({ area = 'all', sex = 'all', index = 'all', page = 1 } = {}) {
    const data = {
      comm: { ct: 24, cv: 0 },
      singerList: {
        module: 'Music.SingerListServer',
        method: 'get_singer_list',
        param: {
          area: SINGER_AREA_MAP[area] ?? -100,
          sex: SINGER_SEX_MAP[sex] ?? -100,
          genre: -100,
          index: getSingerIndexValue(index),
          sin: (page - 1) * SINGER_PAGE_SIZE,
          cur_page: page,
        },
      },
    }
    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&data=${encodeURIComponent(JSON.stringify(data))}`
    return httpFetch(url).promise.then(({ body }) => {
      if (body.code !== 0 || body.singerList?.code !== 0) throw new Error('get singer list faild.')

      const raw = body.singerList.data ?? {}
      const list = (raw.singerlist ?? []).map(item => ({
        id: item.singer_mid,
        name: item.singer_name,
        img: fixSingerPic(item.singer_pic),
      })).filter(item => item.id && item.name)
      const total = raw.total ?? 0
      return {
        source: 'tx',
        list,
        page,
        hasMore: list.length > 0 && page * SINGER_PAGE_SIZE < total,
      }
    })
  },
  /**
   * 获取歌手信息
   * @param {*} id
   */
  getInfo(id) {
    return createMusicuFetch({
      req_1: {
        module: 'music.musichallSinger.SingerInfoInter',
        method: 'GetSingerDetail',
        param: {
          singer_mid: [id],
          ex_singer: 1,
          wiki_singer: 1,
          group_singer: 0,
          pic: 1,
          photos: 0,
        },
      },
      req_2: {
        module: 'music.musichallAlbum.AlbumListServer',
        method: 'GetAlbumList',
        param: {
          singerMid: id,
          order: 0,
          begin: 0,
          num: 1,
          songNumTag: 0,
          singerID: 0,
        },
      },
      req_3: {
        module: 'musichall.song_list_server',
        method: 'GetSingerSongList',
        param: {
          singerMid: id,
          order: 1,
          begin: 0,
          num: 1,
        },
      },
    }).then(body => {
      if (body.req_1.code != 0 || body.req_2 != 0 || body.req_3 != 0) throw new Error('get singer info faild.')

      const info = body.req_1.data.singer_list[0]
      const music = body.req_3.data
      const album = body.req_3.data
      return {
        source: 'tx',
        id: info.basic_info.singer_mid,
        info: {
          name: info.basic_info.name,
          desc: info.ex_info.desc,
          avatar: info.pic.pic,
          gender: info.ex_info.genre === 1 ? 'man' : 'woman',
        },
        count: {
          music: music.totalNum,
          album: album.total,
        },
      }
    })
  },
  /**
   * 获取歌手专辑列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  getAlbumList(id, page = 1, limit = 10) {
    if (page === 1) page = 0
    return createMusicuFetch({
      req: {
        module: 'music.musichallAlbum.AlbumListServer',
        method: 'GetAlbumList',
        param: {
          singerMid: id,
          order: 0,
          begin: page * limit,
          num: limit,
          songNumTag: 0,
          singerID: 0,
        },
      },
    }).then(body => {
      if (body.req.code != 0) throw new Error('get singer album faild.')

      const list = this.filterAlbumList(body.req.data.albumList)
      return {
        source: 'tx',
        list,
        limit,
        page,
        total: body.req.data.total,
      }
    })
  },
  /**
   * 获取歌手歌曲列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  async getSongList(id, page = 1, limit = 100) {
    if (page === 1) page = 0
    return createMusicuFetch({
      req: {
        module: 'musichall.song_list_server',
        method: 'GetSingerSongList',
        param: {
          singerMid: id,
          order: 1,
          begin: page * limit,
          num: limit,
        },
      },
    }).then(body => {
      if (body.req.code != 0) throw new Error('get singer song list faild.')

      const list = this.filterSongList(body.req.data.songList)
      return {
        source: 'tx',
        list,
        limit,
        page,
        total: body.req.data.totalNum,
      }
    })
  },
  filterAlbumList(raw) {
    return raw.map(item => {
      return {
        id: item.albumID,
        mid: item.albumMid,
        count: item.totalNum,
        info: {
          name: item.albumName,
          author: item.singerName,
          img: `https://y.gtimg.cn/music/photo_new/T002R500x500M000${item.albumMid}.jpg`,
          desc: null,
        },
      }
    })
  },
  filterSongList(raw) {
    raw.map(item => {
      return filterMusicInfoItem(item.songInfo)
    })
  },
}

