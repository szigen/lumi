import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { OutputBuffer } from './OutputBuffer'
import type { ManagedTerminal, SpawnResult, ITerminalNotifier, ICodenameTracker } from './types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { safeSend } from '../safeSend'
import { generateCodename } from './codenames'
import { StatusStateMachine } from './StatusStateMachine'
import { OscTitleParser, type AgentProviderHint } from './OscTitleParser'
import { getDefaultShell, getShellArgs, isWin } from '../platform'
import type { TerminalSnapshot } from '../../shared/types'

const STATUS_DETECTION = {
  activitySilenceMs: 3_000
} as const

export class TerminalManager extends EventEmitter {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private oscParser = new OscTitleParser()
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

  spawn(repoPath: string, window: BrowserWindow): SpawnResult | null {
    if (this.terminals.size >= this.maxTerminals) {
      console.error(`Max terminals (${this.maxTerminals}) reached`)
      return null
    }

    const id = uuidv4()
    const name = generateCodename()
    const isNew = false
    const shell = getDefaultShell()

    const ptyProcess = pty.spawn(shell, getShellArgs(), {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: repoPath,
      env: process.env as Record<string, string>,
      ...(isWin && { useConpty: false })
    })

    const statusMachine = new StatusStateMachine()

    const terminal: ManagedTerminal = {
      id,
      name,
      pty: ptyProcess,
      repoPath,
      createdAt: new Date(),
      agentHint: 'unknown',
      outputBuffer: new OutputBuffer(),
      statusMachine
    }

    statusMachine.setOnChange((status) => {
      if (!window.isDestroyed() && this.terminals.has(id)) {
        safeSend(window, IPC_CHANNELS.TERMINAL_STATUS, id, status)
        this.notifier.notifyStatusChange(id, status, window, repoPath)
      }
    })

    ptyProcess.onData((data) => {
      this.maybeInferProviderFromOutput(terminal, data)
      let sawCodexTurnComplete = false
      this.oscParser.parse(id, data, (event) => {
        if (event.providerHint) {
          this.setProviderHint(terminal, event.providerHint)
        }

        if (event.source === 'notification') {
          if (event.kind === 'codex-turn-complete') {
            // Codex turn completed → definitive "done" signal
            sawCodexTurnComplete = true
            this.clearActivityTimer(terminal)
            statusMachine.onTitleChange(false)
          }
          return
        }

        if (event.source === 'title' && event.title) {
          const cleanTitle = event.title.replace(/^.\s*/, '')
          if (cleanTitle) {
            terminal.oscTitle = cleanTitle
            safeSend(window, IPC_CHANNELS.TERMINAL_TITLE, id, cleanTitle)
          }
        }

        if (event.isWorking === null) return
        if (event.isWorking) {
          terminal.lastActivityAt = Date.now()
        }
        statusMachine.onTitleChange(event.isWorking)
      })

      // Activity-based detection is scoped to Codex terminals.
      if (terminal.agentHint === 'codex' && !sawCodexTurnComplete) {
        this.resetActivityTimer(terminal)
      }

      terminal.outputBuffer.append(data)

      safeSend(window, IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
      this.emit('output', { terminalId: id, data })
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.clearActivityTimer(terminal)
      this.terminals.delete(id)
      this.notifier.removeTerminal(id)
      terminal.statusMachine.onExit(exitCode)
      this.oscParser.delete(id)
      safeSend(window, IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
      this.emit('exit', { terminalId: id, exitCode })
    })

    this.terminals.set(id, terminal)

    return { id, name, isNew }
  }

  write(terminalId: string, data: string): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    // Strip focus reporting events (\x1b[I = focus-in, \x1b[O = focus-out)
    // Assistant CLIs can enable focus reporting via \x1b[?1004h and stop spinner
    // animation on focus-out. We manage focus state ourselves via StatusStateMachine,
    // so they should always behave as if focused to emit spinner titles.
    // eslint-disable-next-line no-control-regex
    const filtered = data.replace(/\x1b\[[IO]/g, '')
    if (filtered.length === 0) return true
    this.maybeInferProviderFromInput(terminal, filtered)
    if (filtered.includes('\r')) {
      terminal.lastActivityAt = Date.now()
      // User sent Enter → expect agent to start working
      if (terminal.agentHint === 'codex') {
        terminal.statusMachine.onUserInput()
      }
    }
    terminal.pty.write(filtered)
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
    this.clearActivityTimer(terminal)
    terminal.pty.kill()
    this.terminals.delete(terminalId)
    this.oscParser.delete(terminalId)
    this.notifier.removeTerminal(terminalId)
    return true
  }

  killAll(): void {
    for (const [id, terminal] of this.terminals.entries()) {
      this.clearActivityTimer(terminal)
      terminal.pty.kill()
      this.notifier.removeTerminal(id)
    }
    this.terminals.clear()
    this.oscParser.clear()
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

  getTerminalSnapshots(): TerminalSnapshot[] {
    return Array.from(this.terminals.values()).map(t => ({
      id: t.id,
      name: t.name,
      repoPath: t.repoPath,
      createdAt: t.createdAt.toISOString(),
      task: t.task,
      oscTitle: t.oscTitle,
      status: t.statusMachine.getStatus(),
      output: t.outputBuffer.get()
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

  setWindowFocused(focused: boolean): void {
    for (const terminal of this.terminals.values()) {
      if (focused) {
        terminal.statusMachine.onWindowFocus()
      } else {
        terminal.statusMachine.onWindowBlur()
      }
    }
  }

  private setProviderHint(terminal: ManagedTerminal, provider: AgentProviderHint): void {
    if (terminal.agentHint === provider) return
    terminal.agentHint = provider
    if (provider === 'claude') {
      this.clearActivityTimer(terminal)
    }
  }

  private maybeInferProviderFromInput(terminal: ManagedTerminal, data: string): void {
    const trimmed = data.trimStart()
    if (/^codex(\s|\r|$)/.test(trimmed)) {
      this.setProviderHint(terminal, 'codex')
      return
    }
    if (/^claude(\s|\r|$)/.test(trimmed)) {
      this.setProviderHint(terminal, 'claude')
    }
  }

  private maybeInferProviderFromOutput(terminal: ManagedTerminal, data: string): void {
    const lowered = data.toLowerCase()

    if (terminal.agentHint !== 'codex') {
      if (lowered.includes('openai codex')) {
        this.setProviderHint(terminal, 'codex')
        return
      }
    }

    if (terminal.agentHint === 'unknown' && lowered.includes('claude code')) {
      this.setProviderHint(terminal, 'claude')
    }
  }

  /** Reset the activity silence timer — marks terminal as working on output */
  private resetActivityTimer(terminal: ManagedTerminal): void {
    this.clearActivityTimer(terminal)
    terminal.statusMachine.onOutputActivity()
    terminal.lastActivityAt = Date.now()
    terminal.activityTimer = setTimeout(() => {
      terminal.activityTimer = undefined
      terminal.statusMachine.onOutputSilence()
    }, STATUS_DETECTION.activitySilenceMs)
  }

  private clearActivityTimer(terminal: ManagedTerminal): void {
    if (terminal.activityTimer) {
      clearTimeout(terminal.activityTimer)
      terminal.activityTimer = undefined
    }
  }
}
