interface HTMLAudioElementChrome extends HTMLAudioElement {
  setSinkId: (id: string) => Promise<void>
}
let audio: HTMLAudioElementChrome | null = null
let audioContext: AudioContext
let mediaSource: MediaElementAudioSourceNode
let analyser: AnalyserNode
// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext
// https://benzleung.gitbooks.io/web-audio-api-mini-guide/content/chapter5-1.html
export const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
type Freqs = (typeof freqs)[number]
let biquads: Map<`hz${Freqs}`, BiquadFilterNode>
export const freqsPreset = [
  { name: 'pop', hz31: 6, hz62: 5, hz125: -3, hz250: -2, hz500: 5, hz1000: 4, hz2000: -4, hz4000: -3, hz8000: 6, hz16000: 4 },
  { name: 'dance', hz31: 4, hz62: 3, hz125: -4, hz250: -6, hz500: 0, hz1000: 0, hz2000: 3, hz4000: 4, hz8000: 4, hz16000: 5 },
  { name: 'rock', hz31: 7, hz62: 6, hz125: 2, hz250: 1, hz500: -3, hz1000: -4, hz2000: 2, hz4000: 1, hz8000: 4, hz16000: 5 },
  { name: 'classical', hz31: 6, hz62: 7, hz125: 1, hz250: 2, hz500: -1, hz1000: 1, hz2000: -4, hz4000: -6, hz8000: -7, hz16000: -8 },
  { name: 'vocal', hz31: -5, hz62: -6, hz125: -4, hz250: -3, hz500: 3, hz1000: 4, hz2000: 5, hz4000: 4, hz8000: -3, hz16000: -3 },
  { name: 'slow', hz31: 5, hz62: 4, hz125: 2, hz250: 0, hz500: -2, hz1000: 0, hz2000: 3, hz4000: 6, hz8000: 7, hz16000: 8 },
  { name: 'electronic', hz31: 6, hz62: 5, hz125: 0, hz250: -5, hz500: -4, hz1000: 0, hz2000: 6, hz4000: 8, hz8000: 8, hz16000: 7 },
  { name: 'subwoofer', hz31: 8, hz62: 7, hz125: 5, hz250: 4, hz500: 0, hz1000: 0, hz2000: 0, hz4000: 0, hz8000: 0, hz16000: 0 },
  { name: 'soft', hz31: -5, hz62: -5, hz125: -4, hz250: -4, hz500: 3, hz1000: 2, hz2000: 4, hz4000: 4, hz8000: 0, hz16000: 0 },
  // 银河音效补充预设
  { name: 'blues', hz31: 4, hz62: 3, hz125: 1, hz250: 0, hz500: -2, hz1000: -1, hz2000: 2, hz4000: 3, hz8000: 4, hz16000: 3 },
  { name: 'jazz', hz31: 5, hz62: 4, hz125: 2, hz250: 0, hz500: -2, hz1000: -1, hz2000: 1, hz4000: 3, hz8000: 4, hz16000: 4 },
  { name: 'country', hz31: 4, hz62: 3, hz125: 2, hz250: 0, hz500: -1, hz1000: 0, hz2000: 2, hz4000: 2, hz8000: 3, hz16000: 3 },
] as const
export const convolutions = [
  { name: 'telephone', mainGain: 0.0, sendGain: 3.0, source: 'filter-telephone.wav' }, // 电话
  { name: 's2_r4_bd', mainGain: 1.8, sendGain: 0.9, source: 's2_r4_bd.wav' }, // 教堂
  { name: 'bright_hall', mainGain: 0.8, sendGain: 2.4, source: 'bright-hall.wav' },
  { name: 'cinema_diningroom', mainGain: 0.6, sendGain: 2.3, source: 'cinema-diningroom.wav' },
  { name: 'dining_living_true_stereo', mainGain: 0.6, sendGain: 1.8, source: 'dining-living-true-stereo.wav' },
  { name: 'living_bedroom_leveled', mainGain: 0.6, sendGain: 2.1, source: 'living-bedroom-leveled.wav' },
  { name: 'spreader50_65ms', mainGain: 1, sendGain: 2.5, source: 'spreader50-65ms.wav' },
  // { name: 'spreader25_125ms', mainGain: 1, sendGain: 2.5, source: 'spreader25-125ms.wav' },
  // { name: 'backslap', mainGain: 1.8, sendGain: 0.8, source: 'backslap1.wav' },
  { name: 's3_r1_bd', mainGain: 1.8, sendGain: 0.8, source: 's3_r1_bd.wav' },
  { name: 'matrix_1', mainGain: 1.5, sendGain: 0.9, source: 'matrix-reverb1.wav' },
  { name: 'matrix_2', mainGain: 1.3, sendGain: 1, source: 'matrix-reverb2.wav' },
  { name: 'cardiod_35_10_spread', mainGain: 1.8, sendGain: 0.6, source: 'cardiod-35-10-spread.wav' },
  { name: 'tim_omni_35_10_magnetic', mainGain: 1, sendGain: 0.2, source: 'tim-omni-35-10-magnetic.wav' },
  // { name: 'spatialized', mainGain: 1.8, sendGain: 0.8, source: 'spatialized8.wav' },
  // { name: 'zing_long_stereo', mainGain: 0.8, sendGain: 1.8, source: 'zing-long-stereo.wav' },
  { name: 'feedback_spring', mainGain: 1.8, sendGain: 0.8, source: 'feedback-spring.wav' },
  // { name: 'tim_omni_rear_blend', mainGain: 1.8, sendGain: 0.8, source: 'tim-omni-rear-blend.wav' },
] as const
// 半音
// export const semitones = [-1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] as const

