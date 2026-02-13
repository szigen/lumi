import type { BrowserWindowConstructorOptions } from 'electron'
import { isMac } from './index'

export function getWindowConfig(): Partial<BrowserWindowConstructorOptions> {
  if (isMac) {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 19 }
    }
  }

  // Windows and Linux: hide native frame, show overlay window controls
  return {
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#12121f',
      symbolColor: '#8a8aa3',
      height: 52
    }
  }
}
