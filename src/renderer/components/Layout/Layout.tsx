import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import { Logo } from '../icons'

export default function Layout() {
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
      <div>
        <Logo size={48} />
        <div>AI Orchestrator</div>
        <div>Initializing...</div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <div>
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <aside>
              <LeftSidebar />
            </aside>
          )}
        </AnimatePresence>

        <main>
          <TerminalPanel />
        </main>

        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <aside>
              <RightSidebar />
            </aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
