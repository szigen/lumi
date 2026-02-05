import type { IPty } from 'node-pty'

export interface SpawnResult {
  id: string
  name: string
}

export interface ManagedTerminal {
  id: string
  name: string
  pty: IPty
  repoPath: string
  createdAt: Date
}
