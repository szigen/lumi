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
    <div>
      <div>
        <Layers size={16} />
        <h3>Sessions</h3>
        {repoTerminals.length > 0 && <span>{repoTerminals.length}</span>}
      </div>

      {repoTerminals.length === 0 ? (
        <p>No active sessions</p>
      ) : (
        <div>
          {repoTerminals.map((terminal) => (
            <div
              key={terminal.id}
              onClick={() => setActiveTerminal(terminal.id)}
            >
              <StatusDot
                status={terminal.status === 'running' ? 'running' :
                        terminal.status === 'completed' ? 'completed' :
                        terminal.status === 'error' ? 'error' : 'idle'}
              />
              <span>{terminal.task || `Terminal ${terminal.id.slice(0, 6)}`}</span>
              {activeTerminalId === terminal.id && <span>(active)</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
