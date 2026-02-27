import { create } from 'zustand'
import type { TerminalStatus, Terminal, TerminalSnapshot } from '../../shared/types'

let terminalBridgeCleanup: (() => void) | null = null

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null
  lastActiveByRepo: Map<string, string>
  syncing: boolean
  pendingSync: boolean

  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<Terminal>) => void
  appendOutput: (id: string, data: string) => void
  setActiveTerminal: (id: string | null) => void
  getTerminalsByRepo: (repoPath: string) => Terminal[]
  getTerminalCount: () => number
  connectTerminalEventBridge: () => void
  disconnectTerminalEventBridge: () => void
  syncFromMain: () => Promise<void>
}

export function appendTerminalOutput(current: string, chunk: string): string {
  return current + chunk
}

export function mergeSnapshotOutput(current: string, snapshot: string): string {
  if (!current) return snapshot
  if (!snapshot) return current

  // Snapshot is ahead (renderer missed events) -> trust snapshot.
  if (snapshot.startsWith(current)) return snapshot

  // Renderer is ahead (sync raced with live output) -> keep current to avoid rollback flicker.
  if (current.startsWith(snapshot)) return current

  // Diverged streams: prefer longer buffer to reduce destructive full redraws.
  return current.length >= snapshot.length ? current : snapshot
}

/** Reconcile main process snapshots with renderer state */
export function reconcileTerminals(
  snapshots: TerminalSnapshot[],
  currentTerminals: Map<string, Terminal>,
  currentOutputs: Map<string, string>
): { terminals: Map<string, Terminal>; outputs: Map<string, string> } {
  const terminals = new Map<string, Terminal>()
  const outputs = new Map<string, string>()

  for (const snapshot of snapshots) {
    const existing = currentTerminals.get(snapshot.id)
    terminals.set(snapshot.id, {
      id: snapshot.id,
      name: snapshot.name,
      repoPath: snapshot.repoPath,
      status: snapshot.status || existing?.status || 'idle',
      task: snapshot.task,
      oscTitle: snapshot.oscTitle || existing?.oscTitle,
      isNew: existing?.isNew,
      createdAt: new Date(snapshot.createdAt)
    })
    const currentOutput = currentOutputs.get(snapshot.id) || ''
    outputs.set(snapshot.id, mergeSnapshotOutput(currentOutput, snapshot.output || ''))
  }

  return { terminals, outputs }
}

/** Pick the active terminal: keep current if still valid, otherwise pick first available */
export function resolveActiveTerminal(
  currentActive: string | null,
  validIds: Set<string>,
  terminals: Map<string, Terminal>
): string | null {
  if (currentActive && validIds.has(currentActive)) return currentActive
  return terminals.size > 0 ? terminals.keys().next().value ?? null : null
}

/** Rebuild per-repo last-active map, preserving valid previous selections */
export function rebuildLastActiveByRepo(
  terminals: Map<string, Terminal>,
  previousLastActive: Map<string, string>
): Map<string, string> {
  const lastActive = new Map<string, string>()

  // Default: first terminal per repo
  for (const [id, t] of terminals) {
    if (!lastActive.has(t.repoPath)) {
      lastActive.set(t.repoPath, id)
    }
  }

  // Preserve valid previous selections
  for (const [repo, termId] of previousLastActive) {
    if (terminals.has(termId)) {
      lastActive.set(repo, termId)
    }
  }

  return lastActive
}

/** Find the previous neighbor (or next if closing the first) for focus after close.
 *  When repoPath is provided, only terminals from that repo are considered. */
