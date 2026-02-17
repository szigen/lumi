import { useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useRepoStore } from '../stores/useRepoStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { DEFAULT_CONFIG } from '../../shared/constants'
import { getProviderLaunchCommand } from '../../shared/ai-provider'

export function useKeyboardShortcuts() {
  const { openTabs, activeTab, setActiveTab, toggleLeftSidebar, toggleRightSidebar, openSettings, toggleFocusMode, aiProvider } = useAppStore()
  const { repos, getRepoByName } = useRepoStore()
  const { getTerminalCount, activeTerminalId, terminals, setActiveTerminal, syncFromMain } = useTerminalStore()

  // Handle new terminal action
  const handleNewTerminal = useCallback(() => {
    const activeRepo = activeTab ? getRepoByName(activeTab) : null
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) return

    window.api.spawnTerminal(activeRepo.path).then(async (result) => {
      if (!result) return
      await window.api.writeTerminal(result.id, getProviderLaunchCommand(aiProvider))
      await syncFromMain()
      useTerminalStore.getState().setActiveTerminal(result.id)
    }).catch((error) => {
      console.error('Failed to spawn terminal from shortcut:', error)
    })
  }, [activeTab, aiProvider, getRepoByName, getTerminalCount, syncFromMain])

  // Handle close terminal action (or close repo tab if no terminal)
  const handleCloseTerminal = useCallback(() => {
    if (!activeTerminalId) {
      const { activeTab, closeTab } = useAppStore.getState()
      if (activeTab) {
        closeTab(activeTab)
      }
      return
    }
    const closingId = activeTerminalId
    window.api.killTerminal(closingId).then(async () => {
      useTerminalStore.getState().removeTerminal(closingId)
      await syncFromMain()
    }).catch((error) => {
      console.error('Failed to close terminal from shortcut:', error)
    })
  }, [activeTerminalId, syncFromMain])

  // Listen for menu shortcuts from main process
  useEffect(() => {
    const cleanup = window.api.onShortcut((action: string) => {
      switch (action) {
        case 'new-terminal':
          handleNewTerminal()
          break
        case 'close-terminal':
          handleCloseTerminal()
          break
        case 'toggle-left-sidebar':
          toggleLeftSidebar()
          break
        case 'toggle-right-sidebar':
          toggleRightSidebar()
          break
        case 'open-repo-selector':
          window.dispatchEvent(new CustomEvent('open-repo-selector'))
          break
        case 'open-settings':
          openSettings()
          break
        case 'toggle-focus-mode':
          useAppStore.getState().toggleFocusMode()
          break
      }
    })
    return cleanup
  }, [handleNewTerminal, handleCloseTerminal, toggleLeftSidebar, toggleRightSidebar, openSettings])

  const navigateTerminal = useCallback((direction: 'prev' | 'next') => {
    const terminalIds = Array.from(terminals.keys())
    if (terminalIds.length === 0) return
    const currentIndex = activeTerminalId
      ? terminalIds.indexOf(activeTerminalId)
      : (direction === 'next' ? -1 : 0)
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % terminalIds.length
      : (currentIndex - 1 + terminalIds.length) % terminalIds.length
    const newTerminalId = terminalIds[newIndex]
    setActiveTerminal(newTerminalId)

    const newTerminal = terminals.get(newTerminalId)
    if (newTerminal) {
      const repoName = repos.find(r => r.path === newTerminal.repoPath)?.name
      if (repoName && repoName !== activeTab) {
        setActiveTab(repoName)
      }
    }
  }, [terminals, activeTerminalId, setActiveTerminal, repos, activeTab, setActiveTab])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = window.api.platform === 'darwin' ? e.metaKey : (e.ctrlKey && e.shiftKey)

    // Focus mode: macOS = Cmd+Shift+F, Win/Linux = Ctrl+Shift+F
    if (isMod && e.shiftKey && e.key === 'f') {
      e.preventDefault()
      toggleFocusMode()
      return
    }

    // Switch to tab N: macOS = Cmd+1-9, Win/Linux = Ctrl+Shift+1-9
    const isTabSwitch = window.api.platform === 'darwin'
      ? (e.metaKey && !e.shiftKey && e.key >= '1' && e.key <= '9')
      : (e.ctrlKey && e.shiftKey && e.code >= 'Digit1' && e.code <= 'Digit9')

    if (isTabSwitch) {
      e.preventDefault()
      const tabIndex = window.api.platform === 'darwin'
        ? parseInt(e.key, 10) - 1
        : parseInt(e.code.replace('Digit', ''), 10) - 1
      if (openTabs[tabIndex]) {
        setActiveTab(openTabs[tabIndex])
      }
      return
    }

    // Previous terminal: macOS = Cmd+Shift+Left, Win/Linux = Ctrl+Shift+Left
    if (isMod && e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateTerminal('prev')
      return
    }

    // Next terminal: macOS = Cmd+Shift+Right, Win/Linux = Ctrl+Shift+Right
    if (isMod && e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault()
      navigateTerminal('next')
      return
    }

  }, [openTabs, setActiveTab, navigateTerminal, toggleFocusMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
