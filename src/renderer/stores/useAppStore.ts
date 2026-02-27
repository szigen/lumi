import { create } from 'zustand'
import type { UIState, FileViewerState, GridLayout } from '../../shared/types'
import { DEFAULT_UI_STATE } from '../../shared/constants'
import type { AIProvider } from '../../shared/ai-provider'
import { useTerminalStore } from './useTerminalStore'
import { useRepoStore } from './useRepoStore'

/** Stable reference for the default grid layout — prevents infinite re-render
 *  loops caused by useSyncExternalStore detecting new object references. */
const DEFAULT_GRID_LAYOUT: GridLayout = { mode: 'auto', count: 2 }

interface AppState extends UIState {
  settingsOpen: boolean
  quitDialogOpen: boolean
  quitTerminalCount: number
  aiProvider: AIProvider
  focusModeActive: boolean
  collapsedGroups: Set<string>
  enterFocusMode: () => void
  exitFocusMode: () => void
  toggleFocusMode: () => void
  openSettings: () => void
  closeSettings: () => void
  showQuitDialog: (count: number) => void
  hideQuitDialog: () => void
  setAiProvider: (provider: AIProvider) => void
  setActiveTab: (tab: string | null) => void
  openTab: (repoName: string) => void
  closeTab: (repoName: string) => void
  setProjectGridLayout: (repoPath: string, layout: GridLayout) => void
  getActiveGridLayout: () => GridLayout
  setActiveView: (view: 'terminals' | 'bugs') => void
  toggleBugView: () => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  toggleGroupCollapse: (groupKey: string) => void
  fileViewer: FileViewerState | null
  openFileViewer: (state: FileViewerState) => void
  closeFileViewer: () => void
  loadUIState: () => Promise<void>
  saveUIState: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ...DEFAULT_UI_STATE,
  settingsOpen: false,
  quitDialogOpen: false,
  quitTerminalCount: 0,
  aiProvider: 'claude',
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  showQuitDialog: (count) => set({ quitDialogOpen: true, quitTerminalCount: count }),
  hideQuitDialog: () => set({ quitDialogOpen: false, quitTerminalCount: 0 }),
  setAiProvider: (provider) => set({ aiProvider: provider }),
  focusModeActive: false,
  collapsedGroups: new Set<string>(),
  fileViewer: null,
  openFileViewer: (state) => set({ fileViewer: { ...state, isOpen: true } }),
  closeFileViewer: () => set({ fileViewer: null }),
  enterFocusMode: () => set({ focusModeActive: true }),
  exitFocusMode: () => set({ focusModeActive: false }),
  toggleFocusMode: () => set((state) => ({ focusModeActive: !state.focusModeActive })),

  setActiveTab: (tab) => {
    set({ activeTab: tab })

    if (tab) {
      const terminalState = useTerminalStore.getState()
      const { lastActiveByRepo, getTerminalsByRepo, setActiveTerminal } = terminalState

      const repo = useRepoStore.getState().getRepoByName(tab)
      if (repo) {
        const repoTerminals = getTerminalsByRepo(repo.path)
        const lastTerminalId = lastActiveByRepo.get(repo.path)

        if (lastTerminalId && repoTerminals.some(t => t.id === lastTerminalId)) {
          setActiveTerminal(lastTerminalId)
        } else if (repoTerminals.length > 0) {
          setActiveTerminal(repoTerminals[0].id)
        } else {
          setActiveTerminal(null)
        }
      }
    }

    get().saveUIState()
  },

  openTab: (repoName) => {
    const { openTabs } = get()
    if (!openTabs.includes(repoName)) {
      set({ openTabs: [...openTabs, repoName], activeTab: repoName })
      get().saveUIState()
    } else {
      set({ activeTab: repoName })
    }
  },

  closeTab: (repoName) => {
    const { openTabs, activeTab } = get()
    const newTabs = openTabs.filter((t) => t !== repoName)
    const newActive = activeTab === repoName
      ? newTabs[newTabs.length - 1] || null
      : activeTab

    const repo = useRepoStore.getState().getRepoByName(repoName)
    if (repo) {
      const terminalState = useTerminalStore.getState()
      const repoTerminals = terminalState.getTerminalsByRepo(repo.path)

      Promise.all(repoTerminals.map((terminal) => window.api.killTerminal(terminal.id)))
        .catch((err) => console.error('Failed to kill terminals:', err))
        .finally(() => {
          terminalState.syncFromMain()
        })

      window.api.unwatchFileTree(repo.path)
    }

    set({ openTabs: newTabs, activeTab: newActive })
    get().saveUIState()
  },

  setProjectGridLayout: (repoPath, layout) => {
    set((state) => ({
      projectGridLayouts: { ...state.projectGridLayouts, [repoPath]: layout }
    }))
    get().saveUIState()
  },

  getActiveGridLayout: () => {
    const { activeTab, projectGridLayouts } = get()
    if (!activeTab) return DEFAULT_GRID_LAYOUT
    const repo = useRepoStore.getState().getRepoByName(activeTab)
    if (!repo) return DEFAULT_GRID_LAYOUT
    return projectGridLayouts[repo.path] ?? DEFAULT_GRID_LAYOUT
  },

  setActiveView: (view) => {
    set({ activeView: view })
    get().saveUIState()
  },
  toggleBugView: () => {
    set((s) => ({ activeView: s.activeView === 'bugs' ? 'terminals' : 'bugs' }))
    get().saveUIState()
  },

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }))
    get().saveUIState()
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }))
    get().saveUIState()
  },

  toggleGroupCollapse: (groupKey: string) => {
    set((state) => {
      const next = new Set(state.collapsedGroups)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return { collapsedGroups: next }
    })
  },

  loadUIState: async () => {
    try {
      const state = await window.api.getUIState()
      if (state) {
        // Migrate legacy gridColumns to projectGridLayouts
        const rawState = state as UIState & { gridColumns?: number | 'auto' }
        if (rawState.gridColumns !== undefined && !rawState.projectGridLayouts) {
          const layout: GridLayout = rawState.gridColumns === 'auto'
            ? { mode: 'auto', count: 2 }
            : { mode: 'columns', count: rawState.gridColumns }
          const projectGridLayouts: Record<string, GridLayout> = {}
          const repos = useRepoStore.getState().repos
          for (const tab of rawState.openTabs ?? []) {
            const repo = repos.find(r => r.name === tab)
            if (repo) projectGridLayouts[repo.path] = layout
          }
          set({ ...state, projectGridLayouts, activeView: 'terminals' })
        } else {
          set({ ...state, activeView: 'terminals' })
        }
      }
    } catch (error) {
      console.error('Failed to load UI state:', error)
    }
  },

  saveUIState: async () => {
    const { openTabs, activeTab, leftSidebarOpen, rightSidebarOpen, projectGridLayouts, activeView } = get()
    try {
      await window.api.setUIState({ openTabs, activeTab, leftSidebarOpen, rightSidebarOpen, projectGridLayouts, activeView })
    } catch (error) {
      console.error('Failed to save UI state:', error)
    }
  }
}))
