import type { BrowserWindow } from 'electron'

/**
 * Safely send an IPC message to a BrowserWindow's renderer.
 *
 * `window.isDestroyed()` can return false while the underlying WebFrameMain
 * is already disposed (e.g. during reload or the close sequence).  Wrapping
 * in try-catch eliminates the TOCTOU race that causes
 * "Render frame was disposed before WebFrameMain could be accessed" errors.
 */
export function safeSend(window: BrowserWindow | null, channel: string, ...args: unknown[]): void {
  if (!window || window.isDestroyed()) return
  try {
    window.webContents.send(channel, ...args)
  } catch {
    // Frame disposed between isDestroyed() check and send() — expected during
    // window close / reload; nothing to do.
  }
}
