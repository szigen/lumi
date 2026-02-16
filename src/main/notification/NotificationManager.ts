import { BrowserWindow, Notification } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const UNSEEN_INTERVAL_MS = 60_000   // 1 minute
const SEEN_INTERVAL_MS = 300_000    // 5 minutes

export class NotificationManager {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private terminalContext: Map<string, { window: BrowserWindow; repoPath: string }> = new Map()

  notifyStatusChange(
    terminalId: string,
    status: string,
    window: BrowserWindow,
    repoPath: string
  ): void {
    if (window.isDestroyed()) return

    this.terminalContext.set(terminalId, { window, repoPath })

    // Clear any existing interval for this terminal
    this.clearInterval(terminalId)

    if (status === 'waiting-unseen') {
      this.sendNotification(terminalId, 'Assistant is waiting for input')
      this.startInterval(terminalId, UNSEEN_INTERVAL_MS, 'Assistant is waiting for input')
    } else if (status === 'waiting-seen') {
      // Don't send immediately on seen transition (user already saw it), just start repeat
      this.startInterval(terminalId, SEEN_INTERVAL_MS, 'Assistant is still waiting for input')
    } else if (status === 'error') {
      this.sendNotification(terminalId, 'Assistant exited with error')
    }
    // For working, idle, waiting-focused: interval already cleared above
  }

  removeTerminal(terminalId: string): void {
    this.clearInterval(terminalId)
    this.terminalContext.delete(terminalId)
  }

  private startInterval(terminalId: string, ms: number, title: string): void {
    const interval = setInterval(() => {
      const ctx = this.terminalContext.get(terminalId)
      if (!ctx || ctx.window.isDestroyed()) {
        this.clearInterval(terminalId)
        return
      }
      this.sendNotification(terminalId, title)
    }, ms)
    this.intervals.set(terminalId, interval)
  }

  private clearInterval(terminalId: string): void {
    const existing = this.intervals.get(terminalId)
    if (existing) {
      clearInterval(existing)
      this.intervals.delete(terminalId)
    }
  }

  private sendNotification(terminalId: string, title: string): void {
    const ctx = this.terminalContext.get(terminalId)
    if (!ctx || ctx.window.isDestroyed()) return

    const repoName = ctx.repoPath.split('/').pop() || ctx.repoPath

    // Native notification when window is not focused
    if (!ctx.window.isFocused()) {
      const notification = new Notification({
        title,
        body: repoName,
        silent: true
      })

      notification.on('click', () => {
        ctx.window.show()
        ctx.window.focus()
        ctx.window.webContents.send(IPC_CHANNELS.NOTIFICATION_CLICK, terminalId)
      })

      notification.show()
    }

    // Always send IPC bell event to renderer
    ctx.window.webContents.send(IPC_CHANNELS.TERMINAL_BELL, terminalId, repoName)
  }
}
