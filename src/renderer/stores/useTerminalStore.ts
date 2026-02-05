import { create } from 'zustand'
import type { Terminal } from '../../shared/types'

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null
  lastActiveByRepo: Map<string, string>

  addTerminal: (terminal: Terminal) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<Terminal>) => void
  appendOutput: (id: string, data: string) => void
  setActiveTerminal: (id: string | null) => void
  getTerminalsByRepo: (repoPath: string) => Terminal[]
  getTerminalCount: () => number
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  outputs: new Map(),
  activeTerminalId: null,
  lastActiveByRepo: new Map(),

  addTerminal: (terminal) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      newTerminals.set(terminal.id, terminal)
      const newOutputs = new Map(state.outputs)
      newOutputs.set(terminal.id, '')
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

      // lastActiveByRepo cleanup
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

  getTerminalCount: () => get().terminals.size
}))
