import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  return (
    <div className="h-full flex flex-col p-2 overflow-y-auto">
      <SessionList />
      <ProjectContext />
      <QuickActions />
    </div>
  )
}
