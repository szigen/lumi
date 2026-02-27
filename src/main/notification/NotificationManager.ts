import { BrowserWindow, Notification } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../shared/constants'
import type { NotificationSettings } from '../../shared/types'
import { safeSend } from '../safeSend'

export class NotificationManager {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private terminalContext: Map<string, { window: BrowserWindow; repoPath: string }> = new Map()
  private terminalStatuses: Map<string, string> = new Map()
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS

  updateSettings(settings: NotificationSettings): void {
    this.settings = settings

    // Re-create intervals for all tracked terminals with new settings
    for (const [terminalId, status] of this.terminalStatuses) {
      const ctx = this.terminalContext.get(terminalId)
      if (!ctx || ctx.window.isDestroyed()) continue

      this.clearInterval(terminalId)

      if (status === 'waiting-unseen' && this.settings.unseenEnabled) {
        const ms = this.settings.unseenIntervalMinutes * 60_000
        this.startInterval(terminalId, ms, 'Assistant is waiting for input')
      } else if (status === 'waiting-seen' && this.settings.seenEnabled) {
        const ms = this.settings.seenIntervalMinutes * 60_000
        this.startInterval(terminalId, ms, 'Assistant is still waiting for input')
      }
    }
  }

  notifyStatusChange(
    terminalId: string,
    status: string,
    window: BrowserWindow,
    repoPath: string
  ): void {
    if (window.isDestroyed()) return

    this.terminalContext.set(terminalId, { window, repoPath })
    this.terminalStatuses.set(terminalId, status)

    // Clear any existing interval for this terminal
    this.clearInterval(terminalId)

    if (status === 'waiting-unseen' && this.settings.unseenEnabled) {
      const ms = this.settings.unseenIntervalMinutes * 60_000
      this.sendNotification(terminalId, 'Assistant is waiting for input')
      this.startInterval(terminalId, ms, 'Assistant is waiting for input')
    } else if (status === 'waiting-seen' && this.settings.seenEnabled) {
      const ms = this.settings.seenIntervalMinutes * 60_000
      // Don't send immediately on seen transition (user already saw it), just start repeat
      this.startInterval(terminalId, ms, 'Assistant is still waiting for input')
    } else if (status === 'error') {
      this.sendNotification(terminalId, 'Assistant exited with error')
    }
    // For working, idle, waiting-focused: interval already cleared above
  }

  removeTerminal(terminalId: string): void {
    this.clearInterval(terminalId)
    this.terminalContext.delete(terminalId)
    this.terminalStatuses.delete(terminalId)
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
        safeSend(ctx.window, IPC_CHANNELS.NOTIFICATION_CLICK, terminalId)
      })

      notification.show()
    }

    // Always send IPC bell event to renderer
    safeSend(ctx.window, IPC_CHANNELS.TERMINAL_BELL, terminalId, repoName)
  }
}
