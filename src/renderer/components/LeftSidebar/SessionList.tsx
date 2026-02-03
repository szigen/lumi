import { motion, AnimatePresence } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { StatusDot } from '../icons'
import { Card } from '../ui'

export default function SessionList() {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  return (
    <div className="mb-5">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <Layers className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Sessions
        </h3>
        {repoTerminals.length > 0 && (
          <span className="ml-auto text-2xs text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
            {repoTerminals.length}
          </span>
        )}
      </div>

      {/* Session List */}
      {repoTerminals.length === 0 ? (
        <p className="text-text-tertiary text-sm px-1">No active sessions</p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {repoTerminals.map((terminal, index) => (
              <motion.div
                key={terminal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                <Card
                  variant={activeTerminalId === terminal.id ? 'interactive' : 'default'}
                  noPadding
                  onClick={() => setActiveTerminal(terminal.id)}
                  className={`
                    p-2 cursor-pointer
                    ${activeTerminalId === terminal.id
                      ? 'bg-accent/5 border-accent/30'
                      : 'hover:bg-surface-hover'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <StatusDot
                      status={terminal.status === 'running' ? 'running' :
                              terminal.status === 'completed' ? 'completed' :
                              terminal.status === 'error' ? 'error' : 'idle'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`
                        text-sm truncate
                        ${activeTerminalId === terminal.id
                          ? 'text-text-primary font-medium'
                          : 'text-text-secondary'
                        }
                      `}>
                        {terminal.task || `Terminal ${terminal.id.slice(0, 6)}`}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