let convolver: ConvolverNode
let convolverSourceGainNode: GainNode
let convolverOutputGainNode: GainNode
let convolverDynamicsCompressor: DynamicsCompressorNode
let gainNode: GainNode
let panner: PannerNode
let bassShelf: BiquadFilterNode        // 超重低音（lowshelf 120Hz）
let hiFiShelf: BiquadFilterNode        // 高保真度（highshelf 7.5kHz）
let stereoBalance: StereoPannerNode    // 声道平衡
let pitchShifterNode: AudioWorkletNode
let pitchShifterNodePitchFactor: AudioParam
let pitchShifterNodeLoadStatus: 'none' | 'loading' | 'unconnect' | 'connected' = 'none'
let pitchShifterNodeTempValue = 1
let defaultChannelCount = 2
export const soundR = 0.5


export const createAudio = () => {
  if (audio) return
  audio = new window.Audio() as HTMLAudioElementChrome
  audio.controls = false
  audio.autoplay = true
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'

  // https://developer.chrome.com/blog/autoplay
  audio.addEventListener('playing', () => {
    if (audioContext?.state == 'suspended') {
      void audioContext.resume().catch((err) => {
        console.error('Resume audio context failed:', err)
        throw err
      })
    }
  })
}

const initAnalyser = () => {
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
}

const initBiquadFilter = () => {
  biquads = new Map()
  let i

  for (const item of freqs) {
    const filter = audioContext.createBiquadFilter()
    biquads.set(`hz${item}`, filter)
    filter.type = 'peaking'
    filter.frequency.value = item
    filter.Q.value = 1.4
    filter.gain.value = 0
  }

  for (i = 1; i < freqs.length; i++) {
    (biquads.get(`hz${freqs[i - 1]}`)!).connect(biquads.get(`hz${freqs[i]}`)!)
  }
}

const initConvolver = () => {
  convolverSourceGainNode = audioContext.createGain()
  convolverOutputGainNode = audioContext.createGain()
  convolverDynamicsCompressor = audioContext.createDynamicsCompressor()
  convolver = audioContext.createConvolver()
  convolver.connect(convolverOutputGainNode)
  convolverSourceGainNode.connect(convolverDynamicsCompressor)
  convolverOutputGainNode.connect(convolverDynamicsCompressor)
}

const initPanner = () => {
  panner = audioContext.createPanner()
}

const initEnhanceNodes = () => {
  bassShelf = audioContext.createBiquadFilter()
  bassShelf.type = 'lowshelf'
  bassShelf.frequency.value = 120
  bassShelf.gain.value = 0

  hiFiShelf = audioContext.createBiquadFilter()
  hiFiShelf.type = 'highshelf'
  hiFiShelf.frequency.value = 7500
  hiFiShelf.gain.value = 0

  stereoBalance = audioContext.createStereoPanner()
  stereoBalance.pan.value = 0
}

