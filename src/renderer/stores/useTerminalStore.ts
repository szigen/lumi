import { create } from 'zustand'
import type { Terminal } from '../../shared/types'

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
      const currentTerminals = get().terminals
      const currentOutputs = get().outputs

      const newTerminals = new Map<string, Terminal>()
      const newOutputs = new Map<string, string>()

      // Add/update terminals that exist in main
      for (const mt of mainTerminals) {
        const existing = currentTerminals.get(mt.id)
        if (existing) {
          // Keep existing renderer-side state (status, isNew, etc.)
          newTerminals.set(mt.id, existing)
          newOutputs.set(mt.id, currentOutputs.get(mt.id) || '')
        } else {
          // Terminal exists in main but not in renderer — reconnect
          const buffer = await window.api.getTerminalBuffer(mt.id)
          newTerminals.set(mt.id, {
            id: mt.id,
            name: mt.name,
            repoPath: mt.repoPath,
            status: 'running',
            task: mt.task,
            createdAt: new Date(mt.createdAt)
          })
          newOutputs.set(mt.id, buffer || '')
        }
      }

      // Terminals that exist in renderer but not in main are stale — remove them

      // Fix active terminal if it was removed
      const currentActive = get().activeTerminalId
      const newActive = currentActive && mainIds.has(currentActive)
        ? currentActive
        : (newTerminals.size > 0 ? newTerminals.keys().next().value ?? null : null)

      // Rebuild lastActiveByRepo
      const newLastActive = new Map<string, string>()
      for (const [id, t] of newTerminals) {
        if (!newLastActive.has(t.repoPath)) {
          newLastActive.set(t.repoPath, id)
        }
      }
      // Preserve current active selections where still valid
      for (const [repo, termId] of get().lastActiveByRepo) {
        if (newTerminals.has(termId)) {
          newLastActive.set(repo, termId)
        }
      }

      set({
        terminals: newTerminals,
        outputs: newOutputs,
        activeTerminalId: newActive,
        lastActiveByRepo: newLastActive
      })
    } finally {
      set({ syncing: false })
    }
  }
}))
