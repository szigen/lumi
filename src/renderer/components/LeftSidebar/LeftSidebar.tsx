import { Bug } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { useBugStore } from '../../stores/useBugStore'
import CollectionProgress from './CollectionProgress'
import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  const { activeView, toggleBugView, activeTab, setActiveView } = useAppStore()
  const { getRepoByName } = useRepoStore()
  const bugs = useBugStore((s) => s.bugs)

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const openBugCount = bugs.filter(b => b.status === 'open').length

  const handleSessionClick = () => {
    if (activeView === 'bugs') {
      setActiveView('terminals')
    }
  }

  return (
    <div className="left-sidebar">
      <CollectionProgress />
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
          {openBugCount > 0 && (
            <span className="known-bugs-btn__badge">{openBugCount}</span>
          )}
        </button>
      </div>
      <ProjectContext />
      <QuickActions />
    </div>
  )
}
