import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useKeyboardShortcuts, useNotificationListener } from '../../hooks'
import { ToastContainer } from '../Notifications'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import { BugTracker } from '../BugTracker'
import { Mascot } from '../icons'
import { SettingsModal } from '../Settings'
import { QuitDialog } from '../QuitDialog'
import { FocusExitControl } from '../FocusMode'
import { SetupScreen } from '../Setup'
import { FileViewerModal } from '../FileViewer'

export default function Layout() {
  useKeyboardShortcuts()
  useNotificationListener()
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSetupRequired, setIsSetupRequired] = useState(false)
  const { leftSidebarOpen, rightSidebarOpen, focusModeActive, activeView, loadUIState, showQuitDialog, setAiProvider } = useAppStore()
  const { loadRepos, loadAdditionalPaths } = useRepoStore()
  const syncFromMain = useTerminalStore((s) => s.syncFromMain)
  const connectTerminalEventBridge = useTerminalStore((s) => s.connectTerminalEventBridge)
  const disconnectTerminalEventBridge = useTerminalStore((s) => s.disconnectTerminalEventBridge)

  // Keep terminal IPC listeners alive regardless of panel mount state
  useEffect(() => {
    connectTerminalEventBridge()
    return () => {
      disconnectTerminalEventBridge()
    }
  }, [connectTerminalEventBridge, disconnectTerminalEventBridge])

  // Listen for quit confirmation request from main process
  useEffect(() => {
    const cleanup = window.api.onConfirmQuit((terminalCount: number) => {
      showQuitDialog(terminalCount)
    })
    return cleanup
  }, [showQuitDialog])

  // Listen for repo changes from file system watcher
  useEffect(() => {
    const cleanup = window.api.onReposChanged(() => {
      loadRepos()
      loadAdditionalPaths()
    })
    return cleanup
  }, [loadRepos, loadAdditionalPaths])

  useEffect(() => {
    const initialize = async () => {
      try {
        const firstRun = await window.api.isFirstRun()
        if (firstRun) {
          setIsSetupRequired(true)
          setIsInitializing(false)
          return
        }
        const config = await window.api.getConfig()
        setAiProvider(((config as Record<string, unknown>).aiProvider as 'claude' | 'codex') || 'claude')
        await Promise.all([
          loadUIState(),
          loadRepos(),
          loadAdditionalPaths()
        ])
        // Sync terminal state from main process on startup
        await syncFromMain()
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [loadUIState, loadRepos, loadAdditionalPaths, setAiProvider, syncFromMain])

  // Re-sync terminals when app regains focus (covers macOS sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromMain()
      }
    }

    const handleFocus = () => {
      syncFromMain()
    }

    // Listen for main process sync signal (powerMonitor resume)
    const cleanupSync = window.api.onTerminalSync(() => {
      syncFromMain()
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      cleanupSync()
    }
  }, [syncFromMain])

  const handleSetupComplete = async () => {
    setIsSetupRequired(false)
    setIsInitializing(true)
    try {
      const config = await window.api.getConfig()
      setAiProvider(((config as Record<string, unknown>).aiProvider as 'claude' | 'codex') || 'claude')
      await Promise.all([loadUIState(), loadRepos(), loadAdditionalPaths()])
      await syncFromMain()
    } catch (error) {
      console.error('Failed to initialize after setup:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  if (isSetupRequired) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Mascot variant="loading" size={80} className="loading-logo" />
          <div className="loading-title">Lumi</div>
          <div className="loading-status">Initializing...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <AnimatePresence>
        {!focusModeActive && (
          <motion.div
            key="header"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Header />
          </motion.div>
        )}
      </AnimatePresence>

      {focusModeActive && <FocusExitControl />}

      <div className="layout-body">
        <AnimatePresence mode="wait">
          {!focusModeActive && leftSidebarOpen && (
            <aside className="sidebar sidebar-left">
              <LeftSidebar />
            </aside>
          )}
        </AnimatePresence>

        <main className="main-content">
          {activeView === 'bugs' ? <BugTracker /> : <TerminalPanel />}
        </main>

        <AnimatePresence mode="wait">
          {!focusModeActive && rightSidebarOpen && (
            <aside className="sidebar sidebar-right">
              <RightSidebar />
            </aside>
          )}
        </AnimatePresence>
      </div>
      <SettingsModal />
      <QuitDialog />
      <ToastContainer />
      <FileViewerModal />
    </div>
  )
}
