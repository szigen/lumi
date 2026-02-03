import { useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'

export default function Layout() {
  const { leftSidebarOpen, rightSidebarOpen, loadUIState } = useAppStore()

  useEffect(() => {
    loadUIState()
  }, [loadUIState])

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
