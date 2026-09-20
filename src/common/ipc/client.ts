export interface IpcRequest<P = any, R = any> {
  channel: string
  payload: P
  response: R
}

export interface IpcEvent<P = any> {
  channel: string
  payload: P
}

export interface IpcApi {
  'setting:get': IpcRequest<void, LX.AppSetting>
  'setting:set': IpcRequest<Partial<LX.AppSetting>, void>
  'music:url': IpcRequest<{ musicInfo: LX.Music.MusicInfo; quality?: LX.Quality; isRefresh?: boolean }, string>
  'music:pic': IpcRequest<{ musicInfo: LX.Music.MusicInfo; listId?: string; isRefresh?: boolean }, string>
  'music:lyric': IpcRequest<{ musicInfo: LX.Music.MusicInfo; isRefresh?: boolean }, LX.Player.LyricInfo>
  'player:play': IpcRequest<LX.Player.PlayMusicInfo, void>
  'player:pause': IpcRequest<void, void>
  'player:stop': IpcRequest<void, void>
  'player:next': IpcRequest<boolean, void>
  'player:prev': IpcRequest<boolean, void>
  'download:add': IpcRequest<LX.Download.AddParams, LX.Download.ListItem>
  'download:remove': IpcRequest<string, void>
  'download:clear': IpcRequest<void, void>
  'list:create': IpcRequest<{ name: string; type: LX.ListType }, LX.List.ListInfo>
  'list:delete': IpcRequest<string, void>
  'list:update': IpcRequest<LX.List.ListInfo, void>
  'list:get': IpcRequest<string, LX.List.ListInfo>
  'list:getAll': IpcRequest<void, LX.List.ListInfo[]>
  'lyric:parse': IpcRequest<string, LX.Music.LyricInfo>
  'lyric:save': IpcRequest<LX.Music.MusicInfo, void>
  'userApi:init': IpcRequest<string, boolean>
  'userApi:list': IpcRequest<void, LX.UserApi.ApiInfo[]>
  'userApi:request': IpcRequest<LX.UserApi.RequestData, LX.UserApi.ResponseData>
  'dialog:show': IpcRequest<LX.Dialog.Options, LX.Dialog.Result>
  'window:minimize': IpcRequest<void, void>
  'window:maximize': IpcRequest<void, void>
  'window:close': IpcRequest<void, void>
  'app:quit': IpcRequest<void, void>
  'app:restart': IpcRequest<void, void>
}

export type IpcChannel = keyof IpcApi
export type IpcPayload<C extends IpcChannel> = IpcApi[C]['payload']
export type IpcResponse<C extends IpcChannel> = IpcApi[C]['response']

export interface IpcRendererApi {
  invoke<C extends IpcChannel>(channel: C, payload: IpcPayload<C>): Promise<IpcResponse<C>>
  on<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): () => void
  once<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): () => void
  off<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): void
  send<C extends IpcChannel>(channel: C, payload: IpcPayload<C>): void
}

export interface IpcMainApi {
  handle<C extends IpcChannel>(channel: C, handler: (payload: IpcPayload<C>) => Promise<IpcResponse<C>>): void
  on<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): () => void
  once<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): () => void
  off<C extends IpcChannel>(channel: C, listener: (payload: IpcPayload<C>) => void): void
  send<C extends IpcChannel>(channel: C, payload: IpcPayload<C>): void
  broadcast<C extends IpcChannel>(channel: C, payload: IpcPayload<C>): void
}

const createIpcClient = <T extends IpcApi>(ipc: IpcRendererApi) => {
  const invoke = <C extends keyof T>(channel: C, payload: T[C]['payload']): Promise<T[C]['response']> => {
    return ipc.invoke(channel as string, payload)
  }

  const on = <C extends keyof T>(channel: C, listener: (payload: T[C]['payload']) => void) => {
    return ipc.on(channel as string, listener)
  }

  const once = <C extends keyof T>(channel: C, listener: (payload: T[C]['payload']) => void) => {
    return ipc.once(channel as string, listener)
  }

  const off = <C extends keyof T>(channel: C, listener: (payload: T[C]['payload']) => void) => {
    ipc.off(channel as string, listener)
  }

  const send = <C extends keyof T>(channel: C, payload: T[C]['payload']) => {
    ipc.send(channel as string, payload)
  }

  return { invoke, on, once, off, send }
}

export { createIpcClient }

export const ipcChannels = {
  setting: {
    get: 'setting:get' as const,
    set: 'setting:set' as const,
  },
  music: {
    url: 'music:url' as const,
    pic: 'music:pic' as const,
    lyric: 'music:lyric' as const,
  },
  player: {
    play: 'player:play' as const,
    pause: 'player:pause' as const,
    stop: 'player:stop' as const,
    next: 'player:next' as const,
    prev: 'player:prev' as const,
  },
  download: {
    add: 'download:add' as const,
    remove: 'download:remove' as const,
    clear: 'download:clear' as const,
  },
  list: {
    create: 'list:create' as const,
    delete: 'list:delete' as const,
    update: 'list:update' as const,
    get: 'list:get' as const,
    getAll: 'list:getAll' as const,
  },
  lyric: {
    parse: 'lyric:parse' as const,
    save: 'lyric:save' as const,
  },
  userApi: {
    init: 'userApi:init' as const,
    list: 'userApi:list' as const,
    request: 'userApi:request' as const,
  },
  dialog: {
    show: 'dialog:show' as const,
  },
  window: {
    minimize: 'window:minimize' as const,
    maximize: 'window:maximize' as const,
    close: 'window:close' as const,
  },
  app: {
    quit: 'app:quit' as const,
    restart: 'app:restart' as const,
  },
} as const

export type IpcChannels = typeof ipcChannels