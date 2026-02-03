import { useCallback } from 'react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
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

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <p className="text-lg mb-2">No repository selected</p>
        <p className="text-sm">Select a repository from the header to get started</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-medium">
          Terminals ({repoTerminals.length}/{DEFAULT_CONFIG.maxTerminals})
        </h2>
        <button
          onClick={handleNewTerminal}
          className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-blue-600"
        >
          + New Terminal
        </button>
      </div>

      {repoTerminals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border-primary rounded">
          <div className="text-center text-text-secondary">
            <p className="mb-2">No terminals open</p>
            <button
              onClick={handleNewTerminal}
              className="text-accent hover:underline"
            >
              Create your first terminal
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex-1 grid ${getGridCols(repoTerminals.length)} gap-4`}>
          {repoTerminals.map((terminal) => (
            <Terminal
              key={terminal.id}
              terminalId={terminal.id}
              onClose={() => handleCloseTerminal(terminal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
