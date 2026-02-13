import type { BrowserWindowConstructorOptions } from 'electron'
import { isMac } from './index'

export function getWindowConfig(): Partial<BrowserWindowConstructorOptions> {
  if (isMac) {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 19 }
    }
  }

  // Windows and Linux: use native title bar
  return {}
}