const initGain = () => {
  gainNode = audioContext.createGain()
}

const initAdvancedAudioFeatures = () => {
  if (audioContext) return
  if (!audio) throw new Error('audio not defined')
  audioContext = new window.AudioContext({ latencyHint: 'playback' })
  defaultChannelCount = audioContext.destination.channelCount

  initAnalyser()
  initBiquadFilter()
  initConvolver()
  initPanner()
  initEnhanceNodes()
  initGain()
  // source -> analyser -> biquadFilter -> bassShelf -> hiFiShelf -> pitchShifter -> [(convolver & convolverSource)->convolverDynamicsCompressor] -> panner -> stereoBalance -> gain
  mediaSource = audioContext.createMediaElementSource(audio)
  mediaSource.connect(analyser)
  analyser.connect(biquads.get(`hz${freqs[0]}`)!)
  const lastBiquadFilter = (biquads.get(`hz${freqs.at(-1)!}`)!)
  lastBiquadFilter.connect(bassShelf)
  bassShelf.connect(hiFiShelf)
  hiFiShelf.connect(convolverSourceGainNode)
  hiFiShelf.connect(convolver)
  convolverDynamicsCompressor.connect(panner)
  panner.connect(stereoBalance)
  stereoBalance.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // 音频输出设备改变时刷新 audio node 连接
  window.app_event.on('playerDeviceChanged', handleMediaListChange)

  // audio.addEventListener('playing', connectAudioNode)
  // audio.addEventListener('pause', disconnectAudioNode)
  // audio.addEventListener('waiting', disconnectAudioNode)
  // audio.addEventListener('emptied', disconnectAudioNode)
  // if (!audio.paused) connectAudioNode()
}

const handleMediaListChange = () => {
  mediaSource.disconnect()
  mediaSource.connect(analyser)
}

// let isConnected = true
// const connectAudioNode = () => {
//   if (isConnected) return
//   console.log('connect Node')
//   mediaSource.connect(analyser)
//   isConnected = true
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

// const disconnectAudioNode = () => {
//   if (!isConnected) return
//   console.log('disconnect Node')
//   mediaSource.disconnect()
//   isConnected = false
//   if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
//     disconnectPitchShifterNode()
//   }
// }

export const getAudioContext = () => {
  initAdvancedAudioFeatures()
  return audioContext
}

let unsubMediaListChangeEvent: (() => void) | null = null
export const setMaxOutputChannelCount = (enable: boolean) => {
  if (enable) {
    initAdvancedAudioFeatures()
    audioContext.destination.channelCountMode = 'max'
    audioContext.destination.channelCount = audioContext.destination.maxChannelCount
    // navigator.mediaDevices.addEventListener('devicechange', handleMediaListChange)
    if (!unsubMediaListChangeEvent) {
      let handleMediaListChange = () => {
        setMaxOutputChannelCount(true)
      }
      window.app_event.on('playerDeviceChanged', handleMediaListChange)
      unsubMediaListChangeEvent = () => {
        window.app_event.off('playerDeviceChanged', handleMediaListChange)
        unsubMediaListChangeEvent = null
      }
    }
  } else {
    unsubMediaListChangeEvent?.()
    if (audioContext && audioContext.destination.channelCountMode != 'explicit') {
      audioContext.destination.channelCount = defaultChannelCount
      // audioContext.destination.channelInterpretation
      audioContext.destination.channelCountMode = 'explicit'
    }
  }
}

export const getAnalyser = (): AnalyserNode | null => {
  initAdvancedAudioFeatures()
  return analyser
}

export const getBiquadFilter = () => {
  initAdvancedAudioFeatures()
  return biquads
}

// let isConvolverConnected = false
export const setConvolver = (buffer: AudioBuffer | null, mainGain: number, sendGain: number) => {
  initAdvancedAudioFeatures()
  convolver.buffer = buffer
  // console.log(mainGain, sendGain)
  if (buffer) {
    convolverSourceGainNode.gain.value = mainGain
    convolverOutputGainNode.gain.value = sendGain
  } else {
    convolverSourceGainNode.gain.value = 1
    convolverOutputGainNode.gain.value = 0
  }
}

