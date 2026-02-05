import { BrowserWindow } from 'electron'
import { TerminalManager } from '../terminal/TerminalManager'
import type { Action } from '../../shared/action-types'
import type { SpawnResult } from '../terminal/types'

interface OutputEvent {
  terminalId: string
  data: string
}

export class ActionEngine {
  private terminalManager: TerminalManager
  private window: BrowserWindow | null = null

  constructor(terminalManager: TerminalManager) {
    this.terminalManager = terminalManager
  }

  setWindow(window: BrowserWindow): void {
    this.window = window
  }

  async execute(action: Action, repoPath: string): Promise<SpawnResult | null> {
    if (!this.window) throw new Error('No main window')

    const result = this.terminalManager.spawn(repoPath, this.window)
    if (!result) return null

    const { id: terminalId } = result

    for (const step of action.steps) {
      switch (step.type) {
        case 'write':
          this.terminalManager.write(terminalId, step.content)
          break

        case 'wait_for':
          await this.waitForOutput(terminalId, step.pattern, step.timeout ?? 10000)
          break

        case 'delay':
          await new Promise((r) => setTimeout(r, step.ms))
          break
      }
    }

    return result
  }

  private waitForOutput(terminalId: string, pattern: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const regex = new RegExp(pattern)
      const timer = setTimeout(() => {
        this.terminalManager.off('output', handler)
        reject(new Error(`wait_for timeout: pattern "${pattern}" not matched in ${timeout}ms`))
      }, timeout)

      const handler = ({ terminalId: id, data }: OutputEvent) => {
        if (id === terminalId && regex.test(data)) {
          clearTimeout(timer)
          this.terminalManager.off('output', handler)
          resolve()
        }
      }

      this.terminalManager.on('output', handler)
    })
  }
}
