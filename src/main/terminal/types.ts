import type { IPty } from 'node-pty'
import type { BrowserWindow } from 'electron'
import type { OutputBuffer } from './OutputBuffer'
import type { StatusStateMachine } from './StatusStateMachine'

export type { SpawnResult } from '../../shared/types'

export type TerminalAgentHint = 'claude' | 'codex' | 'unknown'

export interface ManagedTerminal {
  id: string
  name: string
  pty: IPty
  repoPath: string
  createdAt: Date
  task?: string
  agentHint: TerminalAgentHint
  lastActivityAt?: number
  activityTimer?: ReturnType<typeof setTimeout>
  outputBuffer: OutputBuffer
  statusMachine: StatusStateMachine
}

/** Abstracts notification dispatch so TerminalManager doesn't depend on concrete NotificationManager */
export interface ITerminalNotifier {
  notifyStatusChange(id: string, status: string, window: BrowserWindow, repoPath: string): void
  removeTerminal(id: string): void
}

/** Abstracts codename discovery tracking */
export interface ICodenameTracker {
  addDiscoveredCodename(name: string): boolean
}
