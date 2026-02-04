import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { ManagedTerminal } from './types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

export class TerminalManager {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private maxTerminals: number

  constructor(maxTerminals: number = 12) {
    this.maxTerminals = maxTerminals
  }

  spawn(repoPath: string, window: BrowserWindow): string | null {
    if (this.terminals.size >= this.maxTerminals) {
      console.error(`Max terminals (${this.maxTerminals}) reached`)
      return null
    }

    const id = uuidv4()
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
      pty: ptyProcess,
      repoPath,
      createdAt: new Date()
    }

    ptyProcess.onData((data) => {
      window.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
      this.terminals.delete(id)
    })

    this.terminals.set(id, terminal)

    // Auto-start Claude CLI
    ptyProcess.write('claude\r')

    return id
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
    return true
  }

  killAll(): void {
    for (const terminal of this.terminals.values()) {
      terminal.pty.kill()
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
