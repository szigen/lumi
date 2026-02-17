import { Bug } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  const { activeView, toggleBugView, activeTab, setActiveView } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  const handleSessionClick = () => {
    if (activeView === 'bugs') {
      setActiveView('terminals')
    }
  }

  return (
    <div className="left-sidebar">
      <div onClick={handleSessionClick}>
        <SessionList />
      </div>
      <div className="sidebar-section">
        <button
          className={`known-bugs-btn ${activeView === 'bugs' ? 'known-bugs-btn--active' : ''}`}
          onClick={toggleBugView}
          disabled={!activeRepo}
        >
          <Bug size={16} />
          <span>Known Bugs</span>
        </button>
      </div>
      <ProjectContext />
      <QuickActions />
    </div>
  )
}
