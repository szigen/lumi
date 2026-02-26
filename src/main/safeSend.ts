import type { BrowserWindow } from 'electron'

/**
 * Safely send an IPC message to a BrowserWindow's renderer.
 *
 * `window.isDestroyed()` can return false while the underlying WebFrameMain
 * is already disposed (e.g. during reload or the close sequence).
 *
 * We call `mainFrame.send()` directly instead of `webContents.send()` because
 * Electron 40's `webContents.send()` internally catches disposed-frame errors
 * and logs them via `console.error` before our try-catch can suppress them.
 * Going through `mainFrame` directly lets our catch block handle it silently.
 */
export function safeSend(window: BrowserWindow | null, channel: string, ...args: unknown[]): void {
  if (!window || window.isDestroyed()) return
  try {
    window.webContents.mainFrame.send(channel, ...args)
  } catch {
    // Frame disposed between isDestroyed() check and send() — expected during
    // window close / reload; nothing to do.
  }
}
