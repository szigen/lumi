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
    <header>
      <div>
        <IconButton
          icon={<Menu />}
          onClick={toggleLeftSidebar}
          tooltip="Toggle sidebar"
        />
        <Logo size={22} />
        <span>AI Orchestrator</span>
      </div>

      <div>
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

      <div>
        <IconButton
          icon={<GitBranch />}
          onClick={toggleRightSidebar}
          tooltip="Toggle commits"
        />
        <IconButton
          icon={<Settings />}
          tooltip="Settings"
        />
      </div>
    </header>
  )
}
