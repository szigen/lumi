import { create } from 'zustand'
import type { Terminal } from '../../shared/types'

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null

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
      const newTerminals = new Map(state.terminals)
      newTerminals.delete(id)
      const newOutputs = new Map(state.outputs)
      newOutputs.delete(id)
      const newActive = state.activeTerminalId === id
        ? Array.from(newTerminals.keys())[0] || null
        : state.activeTerminalId
      return { terminals: newTerminals, outputs: newOutputs, activeTerminalId: newActive }
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

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  getTerminalsByRepo: (repoPath) => {
    return Array.from(get().terminals.values()).filter((t) => t.repoPath === repoPath)
  },

  getTerminalCount: () => get().terminals.size
}))
