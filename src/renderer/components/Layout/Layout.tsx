import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import LoadingSpinner from '../common/LoadingSpinner'

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
      <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-text-secondary">Initializing AI Orchestrator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {leftSidebarOpen && (
          <aside className="w-64 border-r border-border-primary bg-bg-secondary flex-shrink-0">
            <LeftSidebar />
          </aside>
        )}

        <main className="flex-1 overflow-hidden">
          <TerminalPanel />
        </main>

        {rightSidebarOpen && (
          <aside className="w-72 border-l border-border-primary bg-bg-secondary flex-shrink-0">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
