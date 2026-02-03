import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TerminalSquare, Plus, FolderOpen } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
import { Button, EmptyState } from '../ui'
import { DEFAULT_CONFIG } from '../../../shared/constants'

export default function TerminalPanel() {
  const { terminals, addTerminal, removeTerminal, getTerminalCount } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  const handleNewTerminal = useCallback(async () => {
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
      alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
      return
    }

    const terminalId = await window.api.spawnTerminal(activeRepo.path)
    if (terminalId) {
      addTerminal({
        id: terminalId,
        repoPath: activeRepo.path,
        status: 'running',
        createdAt: new Date()
      })
    }
  }, [activeRepo, addTerminal, getTerminalCount])

  const handleCloseTerminal = useCallback(async (terminalId: string) => {
    await window.api.killTerminal(terminalId)
    removeTerminal(terminalId)
  }, [removeTerminal])

  // Calculate grid columns based on terminal count
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1'
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 6) return 'grid-cols-3'
    return 'grid-cols-4'
  }

  // No repository selected state
  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <EmptyState
          icon={<FolderOpen />}
          title="No repository selected"
          description="Open a repository from the header to start managing your AI coding sessions"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-bg-primary">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-text-primary font-medium">Terminals</h2>
          <span className="
            px-2 py-0.5
            text-xs font-medium
            text-text-secondary
            bg-bg-tertiary rounded-full
          ">
            {repoTerminals.length} / {DEFAULT_CONFIG.maxTerminals}
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleNewTerminal}
          disabled={repoTerminals.length >= DEFAULT_CONFIG.maxTerminals}
        >
          New Terminal
        </Button>
      </div>

      {/* Terminal Grid or Empty State */}
      {repoTerminals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="
            flex-1 flex items-center justify-center
            border-2 border-dashed border-border-subtle
            rounded-xl
            bg-bg-secondary/30
          "
        >
          <EmptyState
            icon={<TerminalSquare />}
            title="No terminals running"
            description="Spawn a new terminal to start coding with Claude"
            action={
              <Button
                variant="secondary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleNewTerminal}
              >
                Create Terminal
              </Button>
            }
          />
        </motion.div>
      ) : (
        <motion.div
          layout
          className={`flex-1 grid ${getGridCols(repoTerminals.length)} gap-3 auto-rows-fr`}
        >
          <AnimatePresence mode="popLayout">
            {repoTerminals.map((terminal) => (
              <motion.div
                key={terminal.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Terminal
                  terminalId={terminal.id}
                  onClose={() => handleCloseTerminal(terminal.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
