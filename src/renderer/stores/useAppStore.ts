import { create } from 'zustand'
import type { UIState } from '../../shared/types'
import { DEFAULT_UI_STATE } from '../../shared/constants'

interface AppState extends UIState {
  setActiveTab: (tab: string | null) => void
  openTab: (repoName: string) => void
  closeTab: (repoName: string) => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  loadUIState: () => Promise<void>
  saveUIState: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ...DEFAULT_UI_STATE,

  setActiveTab: (tab) => {
    set({ activeTab: tab })
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
    set({ openTabs: newTabs, activeTab: newActive })
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

  loadUIState: async () => {
    try {
      const state = await window.api.getUIState()
      if (state) {
        set(state)
      }
    } catch (error) {
      console.error('Failed to load UI state:', error)
    }
  },

  saveUIState: async () => {
    const { openTabs, activeTab, leftSidebarOpen, rightSidebarOpen } = get()
    try {
      await window.api.setUIState({ openTabs, activeTab, leftSidebarOpen, rightSidebarOpen })
    } catch (error) {
      console.error('Failed to save UI state:', error)
    }
  }
}))
