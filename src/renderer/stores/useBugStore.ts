import { create } from 'zustand'
import type { Bug, Fix, BugFilter } from '../../shared/bug-types'

interface BugState {
  bugs: Bug[]
  selectedBugId: string | null
  filter: BugFilter
  loading: boolean
  claudeLoading: boolean
  fixTerminalId: string | null
  applyingFixId: string | null

  loadBugs: (repoPath: string) => Promise<void>
  createBug: (repoPath: string, title: string, description: string) => Promise<void>
  updateBug: (repoPath: string, bugId: string, updates: Partial<Bug>) => Promise<void>
  deleteBug: (repoPath: string, bugId: string) => Promise<void>
  selectBug: (bugId: string | null) => void
  setFilter: (filter: BugFilter) => void

  addFix: (repoPath: string, bugId: string, fix: Omit<Fix, 'id'>) => Promise<void>
  updateFix: (repoPath: string, bugId: string, fixId: string, updates: Partial<Fix>) => Promise<void>
  askClaude: (repoPath: string, bugId: string, userMessage: string) => Promise<void>
  applyFix: (repoPath: string, bugId: string, fixId: string) => Promise<void>

  markFixResult: (repoPath: string, bugId: string, fixId: string, success: boolean, note?: string) => Promise<void>
  clearFixTerminal: () => void

  filteredBugs: () => Bug[]
  selectedBug: () => Bug | undefined
}

export const useBugStore = create<BugState>((set, get) => ({
  bugs: [],
  selectedBugId: null,
  filter: 'open',
  loading: false,
  claudeLoading: false,
  fixTerminalId: null,
  applyingFixId: null,

  loadBugs: async (repoPath) => {
    set({ loading: true })
    try {
      const bugs = await window.api.listBugs(repoPath) as Bug[]
      set({ bugs, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createBug: async (repoPath, title, description) => {
    const bug = await window.api.createBug(repoPath, title, description) as Bug
    set((s) => ({ bugs: [...s.bugs, bug], selectedBugId: bug.id }))
  },

  updateBug: async (repoPath, bugId, updates) => {
    const updated = await window.api.updateBug(repoPath, bugId, updates) as Bug
    if (updated) {
      set((s) => ({ bugs: s.bugs.map(b => b.id === bugId ? updated : b) }))
    }
  },

  deleteBug: async (repoPath, bugId) => {
    await window.api.deleteBug(repoPath, bugId)
    set((s) => ({
      bugs: s.bugs.filter(b => b.id !== bugId),
      selectedBugId: s.selectedBugId === bugId ? null : s.selectedBugId
    }))
  },

  selectBug: (bugId) => set({ selectedBugId: bugId, fixTerminalId: null, applyingFixId: null }),
  setFilter: (filter) => set({ filter }),

  addFix: async (repoPath, bugId, fix) => {
    const newFix = await window.api.addFix(repoPath, bugId, fix as Record<string, unknown>) as Fix
    if (newFix) {
      set((s) => ({
        bugs: s.bugs.map(b => b.id === bugId ? { ...b, fixes: [...b.fixes, newFix] } : b)
      }))
    }
  },

  updateFix: async (repoPath, bugId, fixId, updates) => {
    const updated = await window.api.updateFix(repoPath, bugId, fixId, updates as Record<string, unknown>) as Fix
    if (updated) {
      set((s) => ({
        bugs: s.bugs.map(b =>
          b.id === bugId
            ? { ...b, fixes: b.fixes.map(f => f.id === fixId ? updated : f) }
            : b
        )
      }))
    }
  },

  askClaude: async (repoPath, bugId, userMessage) => {
    const bug = get().bugs.find(b => b.id === bugId)
    if (!bug) return

    set({ claudeLoading: true })

    const failedFixes = bug.fixes
      .filter(f => f.status === 'failed')
      .map(f => `- ${f.summary} → FAILED${f.failedNote ? ': ' + f.failedNote : ''}`)
      .join('\n')

    const prompt = [
      `Bug: ${bug.title}`,
      `Description: ${bug.description}`,
      failedFixes ? `\nPreviously tried fixes that did NOT work:\n${failedFixes}` : '',
      `\nUser's question: ${userMessage}`,
      `\nSuggest a fix approach. Be specific about what files to change and how. Keep your response concise.`
    ].filter(Boolean).join('\n')

    try {
      const response = await window.api.askClaude(repoPath, prompt)
      await get().addFix(repoPath, bugId, {
        summary: response.slice(0, 120),
        detail: response,
        status: 'suggested',
        suggestedBy: 'claude'
      })
    } catch (error) {
      console.error('Claude ask failed:', error)
    } finally {
      set({ claudeLoading: false })
    }
  },

  applyFix: async (repoPath, bugId, fixId) => {
    const bug = get().bugs.find(b => b.id === bugId)
    const fix = bug?.fixes.find(f => f.id === fixId)
    if (!bug || !fix) return

    await get().updateFix(repoPath, bugId, fixId, { status: 'applying', appliedAt: new Date().toISOString() })

    const prompt = [
      `Fix this bug in the codebase.`,
      `Bug: ${bug.title}`,
      `Description: ${bug.description}`,
      `\nApproach to implement: ${fix.detail}`,
    ].join('\n')

    const result = await window.api.applyFix(repoPath, prompt)
    if (result) {
      set({ fixTerminalId: result.id, applyingFixId: fixId })
    }
  },

  markFixResult: async (repoPath, bugId, fixId, success, note) => {
    if (success) {
      await get().updateFix(repoPath, bugId, fixId, { status: 'success' })
      await get().updateBug(repoPath, bugId, { status: 'resolved' })
    } else {
      await get().updateFix(repoPath, bugId, fixId, { status: 'failed', failedNote: note })
    }
    set({ fixTerminalId: null, applyingFixId: null })
  },

  clearFixTerminal: () => set({ fixTerminalId: null, applyingFixId: null }),

  filteredBugs: () => {
    const { bugs, filter } = get()
    if (filter === 'all') return bugs
    return bugs.filter(b => b.status === filter)
  },

  selectedBug: () => {
    const { bugs, selectedBugId } = get()
    return bugs.find(b => b.id === selectedBugId)
  }
}))
