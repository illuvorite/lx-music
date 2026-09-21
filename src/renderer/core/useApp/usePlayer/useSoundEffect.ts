import { watch } from '@common/utils/vueTools'
import {
  freqs,
  getAudioContext,
  setConvolver,
  setPannerSoundR,
  setPannerSpeed,
  startPanner,
  stopPanner,
  setConvolverMainGain,
  setConvolverSendGain,
  setPitchShifter,
  setBassBoost,
  setHiFiBoost,
  setStereoBalance,
  setDynamicBoost,
  setEqGain,
  setEqBoostDb,
} from '@renderer/plugins/player'

import { appSetting } from '@renderer/store/setting'

const cache = new Map<string, AudioBuffer>()
const loadBuffer = async(name: string) => new Promise<AudioBuffer>((resolve, reject) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('@renderer/assets/medias/filters/' + name) as string
  if (cache.has(path)) {
    resolve(cache.get(path)!)
    return
  }
  // Load buffer asynchronously
  let request = new XMLHttpRequest()
  request.open('GET', path, true)
  request.responseType = 'arraybuffer'

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    void getAudioContext().decodeAudioData(request.response, (buffer) => {
      if (!buffer) {
        reject(new Error('error decoding file data: ' + path))
        return
      }
      cache.set(path, buffer)
      resolve(buffer)
    },
    function(error) {
      reject(error)
      console.error('decodeAudioData error', error)
    })
  }

  request.onerror = function() {
    reject(new Error('XHR error'))
  }

  request.send()
})

export default () => {
  // console.log(appSetting['player.soundEffect.panner.enable'])
  if (appSetting['player.soundEffect.panner.enable']) startPanner()
  setPannerSoundR(appSetting['player.soundEffect.panner.soundR'] / 10)
  setPannerSpeed(2 * (appSetting['player.soundEffect.panner.speed'] / 10))
  if (freqs.some(v => appSetting[`player.soundEffect.biquadFilter.hz${v}`] != 0)) {
    for (const item of freqs) {
      setEqGain(item, appSetting[`player.soundEffect.biquadFilter.hz${item}`])
    }
  }
  // EQ 最大正向提升量 → 驱动自动响度补偿，避免开关 EQ 时整体变响
  setEqBoostDb(Math.max(0, ...freqs.map(v => appSetting[`player.soundEffect.biquadFilter.hz${v}`])))
  if (appSetting['player.soundEffect.convolution.fileName']) {
    const fileName = appSetting['player.soundEffect.convolution.fileName']
    void loadBuffer(fileName).then((buffer) => {
      setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, appSetting['player.soundEffect.convolution.sendGain'] / 10)
    }).catch(err => {
      // 资源缺失/损坏时安全降级为干声，避免混响无声且无提示
      console.error('load reverb IR failed:', fileName, err)
      setConvolver(null, 0, 0)
    })
  }
  if (appSetting['player.soundEffect.pitchShifter.playbackRate'] != 1) {
    setPitchShifter(appSetting['player.soundEffect.pitchShifter.playbackRate'])
  }
  setBassBoost(appSetting['player.soundEffect.enhance.bass'] * 0.3)
  setHiFiBoost(appSetting['player.soundEffect.enhance.hifi'] * 0.24)
  setStereoBalance(appSetting['player.soundEffect.enhance.balance'] / 50)
  setDynamicBoost(appSetting['player.soundEffect.enhance.dynamic'] / 50)


  watch(() => appSetting['player.soundEffect.panner.enable'], (enable) => {
    if (enable) {
      startPanner()
    } else {
      stopPanner()
    }
  })
  watch(() => appSetting['player.soundEffect.panner.soundR'], (soundR) => {
    setPannerSoundR(soundR / 10)
  })
  watch(() => appSetting['player.soundEffect.panner.speed'], (speed) => {
    setPannerSpeed(2 * (speed / 10))
  })
  watch(() => appSetting['player.soundEffect.convolution.fileName'], (fileName) => {
    setTimeout(() => {
      if (!fileName) {
        setConvolver(null, 0, 0)
        return
      }
      void loadBuffer(fileName).then((buffer) => {
        setConvolver(buffer, appSetting['player.soundEffect.convolution.mainGain'] / 10, appSetting['player.soundEffect.convolution.sendGain'] / 10)
      }).catch(err => {
        console.error('load reverb IR failed:', fileName, err)
        setConvolver(null, 0, 0)
      })
    })
  })
  watch(() => appSetting['player.soundEffect.convolution.mainGain'], (mainGain) => {
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverMainGain(mainGain / 10)
  })
  watch(() => appSetting['player.soundEffect.convolution.sendGain'], (sendGain) => {
    if (!appSetting['player.soundEffect.convolution.fileName']) return
    setConvolverSendGain(sendGain / 10)
  })
  // EQ 任一频段变化：平滑写入该频段，并同步刷新自动响度补偿
  for (const item of freqs) {
    watch(() => appSetting[`player.soundEffect.biquadFilter.hz${item}`], (val) => {
      setEqGain(item, val)
      setEqBoostDb(Math.max(0, ...freqs.map(v => appSetting[`player.soundEffect.biquadFilter.hz${v}`])))
    })
  }

  watch(() => appSetting['player.soundEffect.pitchShifter.playbackRate'], (playbackRate) => {
    setPitchShifter(playbackRate)
  })

  watch(() => appSetting['player.soundEffect.enhance.bass'], (v) => {
    setBassBoost(v * 0.3)
  })
  watch(() => appSetting['player.soundEffect.enhance.hifi'], (v) => {
    setHiFiBoost(v * 0.24)
  })
  watch(() => appSetting['player.soundEffect.enhance.balance'], (v) => {
    setStereoBalance(v / 50)
  })
  watch(() => appSetting['player.soundEffect.enhance.dynamic'], (v) => {
    setDynamicBoost(v / 50)
  })


  // window.key_event.on(HOTKEY_PLAYER.volume_up.action, hotkeyVolumeUp)
  // window.key_event.on(HOTKEY_PLAYER.volume_down.action, hotkeyVolumeDown)
  // window.app_event.on('setPlaybackRate', handleSetPlaybackRate)

  // onBeforeUnmount(() => {
  //   // window.key_event.off(HOTKEY_PLAYER.volume_up.action, hotkeyVolumeUp)
  //   // window.key_event.off(HOTKEY_PLAYER.volume_down.action, hotkeyVolumeDown)
  //   window.app_event.off('setPlaybackRate', handleSetPlaybackRate)
  // })
}
