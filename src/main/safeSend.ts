import type { BrowserWindow } from 'electron'

/**
 * Safely send an IPC message to a BrowserWindow's renderer.
 *
 * `window.isDestroyed()` can return false while the underlying WebFrameMain
 * is already disposed (e.g. during reload, the close sequence, or after a
 * renderer crash).
 *
 * Electron's `WebFrameMain.send()` internally catches disposed-frame errors
 * and logs them via `console.error` ("Error sending from webFrameMain: ...")
 * before any outer try-catch can suppress them — so the only way to stay
 * silent is to not call `send()` at all when the renderer is gone. The
 * crashed-renderer check matters most: PTY output keeps streaming between a
 * crash and the recovery reload, and would otherwise flood the console.
 */
export function safeSend(window: BrowserWindow | null, channel: string, ...args: unknown[]): void {
  if (!window || window.isDestroyed()) return
  const { webContents } = window
  if (webContents.isDestroyed() || webContents.isCrashed()) return
  try {
    webContents.mainFrame.send(channel, ...args)
  } catch {
    // Frame disposed between the checks and send() — expected during
    // window close / reload; nothing to do.
  }
}
