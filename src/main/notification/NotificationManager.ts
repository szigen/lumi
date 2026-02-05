import { BrowserWindow, Notification } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const BEL = '\x07'
const THROTTLE_MS = 5000

export class NotificationManager {
  private lastBellTime: Map<string, number> = new Map()

  processPtyOutput(
    terminalId: string,
    data: string,
    window: BrowserWindow,
    repoPath: string
  ): void {
    if (!data.includes(BEL)) return
    if (window.isDestroyed()) return

    const now = Date.now()
    const lastTime = this.lastBellTime.get(terminalId) || 0
    if (now - lastTime < THROTTLE_MS) return

    this.lastBellTime.set(terminalId, now)

    const repoName = repoPath.split('/').pop() || repoPath

    // Native notification when window is not focused
    if (!window.isFocused()) {
      const notification = new Notification({
        title: 'Claude is waiting for input',
        body: repoName,
        silent: true
      })

      notification.on('click', () => {
        window.show()
        window.focus()
        window.webContents.send(IPC_CHANNELS.NOTIFICATION_CLICK, terminalId)
      })

      notification.show()
    }

    // Always send IPC bell event to renderer
    window.webContents.send(IPC_CHANNELS.TERMINAL_BELL, terminalId, repoName)
  }

  removeTerminal(terminalId: string): void {
    this.lastBellTime.delete(terminalId)
  }
}
