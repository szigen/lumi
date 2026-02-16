import { create } from 'zustand'
import type { TerminalStatus, Terminal, TerminalSnapshot } from '../../shared/types'

const OUTPUT_BUFFER_MAX_SIZE = 100_000
const OUTPUT_NEWLINE_SEARCH_WINDOW = 1024

let terminalBridgeCleanup: (() => void) | null = null

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null
  lastActiveByRepo: Map<string, string>
  syncing: boolean

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

export function trimTerminalOutput(buffer: string): string {
  if (buffer.length <= OUTPUT_BUFFER_MAX_SIZE) {
    return buffer
  }

  let cutIndex = buffer.length - OUTPUT_BUFFER_MAX_SIZE
  const searchEnd = Math.min(cutIndex + OUTPUT_NEWLINE_SEARCH_WINDOW, buffer.length)
  const newlinePos = buffer.indexOf('\n', cutIndex)

  if (newlinePos !== -1 && newlinePos < searchEnd) {
    cutIndex = newlinePos + 1
  }

  return buffer.slice(cutIndex)
}

export function appendTerminalOutput(current: string, chunk: string): string {
  return trimTerminalOutput(current + chunk)
}

/** Reconcile main process snapshots with renderer state */
export function reconcileTerminals(
  snapshots: TerminalSnapshot[],
  currentTerminals: Map<string, Terminal>
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
      isNew: existing?.isNew,
      createdAt: new Date(snapshot.createdAt)
    })
    outputs.set(snapshot.id, trimTerminalOutput(snapshot.output || ''))
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

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  outputs: new Map(),
  activeTerminalId: null,
  lastActiveByRepo: new Map(),
  syncing: false,

  removeTerminal: (id) => {
    set((state) => {
      const terminal = state.terminals.get(id)
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
        ? Array.from(newTerminals.keys())[0] || null
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
    const cleanupExit = window.api.onTerminalExit((terminalId: string) => {
      get().removeTerminal(terminalId)
    })

    terminalBridgeCleanup = () => {
      cleanupOutput()
      cleanupStatus()
      cleanupExit()
      terminalBridgeCleanup = null
    }
  },

  disconnectTerminalEventBridge: () => {
    if (!terminalBridgeCleanup) return
    terminalBridgeCleanup()
  },

  syncFromMain: async () => {
    if (get().syncing) return
    set({ syncing: true })

    try {
      const snapshots = await window.api.getTerminalSnapshots()
      const mainIds = new Set(snapshots.map(t => t.id))
      const { terminals, outputs } = reconcileTerminals(snapshots, get().terminals)

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
    }
  }
}))