export const setConvolverMainGain = (gain: number) => {
  if (convolverSourceGainNode.gain.value == gain) return
  // console.log(gain)
  convolverSourceGainNode.gain.value = gain
}

export const setConvolverSendGain = (gain: number) => {
  if (convolverOutputGainNode.gain.value == gain) return
  // console.log(gain)
  convolverOutputGainNode.gain.value = gain
}

let pannerInfo = {
  x: 0,
  y: 0,
  z: 0,
  soundR: 0.5,
  rad: 0,
  speed: 1,
  intv: null as NodeJS.Timeout | null,
}
const setPannerXYZ = (nx: number, ny: number, nz: number) => {
  pannerInfo.x = nx
  pannerInfo.y = ny
  pannerInfo.z = nz
  // console.log(pannerInfo)
  panner.positionX.value = nx * pannerInfo.soundR
  panner.positionY.value = ny * pannerInfo.soundR
  panner.positionZ.value = nz * pannerInfo.soundR
}
export const setPannerSoundR = (r: number) => {
  pannerInfo.soundR = r
}

export const setPannerSpeed = (speed: number) => {
  pannerInfo.speed = speed
  if (pannerInfo.intv) startPanner()
}
export const stopPanner = () => {
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  panner.positionX.value = 0
  panner.positionY.value = 0
  panner.positionZ.value = 0
}

export const startPanner = () => {
  initAdvancedAudioFeatures()
  if (pannerInfo.intv) {
    clearInterval(pannerInfo.intv)
    pannerInfo.intv = null
    pannerInfo.rad = 0
  }
  pannerInfo.intv = setInterval(() => {
    pannerInfo.rad += 1
    if (pannerInfo.rad > 360) pannerInfo.rad -= 360
    setPannerXYZ(Math.sin(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180), Math.cos(pannerInfo.rad * Math.PI / 180))
  }, pannerInfo.speed * 10)
}

