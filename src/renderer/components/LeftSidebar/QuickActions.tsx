import { QUICK_ACTIONS } from '../../../shared/constants'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function QuickActions() {
  const { addTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  const handleAction = async (action: typeof QUICK_ACTIONS[number]) => {
    if (!activeRepo) return

    if (action.command === null) {
      // New terminal action
      const terminalId = await window.api.spawnTerminal(activeRepo.path)
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          task: 'New Terminal',
          createdAt: new Date()
        })
      }
    } else {
      // Run command in new terminal
      const terminalId = await window.api.spawnTerminal(activeRepo.path)
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          task: action.label,
          createdAt: new Date()
        })
        // Send command after short delay to let shell initialize
        setTimeout(() => {
          window.api.writeTerminal(terminalId, action.command + '\r')
        }, 500)
      }
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
        Quick Actions
      </h3>
      <div className="space-y-1">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={!activeRepo}
            className="w-full text-left px-2 py-1.5 rounded text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
