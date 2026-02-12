import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { OutputBuffer } from './OutputBuffer'
import type { ManagedTerminal, SpawnResult, ITerminalNotifier, ICodenameTracker } from './types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { generateCodename } from './codenames'
import { StatusStateMachine } from './StatusStateMachine'

export class TerminalManager extends EventEmitter {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private oscBuffers: Map<string, string> = new Map()
  private maxTerminals: number
  private notifier: ITerminalNotifier
  private codenameTracker: ICodenameTracker

  constructor(
    maxTerminals: number = 12,
    notifier: ITerminalNotifier,
    codenameTracker: ICodenameTracker
  ) {
    super()
    this.maxTerminals = maxTerminals
    this.notifier = notifier
    this.codenameTracker = codenameTracker
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

    const statusMachine = new StatusStateMachine()

    const terminal: ManagedTerminal = {
      id,
      name,
      pty: ptyProcess,
      repoPath,
      createdAt: new Date(),
      outputBuffer: new OutputBuffer(),
      statusMachine
    }

    statusMachine.setOnChange((status) => {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_STATUS, id, status)
      }
    })

    ptyProcess.onData((data) => {
      this.parseOscTitle(id, data, statusMachine)

      terminal.outputBuffer.append(data)

      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
        this.notifier.processPtyOutput(id, data, window, repoPath)
      }
      this.emit('output', { terminalId: id, data })
    })

    ptyProcess.onExit(({ exitCode }) => {
      terminal.statusMachine.onExit()
      this.oscBuffers.delete(id)
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
      }
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
    this.oscBuffers.delete(terminalId)
    this.notifier.removeTerminal(terminalId)
    return true
  }

  killAll(): void {
    for (const [id, terminal] of this.terminals.entries()) {
      terminal.pty.kill()
      this.notifier.removeTerminal(id)
    }
    this.terminals.clear()
    this.oscBuffers.clear()
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

  getTerminalList(): Array<{ id: string; name: string; repoPath: string; createdAt: string; task?: string; status: string }> {
    return Array.from(this.terminals.values()).map(t => ({
      id: t.id,
      name: t.name,
      repoPath: t.repoPath,
      createdAt: t.createdAt.toISOString(),
      task: t.task,
      status: t.statusMachine.getStatus()
    }))
  }

  getStatus(terminalId: string): string | null {
    const terminal = this.terminals.get(terminalId)
    return terminal ? terminal.statusMachine.getStatus() : null
  }

  setFocused(terminalId: string | null): void {
    for (const [id, terminal] of this.terminals) {
      if (id === terminalId) {
        terminal.statusMachine.onFocus()
      } else {
        terminal.statusMachine.onBlur()
      }
    }
  }

  getOutputBuffer(terminalId: string): string | null {
    const terminal = this.terminals.get(terminalId)
    return terminal ? terminal.outputBuffer.get() : null
  }

  /** Buffer partial OSC sequences across PTY chunks and parse complete ones */
  private parseOscTitle(id: string, data: string, statusMachine: StatusStateMachine): void {
    let buf = this.oscBuffers.get(id) || ''
    buf += data

    // Process all complete OSC sequences in the buffer
    while (true) { // eslint-disable-line no-constant-condition
      const oscStart = buf.indexOf('\x1b]0;')
      if (oscStart === -1) {
        // No OSC start — clear buffer (nothing to accumulate)
        this.oscBuffers.delete(id)
        return
      }

      // Look for terminator: BEL (\x07) or ST (\x1b\\)
      const afterOsc = oscStart + 4
      const belIdx = buf.indexOf('\x07', afterOsc)
      const stIdx = buf.indexOf('\x1b\\', afterOsc)

      let endIdx = -1
      let endLen = 0
      if (belIdx !== -1 && (stIdx === -1 || belIdx < stIdx)) {
        endIdx = belIdx
        endLen = 1
      } else if (stIdx !== -1) {
        endIdx = stIdx
        endLen = 2
      }

      if (endIdx === -1) {
        // Incomplete sequence — keep from oscStart onward
        this.oscBuffers.set(id, buf.slice(oscStart))
        return
      }

      const title = buf.slice(afterOsc, endIdx)
      const isWorking = !title.startsWith('\u2733')
      statusMachine.onTitleChange(isWorking)

      // Continue parsing after this sequence
      buf = buf.slice(endIdx + endLen)
    }
  }
}
