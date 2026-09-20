const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let mockElectron = null

if (isDev) {
  mockElectron = {
    app: {
      getPath: (name) => {
        if (name === 'exe') return process.execPath
        if (name === 'userData') return path.join(process.cwd(), 'userData')
        if (name === 'appData') return path.join(process.cwd(), 'appData')
        if (name === 'temp') return path.join(process.cwd(), 'temp')
        return process.cwd()
      },
      getAppPath: () => process.cwd(),
      getName: () => 'lx-music',
      getVersion: () => '2.12.2',
      isPackaged: false,
      whenReady: () => Promise.resolve(),
      quit: () => process.exit(0),
      relaunch: () => {},
      on: () => {},
      once: () => {},
      removeListener: () => {},
      setAsDefaultProtocolClient: () => {},
      disableHardwareAcceleration: () => {},
      commandLine: { appendSwitch: () => {} },
    },
    BrowserWindow: class MockBrowserWindow {
      constructor() {}
      show() {}
      hide() {}
      minimize() {}
      maximize() {}
      close() {}
      destroy() {}
      isDestroyed() { return false }
      isMinimized() { return false }
      isMaximized() { return false }
      isFocused() { return false }
      isVisible() { return false }
      getTitle() { return '' }
      setTitle() {}
      getSize() { return [800, 600] }
      setSize() {}
      getPosition() { return [0, 0] }
      setPosition() {}
      setBounds() {}
      getBounds() { return { x: 0, y: 0, width: 800, height: 600 } }
      setAlwaysOnTop() {}
      isAlwaysOnTop() { return false }
      setFullScreenable() {}
      setFullScreen() {}
      isFullScreen() { return false }
      setResizable() {}
      isResizable() { return true }
      setMinimumSize() {}
      setMaximumSize() {}
      center() {}
      focus() {}
      blur() {}
      webContents: any = {
        send: () => {},
        on: () => {},
        once: () => {},
        removeListener: () => {},
        openDevTools: () => {},
        closeDevTools: () => {},
        isDevToolsOpened: () => false,
        loadURL: () => Promise.resolve(),
        loadFile: () => Promise.resolve(),
        executeJavaScript: () => Promise.resolve(''),
        insertCSS: () => Promise.resolve(''),
        removeInsertedCSS: () => Promise.resolve(''),
        setAudioMuted: () => {},
        isAudioMuted: () => false,
        setUserAgent: () => {},
        getUserAgent: () => '',
        getURL: () => 'file:///',
        getTitle: () => '',
        isLoading: () => false,
        isLoadingMainFrame: () => false,
        isWaitingForResponse: () => false,
        stop: () => {},
        reload: () => {},
        reloadIgnoringCache: () => {},
        canGoBack: () => false,
        canGoForward: () => false,
        goBack: () => {},
        goForward: () => {},
        goToIndex: () => {},
        clearHistory: () => {},
        history: { length: 0 },
        undo: () => {},
        redo: () => {},
        cut: () => {},
        copy: () => {},
        paste: () => {},
        selectAll: () => {},
        delete: () => {},
        replace: () => {},
        insertText: () => {},
        print: () => {},
        printToPDF: () => Promise.resolve(Buffer.alloc(0)),
        findInPage: () => {},
        stopFindInPage: () => {},
        isCurrentlyPlayingAudio: () => false,
        setWindowOpenHandler: () => {},
        setDevToolsWebContents: () => {},
        debugger: { isAttached: () => false, attach: () => {}, detach: () => {}, sendCommand: () => {}, sendCommandAndGetReply: () => Promise.resolve({}) },
        session: { webRequest: { onBeforeRequest: () => {}, onBeforeSendHeaders: () => {}, onHeadersReceived: () => {}, onSendHeaders: () => {} }, cookies: { get: () => Promise.resolve(null), set: () => Promise.resolve() }, webStorage: {} },
        mainFrame: { name: '', url: '', displayName: '', processId: 0, osProcessId: 0 },
        focusedFrame: { name: '', url: '', displayName: '', processId: 0, osProcessId: 0 },
        top: { name: '', url: '', displayName: '', processId: 0, osProcessId: 0 },
        frames: [] }
      },
      shell: { openExternal: () => {}, openPath: () => Promise.resolve(''), showItemInFolder: () => {}, trashItem: () => Promise.resolve({}) },
      screen: {
        getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 800, height: 600 }, size: { width: 800, height: 600 } }),
        getAllDisplays: () => [{ workArea: { x: 0, y: 0, width: 800, height: 600 }, size: { width: 800, height: 600 } }],
        getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 800, height: 600 }, size: { width: 800, height: 600 } }),
        getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 800, height: 600 }, size: { width: 800, height: 600 } }),
      },
      nativeTheme: {
        shouldUseDarkColors: false,
        addListener: () => {},
        removeListener: () => {},
        on: () => {},
        once: () => {},
        removeAllListeners: () => {},
      },
      dialog: {
        showMessageBox: () => Promise.resolve({ response: 0, checkboxChecked: false }),
        showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
        showSaveDialog: () => Promise.resolve({ canceled: true, filePath: '' }),
        showErrorBox: () => {},
        showCertificateTrustDialog: () => Promise.resolve({}),
      },
      ipcMain: { on: () => {}, once: () => {}, removeListener: () => {}, send: () => {}, handle: () => {}, handleOnce: () => {} },
      clipboard: { writeText: () => {}, readText: () => '', clear: () => {}, has: () => false },
      powerMonitor: { on: () => {}, once: () => {}, removeListener: () => {} },
      powerSaveBlocker: { start: () => 0, stop: () => false },
      net: { fetch: () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(''), json: () => Promise.resolve({}) }) },
      session: {
        defaultSession: {
          webRequest: { onBeforeRequest: () => {}, onBeforeSendHeaders: () => {}, onHeadersReceived: () => {}, onSendHeaders: () => {} },
          cookies: { get: () => Promise.resolve(null), set: () => Promise.resolve() },
          webStorage: {},
          clearStorageData: () => Promise.resolve(),
          clearCache: () => Promise.resolve(),
        },
      },
      protocol: {
        registerSchemesAsPrivileged: () => {},
        registerFileProtocol: () => {},
        registerBufferProtocol: () => {},
        registerHttpProtocol: () => {},
        registerStreamProtocol: () => {},
      },
    }
  }
}

module.exports = mockElectron
