import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import type { ManagedTerminal, SpawnResult } from './types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { NotificationManager } from '../notification/NotificationManager'
import { generateCodename } from './codenames'

export class TerminalManager extends EventEmitter {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private maxTerminals: number
  private notificationManager: NotificationManager

  constructor(maxTerminals: number = 12) {
    super()
    this.maxTerminals = maxTerminals
    this.notificationManager = new NotificationManager()
  }

  spawn(repoPath: string, window: BrowserWindow): SpawnResult | null {
    if (this.terminals.size >= this.maxTerminals) {
      console.error(`Max terminals (${this.maxTerminals}) reached`)
      return null
    }

    const id = uuidv4()
    const name = generateCodename()
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'zsh'

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: repoPath,
      env: process.env as Record<string, string>
    })

    const terminal: ManagedTerminal = {
      id,
      name,
      pty: ptyProcess,
      repoPath,
      createdAt: new Date()
    }

    ptyProcess.onData((data) => {
      window.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
      this.notificationManager.processPtyOutput(id, data, window, repoPath)
      this.emit('output', { terminalId: id, data })
    })

    ptyProcess.onExit(({ exitCode }) => {
      window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
      this.terminals.delete(id)
      this.notificationManager.removeTerminal(id)
      this.emit('exit', { terminalId: id, exitCode })
    })

    this.terminals.set(id, terminal)

    return { id, name }
  }

  write(terminalId: string, data: string): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.write(data)
    return true
  }

  resize(terminalId: string, cols: number, rows: number): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.resize(cols, rows)
    return true
  }

  kill(terminalId: string): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.kill()
    this.terminals.delete(terminalId)
    this.notificationManager.removeTerminal(terminalId)
    return true
  }

  killAll(): void {
    for (const [id, terminal] of this.terminals.entries()) {
      terminal.pty.kill()
      this.notificationManager.removeTerminal(id)
    }
    this.terminals.clear()
  }

  getCount(): number {
    return this.terminals.size
  }

  setMaxTerminals(max: number): void {
    this.maxTerminals = max
  }
}
