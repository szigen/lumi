import { Menu, GitBranch, Settings } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'
import { Logo } from '../icons'
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
    <header className="header">
      <div className="header-left">
        <IconButton
          icon={<Menu size={18} />}
          onClick={toggleLeftSidebar}
          tooltip="Toggle sidebar"
        />
        <Logo size={22} animated />
        <span className="app-title">AI Orchestrator</span>
      </div>

      <div className="header-center">
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

      <div className="header-right">
        <IconButton
          icon={<GitBranch size={18} />}
          onClick={toggleRightSidebar}
          tooltip="Toggle commits"
        />
        <IconButton
          icon={<Settings size={18} />}
          tooltip="Settings"
        />
      </div>
    </header>
  )
}
