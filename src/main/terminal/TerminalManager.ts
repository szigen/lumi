import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { OutputBuffer } from './OutputBuffer'
import type { ManagedTerminal, SpawnResult, ITerminalNotifier, ICodenameTracker, IPtyDataInspector } from './types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { generateCodename } from './codenames'

export class TerminalManager extends EventEmitter {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private maxTerminals: number
  private notifier: ITerminalNotifier
  private codenameTracker: ICodenameTracker
  private inspector?: IPtyDataInspector

  constructor(
    maxTerminals: number = 12,
    notifier: ITerminalNotifier,
    codenameTracker: ICodenameTracker,
    inspector?: IPtyDataInspector
  ) {
    super()
    this.maxTerminals = maxTerminals
    this.notifier = notifier
    this.codenameTracker = codenameTracker
    this.inspector = inspector
  }

  spawn(repoPath: string, window: BrowserWindow, trackCollection = true): SpawnResult | null {
    if (this.terminals.size >= this.maxTerminals) {
      console.error(`Max terminals (${this.maxTerminals}) reached`)
      return null
    }

    const id = uuidv4()
    const name = generateCodename()
    const isNew = trackCollection ? this.codenameTracker.addDiscoveredCodename(name) : false
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
      createdAt: new Date(),
      outputBuffer: new OutputBuffer()
    }

    ptyProcess.onData((data) => {
      terminal.outputBuffer.append(data)
      this.inspector?.inspect(id, data)

      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
        this.notifier.processPtyOutput(id, data, window, repoPath)
      }
      this.emit('output', { terminalId: id, data })
    })

    ptyProcess.onExit(({ exitCode }) => {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
      }
      this.inspector?.onTerminalExit(id)
      this.terminals.delete(id)
      this.notifier.removeTerminal(id)
      this.emit('exit', { terminalId: id, exitCode })
    })

    this.terminals.set(id, terminal)

    return { id, name, isNew }
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
    this.notifier.removeTerminal(terminalId)
    return true
  }

  killAll(): void {
    for (const [id, terminal] of this.terminals.entries()) {
      terminal.pty.kill()
      this.notifier.removeTerminal(id)
    }
    this.terminals.clear()
  }

  getCount(): number {
    return this.terminals.size
  }

  setMaxTerminals(max: number): void {
    this.maxTerminals = max
  }

  setTask(terminalId: string, task: string): void {
    const terminal = this.terminals.get(terminalId)
    if (terminal) terminal.task = task
  }

  getTerminalList(): Array<{ id: string; name: string; repoPath: string; createdAt: string; task?: string }> {
    return Array.from(this.terminals.values()).map(t => ({
      id: t.id,
      name: t.name,
      repoPath: t.repoPath,
      createdAt: t.createdAt.toISOString(),
      task: t.task
    }))
  }

  getOutputBuffer(terminalId: string): string | null {
    const terminal = this.terminals.get(terminalId)
    return terminal ? terminal.outputBuffer.get() : null
  }
}
