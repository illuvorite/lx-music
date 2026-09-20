import { OnlineMusicStrategy } from './OnlineMusicStrategy'
import { LocalMusicStrategy } from './LocalMusicStrategy'
import { DownloadMusicStrategy } from './DownloadMusicStrategy'
import { MusicSourceStrategy, GetMusicUrlParams, GetPicUrlParams, GetLyricInfoParams } from './MusicSourceStrategy'

class MusicSourceManager {
  private strategies = new Map<string, MusicSourceStrategy>()
  private defaultStrategy: MusicSourceStrategy

  constructor() {
    this.strategies.set('online', new OnlineMusicStrategy())
    this.strategies.set('local', new LocalMusicStrategy())
    this.strategies.set('download', new DownloadMusicStrategy())
    this.defaultStrategy = this.strategies.get('online')!
  }

  private getStrategy(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): MusicSourceStrategy {
    if ('progress' in musicInfo) {
      return this.strategies.get('download')!
    } else if (musicInfo.source === 'local') {
      return this.strategies.get('local')!
    } else {
      return this.strategies.get('online')!
    }
  }

  async getMusicUrl(params: GetMusicUrlParams): Promise<string> {
    const strategy = this.getStrategy(params.musicInfo)
    return strategy.getMusicUrl(params)
  }

  async getPicUrl(params: GetPicUrlParams): Promise<string> {
    const strategy = this.getStrategy(params.musicInfo)
    return strategy.getPicUrl(params)
  }

  async getLyricInfo(params: GetLyricInfoParams): Promise<LX.Player.LyricInfo> {
    const strategy = this.getStrategy(params.musicInfo)
    return strategy.getLyricInfo(params)
  }

  registerStrategy(name: string, strategy: MusicSourceStrategy): void {
    this.strategies.set(name, strategy)
  }

  getStrategyByName(name: string): MusicSourceStrategy | undefined {
    return this.strategies.get(name)
  }
}

export const musicSourceManager = new MusicSourceManager()

export const getMusicUrl = (params: GetMusicUrlParams) => musicSourceManager.getMusicUrl(params)
export const getPicUrl = (params: GetPicUrlParams) => musicSourceManager.getPicUrl(params)
export const getLyricInfo = (params: GetLyricInfoParams) => musicSourceManager.getLyricInfo(params)
// Backward compatibility
export const getPicPath = getPicUrl