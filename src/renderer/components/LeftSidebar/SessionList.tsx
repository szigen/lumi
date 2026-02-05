import { Layers } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { StatusDot } from '../icons'

export default function SessionList() {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <Layers size={16} />
        <h3>Sessions</h3>
        {repoTerminals.length > 0 && (
          <span className="section-header__count">{repoTerminals.length}</span>
        )}
      </div>

      {repoTerminals.length === 0 ? (
        <p className="session-empty">No active sessions</p>
      ) : (
        <div className="session-list">
          {repoTerminals.map((terminal) => (
            <div
              key={terminal.id}
              className={`session-item ${activeTerminalId === terminal.id ? 'session-item--active' : ''}`}
              onClick={() => setActiveTerminal(terminal.id)}
            >
              <StatusDot
                status={terminal.status === 'running' ? 'running' :
                        terminal.status === 'completed' ? 'completed' :
                        terminal.status === 'error' ? 'error' : 'idle'}
              />
              <span className="session-item__name">
                {terminal.task || terminal.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