let isConnected = true
const connectNode = () => {
  if (isConnected) return
  console.log('connect Node')
  analyser?.connect(biquads.get(`hz${freqs[0]}`)!)
  isConnected = true
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const disconnectNode = () => {
  if (!isConnected) return
  console.log('disconnect Node')
  analyser?.disconnect()
  isConnected = false
  if (pitchShifterNodeTempValue == 1 && pitchShifterNodeLoadStatus == 'connected') {
    disconnectPitchShifterNode()
  }
}
const connectPitchShifterNode = () => {
  console.log('connect Pitch Shifter Node')
  audio!.addEventListener('playing', connectNode)
  audio!.addEventListener('pause', disconnectNode)
  audio!.addEventListener('waiting', disconnectNode)
  audio!.addEventListener('emptied', disconnectNode)
  if (audio!.paused) disconnectNode()

  hiFiShelf.disconnect()
  hiFiShelf.connect(pitchShifterNode)

  pitchShifterNode.connect(convolver)
  pitchShifterNode.connect(convolverSourceGainNode)
  pitchShifterNodeLoadStatus = 'connected'
  pitchShifterNodePitchFactor.value = pitchShifterNodeTempValue
}
const disconnectPitchShifterNode = () => {
  console.log('disconnect Pitch Shifter Node')
  hiFiShelf.disconnect()
  hiFiShelf.connect(convolver)
  hiFiShelf.connect(convolverSourceGainNode)
  pitchShifterNodeLoadStatus = 'unconnect'

  audio!.removeEventListener('playing', connectNode)
  audio!.removeEventListener('pause', disconnectNode)
  audio!.removeEventListener('waiting', disconnectNode)
  audio!.removeEventListener('emptied', disconnectNode)
  connectNode()
}
const loadPitchShifterNode = () => {
  pitchShifterNodeLoadStatus = 'loading'
  initAdvancedAudioFeatures()
  // source -> analyser -> biquadFilter -> audioWorklet(pitch shifter) -> [(convolver & convolverSource)->convolverDynamicsCompressor] -> panner -> gain
  void audioContext.audioWorklet.addModule(new URL(
    /* webpackChunkName: 'pitch_shifter.audioWorklet' */
    './pitch-shifter/phase-vocoder.js',
    import.meta.url,
  )).then(() => {
    console.log('pitch shifter audio worklet loaded')
    // https://github.com/olvb/phaze/issues/26#issuecomment-1574629971
    pitchShifterNode = new AudioWorkletNode(audioContext, 'phase-vocoder-processor', { outputChannelCount: [2] })
    let pitchFactorParam = pitchShifterNode.parameters.get('pitchFactor')
    if (!pitchFactorParam) return
    pitchShifterNodePitchFactor = pitchFactorParam
    pitchShifterNodeLoadStatus = 'unconnect'
    if (pitchShifterNodeTempValue == 1) return

    connectPitchShifterNode()
  })
}

export const setPitchShifter = (val: number) => {
  // console.log('setPitchShifter', val)
  pitchShifterNodeTempValue = val
  switch (pitchShifterNodeLoadStatus) {
    case 'loading':
      break
    case 'none':
      loadPitchShifterNode()
      break
    case 'connected':
      // a: 1 = 半音
      // value = 2 ** (a / 12)
      pitchShifterNodePitchFactor.value = val
      break
    case 'unconnect':
      connectPitchShifterNode()
      break
  }
}

export const hasInitedAdvancedAudioFeatures = (): boolean => audioContext != null

// ===== 银河音效扩展：增强滑条 / 声道平衡 / 动态推进 / DJ 节奏音效 =====

/** 超重低音：lowshelf 增益（dB，0~15） */
export const setBassBoost = (db: number) => {
  initAdvancedAudioFeatures()
  bassShelf.gain.value = db
}

/** 高保真度：highshelf 提亮（dB，0~12） */
export const setHiFiBoost = (db: number) => {
  initAdvancedAudioFeatures()
  hiFiShelf.gain.value = db
}

/** 声道平衡：-1（全左）~ 1（全右） */
export const setStereoBalance = (pan: number) => {
  initAdvancedAudioFeatures()
  stereoBalance.pan.value = Math.min(1, Math.max(-1, pan))
}

/** 动态推进：0~1，映射压限器 threshold；0 时保持保守限幅防止多效果叠加削波 */
export const setDynamicBoost = (amount: number) => {
  initAdvancedAudioFeatures()
  const a = Math.min(1, Math.max(0, amount))
  if (a <= 0) {
    // 保守限幅（非直通）：多段 EQ/混响叠加时兜底防削波
    convolverDynamicsCompressor.threshold.value = -10
    convolverDynamicsCompressor.ratio.value = 3
    return
  }
  convolverDynamicsCompressor.threshold.value = -10 - a * 26
  convolverDynamicsCompressor.ratio.value = 3 + a * 5
}

let djNoiseBuffer: AudioBuffer | null = null
const getDjNoise = () => {
  if (djNoiseBuffer) return djNoiseBuffer
  const ctx = getAudioContext()
  const len = Math.floor(ctx.sampleRate * 0.4)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  djNoiseBuffer = buffer
  return buffer
}

/** DJ 节奏音效：WebAudio 合成，直接叠加到主输出（不影响音乐播放） */
export const playDjEffect = (type: 'clap' | 'twist' | 'jump' | 'shake' | 'leg' | 'knock') => {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const out = ctx.createGain()
  out.gain.value = 0.9
  out.connect(gainNode)

  const osc = (wave: OscillatorType, freq: number, endFreq: number, dur: number, delay = 0, peak = 0.8) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.setValueAtTime(freq, now + delay)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + delay + dur)
    g.gain.setValueAtTime(0, now + delay)
    g.gain.linearRampToValueAtTime(peak, now + delay + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)
    o.connect(g)
    g.connect(out)
    o.start(now + delay)
    o.stop(now + delay + dur + 0.05)
  }
  const noise = (dur: number, delay: number, peak: number, hp: number) => {
    const src = ctx.createBufferSource()
    src.buffer = getDjNoise()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = hp
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, now + delay)
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(out)
    src.start(now + delay)
    src.stop(now + delay + dur + 0.05)
  }

  switch (type) {
    case 'clap': // 拍手：三连噪声脉冲
      noise(0.08, 0, 0.7, 1500)
      noise(0.08, 0.1, 0.6, 1500)
      noise(0.16, 0.2, 0.8, 1200)
      break
    case 'twist': // 扭腰：下扫频
      osc('sawtooth', 900, 120, 0.3, 0, 0.5)
      osc('sawtooth', 900, 120, 0.3, 0.15, 0.4)
      break
    case 'jump': // 蹦跳：上扫频
      osc('square', 200, 900, 0.22, 0, 0.4)
      osc('square', 240, 1100, 0.22, 0.12, 0.35)
      break
    case 'shake': // 摇头：抖动噪声
      for (let i = 0; i < 6; i++) noise(0.05, i * 0.07, 0.4, 4000)
      break
    case 'leg': // 抖腿：快速双低频
      osc('sine', 140, 60, 0.12, 0, 0.9)
      osc('sine', 140, 60, 0.12, 0.16, 0.9)
      osc('sine', 140, 60, 0.12, 0.32, 0.9)
      break
    case 'knock': // 敲桌：木质低频脉冲
      osc('sine', 220, 70, 0.1, 0, 1)
      noise(0.03, 0, 0.3, 800)
      break
  }
}

