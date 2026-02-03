import { useAppStore } from '../../stores/useAppStore'

export default function Header() {
  const { toggleLeftSidebar, toggleRightSidebar } = useAppStore()

  return (
    <header className="h-12 border-b border-border-primary bg-bg-secondary flex items-center px-4 gap-4">
      <button
        onClick={toggleLeftSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
      >
        ☰
      </button>

      <span className="font-semibold text-text-primary">AI Orchestrator</span>

      <div className="flex-1 flex items-center gap-2">
        {/* Repo tabs will go here */}
      </div>

      <button
        onClick={toggleRightSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
      >
        🌿
      </button>

      <button className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary">
        ⚙
      </button>
    </header>
  )
}
