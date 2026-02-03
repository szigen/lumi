import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function SessionList() {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
        Sessions
      </h3>
      {repoTerminals.length === 0 ? (
        <p className="text-text-secondary text-sm px-2">No active sessions</p>
      ) : (
        <ul className="space-y-1">
          {repoTerminals.map((terminal) => (
            <li key={terminal.id}>
              <button
                onClick={() => setActiveTerminal(terminal.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                  activeTerminalId === terminal.id
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  terminal.status === 'running' ? 'bg-green-500' :
                  terminal.status === 'completed' ? 'bg-blue-500' :
                  terminal.status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <span className="truncate">
                  {terminal.task || `Terminal ${terminal.id.slice(0, 6)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
