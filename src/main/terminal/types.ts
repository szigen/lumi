import type { IPty } from 'node-pty'
import type { BrowserWindow } from 'electron'
import type { OutputBuffer } from './OutputBuffer'

export type { SpawnResult } from '../../shared/types'

export interface ManagedTerminal {
  id: string
  name: string
  pty: IPty
  repoPath: string
  createdAt: Date
  task?: string
  outputBuffer: OutputBuffer
}

/** Abstracts notification dispatch so TerminalManager doesn't depend on concrete NotificationManager */
export interface ITerminalNotifier {
  processPtyOutput(id: string, data: string, window: BrowserWindow, repoPath: string): void
  removeTerminal(id: string): void
}

/** Abstracts codename discovery tracking */
export interface ICodenameTracker {
  addDiscoveredCodename(name: string): boolean
}
