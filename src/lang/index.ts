import zh_cn from './zh-cn.json'
import zh_tw from './zh-tw.json'
import en_us from './en-us.json'

// 宽松类型：允许各语言文件键不完全同步（缺失键由 getMessage 回退到 zh-cn），避免每加一个文案都要三语言同时更新
type Message = Record<string, string>

type Messages = Record<(typeof langs)[number]['locale'], Message>

const langs = [
  {
    name: '简体中文',
    locale: 'zh-cn',
    // alternate: 'zh-hans',
    country: 'cn',
    fallback: true,
    message: zh_cn,
  },
  {
    name: '繁體中文',
    locale: 'zh-tw',
    // alternate: 'zh-hk',
    country: 'cn',
    message: zh_tw,
  },
  {
    name: 'English',
    locale: 'en-us',
    country: 'us',
    message: en_us,
  },
] as const

const langList: Array<{
  name: string
  locale: keyof Messages
  alternate?: string
}> = []
// @ts-expect-error
const messages: Messages = {}
langs.forEach(item => {
  langList.push({
    name: item.name,
    locale: item.locale,
    // alternate: item.alternate,
  })
  messages[item.locale] = item.message
})

export {
  langList,
  messages,
}

export type {
  Messages,
  Message,
}

export * from './i18n'
