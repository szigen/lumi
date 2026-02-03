import type { IPty } from 'node-pty'

export interface ManagedTerminal {
  id: string
  pty: IPty
  repoPath: string
  createdAt: Date
}
