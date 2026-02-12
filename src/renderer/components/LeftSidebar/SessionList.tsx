import { Layers, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
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
              <StatusDot status={terminal.status} />
              <span className="session-item__name">
                {terminal.task || terminal.name}
              </span>
              {terminal.isNew && (
                <motion.span
                  className="session-item__new-badge"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Sparkles size={10} />
                  NEW
                </motion.span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
