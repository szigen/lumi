import { useAppStore } from '../../stores/useAppStore'
import RepoTab from './RepoTab'
import RepoSelector from './RepoSelector'

export default function Header() {
  const {
    openTabs,
    activeTab,
    setActiveTab,
    closeTab,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore()

  return (
    <header className="h-12 border-b border-border-primary bg-bg-secondary flex items-center px-4 gap-4">
      <button
        onClick={toggleLeftSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Toggle sidebar"
      >
        ☰
      </button>

      <span className="font-semibold text-text-primary">AI Orchestrator</span>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {openTabs.map((tab) => (
          <RepoTab
            key={tab}
            name={tab}
            isActive={tab === activeTab}
            onClick={() => setActiveTab(tab)}
            onClose={() => closeTab(tab)}
          />
        ))}
        <RepoSelector />
      </div>

      <button
        onClick={toggleRightSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Toggle commits"
      >
        🌿
      </button>

      <button
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Settings"
      >
        ⚙
      </button>
    </header>
  )
}
