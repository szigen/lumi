import type { ApiType } from '../../preload/index'

declare global {
  interface Window {
    api: ApiType
  }
}

declare module '*.png' {
  const src: string
  export default src
}

export {}
