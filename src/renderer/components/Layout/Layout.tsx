import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { useKeyboardShortcuts } from '../../hooks'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import { Logo } from '../icons'

export default function Layout() {
  useKeyboardShortcuts()
  const [isInitializing, setIsInitializing] = useState(true)
  const { leftSidebarOpen, rightSidebarOpen, loadUIState } = useAppStore()
  const { loadRepos } = useRepoStore()

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          loadUIState(),
          loadRepos()
        ])
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [loadUIState, loadRepos])

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Logo size={48} className="loading-logo" />
          <div className="loading-title">AI Orchestrator</div>
          <div className="loading-status">Initializing...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <Header />
      <div className="layout-body">
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <aside className="sidebar sidebar-left">
              <LeftSidebar />
            </aside>
          )}
        </AnimatePresence>

        <main className="main-content">
          <TerminalPanel />
        </main>

        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <aside className="sidebar sidebar-right">
              <RightSidebar />
            </aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
