import { motion } from 'framer-motion'
import { Zap, Terminal, Bug, TestTube, FileCode, Play } from 'lucide-react'
import { QUICK_ACTIONS } from '../../../shared/constants'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

// Icon mapping for quick actions
const ACTION_ICONS: Record<string, React.ReactNode> = {
  'new-terminal': <Terminal className="w-4 h-4" />,
  'claude-code': <Play className="w-4 h-4" />,
  'run-tests': <TestTube className="w-4 h-4" />,
  'lint-fix': <FileCode className="w-4 h-4" />,
  'debug': <Bug className="w-4 h-4" />,
}

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
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <Zap className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Quick Actions
        </h3>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction(action)}
            disabled={!activeRepo}
            className="
              flex flex-col items-center gap-1.5
              p-3 rounded-lg
              bg-bg-tertiary/50
              border border-border-subtle
              text-text-secondary
              hover:text-text-primary
              hover:bg-bg-tertiary
              hover:border-accent/30
              hover:shadow-glow-accent
              disabled:opacity-40 disabled:cursor-not-allowed
              disabled:hover:bg-bg-tertiary/50
              disabled:hover:border-border-subtle
              disabled:hover:shadow-none
              transition-all duration-fast
            "
          >
            <span className="text-accent">
              {ACTION_ICONS[action.id] || <Terminal className="w-4 h-4" />}
            </span>
            <span className="text-xs font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
