import CollectionProgress from './CollectionProgress'
import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  return (
    <div className="left-sidebar">
      <CollectionProgress />
      <SessionList />
      <ProjectContext />
      <QuickActions />
    </div>
  )
}
