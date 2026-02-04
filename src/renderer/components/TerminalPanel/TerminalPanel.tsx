import { useCallback } from 'react'
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

  if (!activeTab) {
    return (
      <div>
        <EmptyState
          icon={<FolderOpen />}
          title="No repository selected"
          description="Open a repository from the header to start managing your AI coding sessions"
        />
      </div>
    )
  }

  return (
    <div>
      <div>
        <h2>Terminals</h2>
        <span>{repoTerminals.length} / {DEFAULT_CONFIG.maxTerminals}</span>
        <Button
          leftIcon={<Plus size={16} />}
          onClick={handleNewTerminal}
          disabled={repoTerminals.length >= DEFAULT_CONFIG.maxTerminals}
        >
          New Terminal
        </Button>
      </div>

      {repoTerminals.length === 0 ? (
        <div>
          <EmptyState
            icon={<TerminalSquare />}
            title="No terminals running"
            description="Spawn a new terminal to start coding with Claude"
            action={
              <Button
                leftIcon={<Plus size={16} />}
                onClick={handleNewTerminal}
              >
                Create Terminal
              </Button>
            }
          />
        </div>
      ) : (
        <div>
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
