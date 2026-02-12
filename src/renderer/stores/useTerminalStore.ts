import { create } from 'zustand'
import type { Terminal, TerminalInfo } from '../../shared/types'

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null
  lastActiveByRepo: Map<string, string>
  syncing: boolean

  addTerminal: (terminal: Terminal) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<Terminal>) => void
  appendOutput: (id: string, data: string) => void
  setActiveTerminal: (id: string | null) => void
  getTerminalsByRepo: (repoPath: string) => Terminal[]
  getTerminalCount: () => number
  syncFromMain: () => Promise<void>
}

/** Reconcile main process terminal list with renderer state */
async function reconcileTerminals(
  mainTerminals: TerminalInfo[],
  currentTerminals: Map<string, Terminal>,
  currentOutputs: Map<string, string>
) {
  const terminals = new Map<string, Terminal>()
  const outputs = new Map<string, string>()

  for (const mt of mainTerminals) {
    const existing = currentTerminals.get(mt.id)
    if (existing) {
      terminals.set(mt.id, existing)
      outputs.set(mt.id, currentOutputs.get(mt.id) || '')
    } else {
      const buffer = await window.api.getTerminalBuffer(mt.id)
      terminals.set(mt.id, {
        id: mt.id,
        name: mt.name,
        repoPath: mt.repoPath,
        status: 'idle',
        task: mt.task,
        createdAt: new Date(mt.createdAt)
      })
      outputs.set(mt.id, buffer || '')
    }
  }

  return { terminals, outputs }
}

/** Pick the active terminal: keep current if still valid, otherwise pick first available */
function resolveActiveTerminal(
  currentActive: string | null,
  validIds: Set<string>,
  terminals: Map<string, Terminal>
): string | null {
  if (currentActive && validIds.has(currentActive)) return currentActive
  return terminals.size > 0 ? terminals.keys().next().value ?? null : null
}

/** Rebuild per-repo last-active map, preserving valid previous selections */
function rebuildLastActiveByRepo(
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

  addTerminal: (terminal) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      newTerminals.set(terminal.id, terminal)
      const newOutputs = new Map(state.outputs)
      if (!newOutputs.has(terminal.id)) {
        newOutputs.set(terminal.id, '')
      }
      return { terminals: newTerminals, outputs: newOutputs, activeTerminalId: terminal.id }
    })
  },

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
      newOutputs.set(id, current + data)
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

  syncFromMain: async () => {
    if (get().syncing) return
    set({ syncing: true })

    try {
      const mainTerminals = await window.api.listTerminals()
      const mainIds = new Set(mainTerminals.map(t => t.id))

      const { terminals, outputs } = await reconcileTerminals(
        mainTerminals,
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
    }
  }
}))
