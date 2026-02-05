import { useState, useEffect } from 'react'
import {
  Zap, Terminal, TestTube, Package, GitBranch, FileEdit, Plus
} from 'lucide-react'
import type { Action } from '../../../shared/action-types'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

const ICON_MAP: Record<string, React.ReactNode> = {
  Terminal: <Terminal size={16} />,
  TestTube: <TestTube size={16} />,
  Package: <Package size={16} />,
  GitBranch: <GitBranch size={16} />,
  FileEdit: <FileEdit size={16} />,
  Plus: <Plus size={16} />,
  Zap: <Zap size={16} />,
}

export default function QuickActions() {
  const { addTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()
  const [actions, setActions] = useState<Action[]>([])

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    let cancelled = false
    window.api.getActions(activeRepo?.path).then((list) => {
      if (!cancelled) setActions(list as Action[])
    })
    return () => { cancelled = true }
  }, [activeRepo?.path])

  // Listen for action file changes
  useEffect(() => {
    const cleanup = window.api.onActionsChanged(() => {
      window.api.getActions(activeRepo?.path).then((list) => {
        setActions(list as Action[])
      })
    })
    return cleanup
  }, [activeRepo?.path])

  // Load project actions when active repo changes
  useEffect(() => {
    if (activeRepo?.path) {
      window.api.loadProjectActions(activeRepo.path)
    }
  }, [activeRepo?.path])

  const handleAction = async (action: Action) => {
    if (!activeRepo) return

    const terminalId = await window.api.executeAction(action.id, activeRepo.path)
    if (terminalId) {
      addTerminal({
        id: terminalId,
        repoPath: activeRepo.path,
        status: 'running',
        task: action.label,
        createdAt: new Date()
      })
    }
  }

  const userActions = actions.filter((a) => a.scope === 'user')
  const projectActions = actions.filter((a) => a.scope === 'project')

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <Zap size={16} />
        <h3>Quick Actions</h3>
      </div>

      <div className="quick-actions">
        {userActions.map((action) => (
          <button
            key={action.id}
            className="action-btn"
            onClick={() => handleAction(action)}
            disabled={!activeRepo}
            title={action.label}
          >
            {ICON_MAP[action.icon] || <Zap size={16} />}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {projectActions.length > 0 && (
        <>
          <div className="action-divider" />
          <div className="quick-actions">
            {projectActions.map((action) => (
              <button
                key={action.id}
                className="action-btn"
                onClick={() => handleAction(action)}
                disabled={!activeRepo}
                title={`${action.label} (project)`}
              >
                {ICON_MAP[action.icon] || <Zap size={16} />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