export const setResource = (src: string) => {
  if (audio) audio.src = src
}

export const setPlay = () => {
  void audio?.play()
}

export const setPause = () => {
  audio?.pause()
}

export const setStop = () => {
  if (audio) {
    audio.src = ''
    audio.removeAttribute('src')
  }
}

export const isEmpty = (): boolean => !audio?.src

export const setLoopPlay = (isLoop: boolean) => {
  if (audio) audio.loop = isLoop
}

export const getPlaybackRate = (): number => {
  return audio?.defaultPlaybackRate ?? 1
}

export const setPlaybackRate = (rate: number) => {
  if (!audio) return
  audio.defaultPlaybackRate = rate
  audio.playbackRate = rate
}

export const setPreservesPitch = (preservesPitch: boolean) => {
  if (!audio) return
  audio.preservesPitch = preservesPitch
}

export const getMute = (): boolean => {
  return audio?.muted ?? false
}

export const setMute = (isMute: boolean) => {
  if (audio) audio.muted = isMute
}

export const getCurrentTime = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.currentTime || 0
}

export const setCurrentTime = (time: number) => {
  if (audio) audio.currentTime = time
}

export const setMediaDeviceId = async(mediaDeviceId: string): Promise<void> => {
  if (!audio) return
  return audio.setSinkId(mediaDeviceId)
}

export const setVolume = (volume: number) => {
  if (audio) audio.volume = volume
}

export const getDuration = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return audio?.duration || 0
}

// export const getPlaybackRate = () => {
//   return audio?.playbackRate ?? 1
// }

type Noop = () => void

export const onPlaying = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('playing', callback)
  return () => {
    audio?.removeEventListener('playing', callback)
  }
}

export const onPause = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio?.addEventListener('pause', callback)
  return () => {
    audio?.removeEventListener('pause', callback)
  }
}

export const onEnded = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('ended', callback)
  return () => {
    audio?.removeEventListener('ended', callback)
  }
}

export const onError = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('error', callback)
  return () => {
    audio?.removeEventListener('error', callback)
  }
}

export const onLoadeddata = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadeddata', callback)
  return () => {
    audio?.removeEventListener('loadeddata', callback)
  }
}

export const onLoadstart = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('loadstart', callback)
  return () => {
    audio?.removeEventListener('loadstart', callback)
  }
}

export const onCanplay = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('canplay', callback)
  return () => {
    audio?.removeEventListener('canplay', callback)
  }
}

export const onEmptied = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('emptied', callback)
  return () => {
    audio?.removeEventListener('emptied', callback)
  }
}

export const onTimeupdate = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('timeupdate', callback)
  return () => {
    audio?.removeEventListener('timeupdate', callback)
  }
}

// 缓冲中
export const onWaiting = (callback: Noop) => {
  if (!audio) throw new Error('audio not defined')

  audio.addEventListener('waiting', callback)
  return () => {
    audio?.removeEventListener('waiting', callback)
  }
}

// 可见性改变
export const onVisibilityChange = (callback: Noop) => {
  document.addEventListener('visibilitychange', callback)
  return () => {
    document.removeEventListener('visibilitychange', callback)
  }
}


export const getErrorCode = () => {
  return audio?.error?.code
}
