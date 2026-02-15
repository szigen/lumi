import type { BrowserWindowConstructorOptions } from 'electron'
import { isMac, isWin } from './index'

export function getWindowConfig(): Partial<BrowserWindowConstructorOptions> {
  if (isMac) {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 19 }
    }
  }

  if (isWin) {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#12121f',
        symbolColor: '#8a8aa3',
        height: 52
      }
    }
  }

  // Linux: overlay olmadan hidden frame (titleBarOverlay Wayland/tiling WM'lerde unstable)
  return {
    titleBarStyle: 'hidden'
  }
}