export function findNeighborTerminalId(
  closedId: string,
  terminals: Map<string, Terminal>,
  repoPath?: string
): string | null {
  const entries = repoPath
    ? Array.from(terminals.entries()).filter(([, t]) => t.repoPath === repoPath)
    : Array.from(terminals.entries())
  const keys = entries.map(([id]) => id)
  const idx = keys.indexOf(closedId)
  if (idx === -1) return keys[0] || null
  if (idx > 0) return keys[idx - 1]
  return keys[1] || null
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  outputs: new Map(),
  activeTerminalId: null,
  lastActiveByRepo: new Map(),
  syncing: false,
  pendingSync: false,

  removeTerminal: (id) => {
    set((state) => {
      const terminal = state.terminals.get(id)

      // Compute neighbor BEFORE deleting so index is correct
      const neighborId = state.activeTerminalId === id
        ? findNeighborTerminalId(id, state.terminals, terminal?.repoPath)
        : null

      const newTerminals = new Map(state.terminals)
      newTerminals.delete(id)
      const newOutputs = new Map(state.outputs)
      newOutputs.delete(id)

      const newLastActive = new Map(state.lastActiveByRepo)
      if (terminal) {
        const lastActiveForRepo = newLastActive.get(terminal.repoPath)
        if (lastActiveForRepo === id) {
          const repoTerminals = Array.from(newTerminals.values())
            .filter(t => t.repoPath === terminal.repoPath)
          if (repoTerminals.length > 0) {
            newLastActive.set(terminal.repoPath, repoTerminals[0].id)
          } else {
            newLastActive.delete(terminal.repoPath)
          }
        }
      }

      const newActive = state.activeTerminalId === id
        ? (neighborId && newTerminals.has(neighborId) ? neighborId : null)
        : state.activeTerminalId

      return {
        terminals: newTerminals,
        outputs: newOutputs,
        activeTerminalId: newActive,
        lastActiveByRepo: newLastActive
      }
    })
  },

  updateTerminal: (id, updates) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      const terminal = newTerminals.get(id)
      if (terminal) {
        newTerminals.set(id, { ...terminal, ...updates })
      }
      return { terminals: newTerminals }
    })
  },

  appendOutput: (id, data) => {
    set((state) => {
      const newOutputs = new Map(state.outputs)
      const current = newOutputs.get(id) || ''
      const next = appendTerminalOutput(current, data)
      newOutputs.set(id, next)
      return { outputs: newOutputs }
    })
  },

  setActiveTerminal: (id) => {
    if (!id) {
      set({ activeTerminalId: null })
      return
    }

    const terminal = get().terminals.get(id)
    if (terminal) {
      const newLastActive = new Map(get().lastActiveByRepo)
      newLastActive.set(terminal.repoPath, id)
      set({ activeTerminalId: id, lastActiveByRepo: newLastActive })
    } else {
      set({ activeTerminalId: id })
    }
  },

  getTerminalsByRepo: (repoPath) => {
    return Array.from(get().terminals.values()).filter((t) => t.repoPath === repoPath)
  },

  getTerminalCount: () => get().terminals.size,

  connectTerminalEventBridge: () => {
    if (terminalBridgeCleanup) {
      return
    }

    const cleanupOutput = window.api.onTerminalOutput((terminalId: string, data: string) => {
      get().appendOutput(terminalId, data)
    })
    const cleanupStatus = window.api.onTerminalStatus((terminalId: string, status: string) => {
      get().updateTerminal(terminalId, { status: status as TerminalStatus })
    })
    const cleanupTitle = window.api.onTerminalTitle((terminalId: string, title: string) => {
      get().updateTerminal(terminalId, { oscTitle: title })
    })
    const cleanupExit = window.api.onTerminalExit((terminalId: string) => {
      get().removeTerminal(terminalId)
    })

    terminalBridgeCleanup = () => {
      cleanupOutput()
      cleanupStatus()
      cleanupTitle()
      cleanupExit()
      terminalBridgeCleanup = null
    }
  },

  disconnectTerminalEventBridge: () => {
    if (!terminalBridgeCleanup) return
    terminalBridgeCleanup()
  },

  syncFromMain: async () => {
    if (get().syncing) {
      // A sync is in progress — schedule a re-sync after it completes
      set({ pendingSync: true })
      return
    }
    set({ syncing: true, pendingSync: false })

    try {
      const snapshots = await window.api.getTerminalSnapshots()
      const mainIds = new Set(snapshots.map(t => t.id))
      const { terminals, outputs } = reconcileTerminals(
        snapshots,
        get().terminals,
        get().outputs
      )

      const activeTerminalId = resolveActiveTerminal(
        get().activeTerminalId,
        mainIds,
        terminals
      )

      const lastActiveByRepo = rebuildLastActiveByRepo(
        terminals,
        get().lastActiveByRepo
      )

      set({ terminals, outputs, activeTerminalId, lastActiveByRepo })
    } finally {
      set({ syncing: false })
      // If a sync was requested while we were busy, run it now
      if (get().pendingSync) {
        get().syncFromMain()
      }
    }
  }
}))
