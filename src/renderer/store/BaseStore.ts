import { reactive, shallowReactive, computed, ComputedRef, watch } from '@common/utils/vueTools'

export type StoreState<T> = T extends Record<string, any> ? T : never

export interface StoreOptions<T extends Record<string, any>> {
  initialState: T
  useShallow?: boolean
  persistKeys?: (keyof T)[]
  onStateChange?: (key: keyof T, value: any, oldValue: any) => void
}

export interface BaseStore<T extends Record<string, any>> {
  state: T
  patch(partial: Partial<T>): void
  reset(): void
  toJSON(): T
  subscribe(listener: (key: keyof T, value: any, oldValue: any) => void): () => void
  computed<K extends keyof T>(key: K): ComputedRef<T[K]>
  watch<K extends keyof T>(key: K, callback: (value: T[K], oldValue: T[K]) => void): () => void
}

function createBaseStore<T extends Record<string, any>>(options: StoreOptions<T>): BaseStore<T> {
  const { initialState, useShallow = false, persistKeys = [], onStateChange } = options

  const state = useShallow ? shallowReactive(initialState) : reactive({ ...initialState })
  const listeners = new Set<(key: keyof T, value: any, oldValue: any) => void>()

  const proxiedState = new Proxy(state, {
    set(target, key, value) {
      const oldValue = target[key as string]
      if (oldValue !== value) {
        target[key as string] = value
        listeners.forEach(listener => listener(key as keyof T, value, oldValue))
        onStateChange?.(key as keyof T, value, oldValue)
      }
      return true
    },
  }) as T

  const patch = (partial: Partial<T>) => {
    const keys = Object.keys(partial)
    if (keys.some(k => k.includes('soundEffect'))) {
      // eslint-disable-next-line no-console
      console.log('[patch-debug]', keys.join(','), new Error('trace').stack)
    }
    for (const [key, value] of Object.entries(partial)) {
      proxiedState[key as keyof T] = value
    }
  }

  const reset = () => {
    for (const key of Object.keys(state) as (keyof T)[]) {
      proxiedState[key] = initialState[key]
    }
  }

  const toJSON = () => {
    const result = {} as T
    for (const key of Object.keys(state) as (keyof T)[]) {
      result[key] = (state as T)[key]
    }
    return result
  }

  const subscribe = (listener: (key: keyof T, value: any, oldValue: any) => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const computedRef = <K extends keyof T>(key: K): ComputedRef<T[K]> => {
    return computed(() => (state as T)[key])
  }

  const watchRef = <K extends keyof T>(key: K, callback: (value: T[K], oldValue: T[K]) => void): () => void => {
    let oldValue = (state as T)[key]
    const stop = watch(() => (state as T)[key], (newValue) => {
      callback(newValue as T[K], oldValue)
      oldValue = newValue as T[K]
    })
    return stop
  }

  return {
    state: proxiedState,
    patch,
    reset,
    toJSON,
    subscribe,
    computed: computedRef,
    watch: watchRef,
  }
}

export { createBaseStore }