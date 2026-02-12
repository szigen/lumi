import { useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useRepoStore } from '../stores/useRepoStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { DEFAULT_CONFIG } from '../../shared/constants'

export function useKeyboardShortcuts() {
  const { openTabs, activeTab, setActiveTab, toggleLeftSidebar, toggleRightSidebar, openSettings, toggleFocusMode } = useAppStore()
  const { repos, getRepoByName } = useRepoStore()
  const { addTerminal, getTerminalCount, activeTerminalId, removeTerminal, terminals, setActiveTerminal } = useTerminalStore()

  // Handle new terminal action
  const handleNewTerminal = useCallback(() => {
    const activeRepo = activeTab ? getRepoByName(activeTab) : null
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) return

    window.api.spawnTerminal(activeRepo.path).then((result) => {
      if (result) {
        addTerminal({
          id: result.id,
          name: result.name,
          repoPath: activeRepo.path,
          status: 'running',
          isNew: result.isNew,
          createdAt: new Date()
        })
        window.api.writeTerminal(result.id, 'claude\r')
      }
    })
  }, [activeTab, getRepoByName, getTerminalCount, addTerminal])

  // Handle close terminal action (or close repo tab if no terminal)
  const handleCloseTerminal = useCallback(() => {
    if (!activeTerminalId) {
      const { activeTab, closeTab } = useAppStore.getState()
      if (activeTab) {
        closeTab(activeTab)
      }
      return
    }
    window.api.killTerminal(activeTerminalId).then(() => {
      removeTerminal(activeTerminalId)
    })
  }, [activeTerminalId, removeTerminal])

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
        case 'toggle-pty-inspector':
          window.dispatchEvent(new CustomEvent('toggle-pty-inspector'))
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
    const isMeta = e.metaKey || e.ctrlKey

    // Cmd+Shift+F: Toggle focus mode
    if (isMeta && e.shiftKey && e.key === 'f') {
      e.preventDefault()
      toggleFocusMode()
      return
    }

    // Cmd+1-9: Switch to tab N
    if (isMeta && !e.shiftKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault()
      const tabIndex = parseInt(e.key, 10) - 1
      if (openTabs[tabIndex]) {
        setActiveTab(openTabs[tabIndex])
      }
      return
    }

    // Cmd+Shift+Left: Previous terminal
    if (isMeta && e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateTerminal('prev')
      return
    }

    // Cmd+Shift+Right: Next terminal
    if (isMeta && e.shiftKey && e.key === 'ArrowRight') {
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
