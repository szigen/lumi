import { Zap, Terminal, Bug, TestTube, FileCode, Play } from 'lucide-react'
import { QUICK_ACTIONS } from '../../../shared/constants'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'new-terminal': <Terminal size={16} />,
  'claude-code': <Play size={16} />,
  'run-tests': <TestTube size={16} />,
  'lint-fix': <FileCode size={16} />,
  'debug': <Bug size={16} />,
}

export default function QuickActions() {
  const { addTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  const handleAction = async (action: typeof QUICK_ACTIONS[number]) => {
    if (!activeRepo) return

    if (action.command === null) {
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
      const terminalId = await window.api.spawnTerminal(activeRepo.path)
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          task: action.label,
          createdAt: new Date()
        })
        setTimeout(() => {
          window.api.writeTerminal(terminalId, action.command + '\r')
        }, 500)
      }
    }
  }

  return (
    <div>
      <div>
        <Zap size={16} />
        <h3>Quick Actions</h3>
      </div>

      <div>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={!activeRepo}
          >
            {ACTION_ICONS[action.id] || <Terminal size={16} />}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
