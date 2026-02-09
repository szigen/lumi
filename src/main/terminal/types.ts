import type { IPty } from 'node-pty'

export interface SpawnResult {
  id: string
  name: string
  isNew: boolean
}

export interface ManagedTerminal {
  id: string
  name: string
  pty: IPty
  repoPath: string
  createdAt: Date
  task?: string
  outputBuffer: string
}
