import { useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useRepoStore } from '../stores/useRepoStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { DEFAULT_CONFIG } from '../../shared/constants'

export function useKeyboardShortcuts() {
  const { openTabs, activeTab, setActiveTab, toggleLeftSidebar, toggleRightSidebar, openSettings } = useAppStore()
  const { repos, getRepoByName } = useRepoStore()
  const { addTerminal, getTerminalCount, activeTerminalId, removeTerminal, terminals, setActiveTerminal } = useTerminalStore()

  // Handle new terminal action
  const handleNewTerminal = useCallback(() => {
    const activeRepo = activeTab ? getRepoByName(activeTab) : null
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) return

    window.api.spawnTerminal(activeRepo.path).then((terminalId) => {
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          createdAt: new Date()
        })
      }
    })
  }, [activeTab, getRepoByName, getTerminalCount, addTerminal])

  // Handle close terminal action
  const handleCloseTerminal = useCallback(() => {
    if (!activeTerminalId) return
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
      }
    })
    return cleanup
  }, [handleNewTerminal, handleCloseTerminal, toggleLeftSidebar, toggleRightSidebar, openSettings])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey

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
      const terminalIds = Array.from(terminals.keys())
      if (terminalIds.length === 0) return
      const currentIndex = activeTerminalId ? terminalIds.indexOf(activeTerminalId) : 0
      const prevIndex = (currentIndex - 1 + terminalIds.length) % terminalIds.length
      const newTerminalId = terminalIds[prevIndex]
      setActiveTerminal(newTerminalId)

      const newTerminal = terminals.get(newTerminalId)
      if (newTerminal) {
        const repoName = repos.find(r => r.path === newTerminal.repoPath)?.name
        if (repoName && repoName !== activeTab) {
          setActiveTab(repoName)
        }
      }
      return
    }

    // Cmd+Shift+Right: Next terminal
    if (isMeta && e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault()
      const terminalIds = Array.from(terminals.keys())
      if (terminalIds.length === 0) return
      const currentIndex = activeTerminalId ? terminalIds.indexOf(activeTerminalId) : -1
      const nextIndex = (currentIndex + 1) % terminalIds.length
      const newTerminalId = terminalIds[nextIndex]
      setActiveTerminal(newTerminalId)

      const newTerminal = terminals.get(newTerminalId)
      if (newTerminal) {
        const repoName = repos.find(r => r.path === newTerminal.repoPath)?.name
        if (repoName && repoName !== activeTab) {
          setActiveTab(repoName)
        }
      }
      return
    }

  }, [openTabs, setActiveTab, terminals, setActiveTerminal, activeTerminalId, repos, activeTab])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
