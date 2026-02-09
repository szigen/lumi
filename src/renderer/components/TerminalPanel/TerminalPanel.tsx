import { useCallback, useMemo } from 'react'
import { TerminalSquare, FolderOpen, Grid2x2, LayoutGrid, Columns3 } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
import { EmptyState } from '../ui'
import { DEFAULT_CONFIG } from '../../../shared/constants'
import PersonaDropdown from './PersonaDropdown'
import type { Persona } from '../../../shared/persona-types'

export default function TerminalPanel() {
  const { terminals, addTerminal, removeTerminal, getTerminalCount } = useTerminalStore()
  const { activeTab, gridColumns, setGridColumns } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const allTerminals = Array.from(terminals.values())
  const repoTerminals = activeRepo
    ? allTerminals.filter(t => t.repoPath === activeRepo.path)
    : []

  const handleNewTerminal = useCallback(async () => {
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
      alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
      return
    }

    const result = await window.api.spawnTerminal(activeRepo.path)
    if (result) {
      addTerminal({
        id: result.id,
        name: result.name,
        repoPath: activeRepo.path,
        status: 'running',
        isNew: result.isNew,
        createdAt: new Date()
      })
      window.api.writeTerminal(result.id, 'claude\r')
    }
  }, [activeRepo, addTerminal, getTerminalCount])

  const handlePersonaSelect = useCallback(async (persona: Persona) => {
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
      alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
      return
    }

    const result = await window.api.spawnPersona(persona.id, activeRepo.path)
    if (result) {
      addTerminal({
        id: result.id,
        name: result.name,
        repoPath: activeRepo.path,
        status: 'running',
        task: persona.label,
        isNew: result.isNew,
        createdAt: new Date()
      })
    }
  }, [activeRepo, addTerminal, getTerminalCount])

  const handleCloseTerminal = useCallback(async (terminalId: string) => {
    await window.api.killTerminal(terminalId)
    removeTerminal(terminalId)
  }, [removeTerminal])

  const handleGridToggle = useCallback(() => {
    const cycle: Array<number | 'auto'> = ['auto', 2, 3]
    const currentIndex = cycle.indexOf(gridColumns)
    const nextIndex = (currentIndex + 1) % cycle.length
    setGridColumns(cycle[nextIndex])
  }, [gridColumns, setGridColumns])

  const gridStyle = useMemo(() => {
    if (gridColumns === 'auto') return undefined
    return { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }
  }, [gridColumns])

  const GridIcon = gridColumns === 2 ? Grid2x2 : gridColumns === 3 ? Columns3 : LayoutGrid
  const gridTooltip = gridColumns === 'auto' ? 'Auto grid' : `${gridColumns} columns`

  if (!activeTab) {
    return (
      <div className="terminal-panel terminal-empty">
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No repository selected"
          description="Open a repository from the header to start managing your AI coding sessions"
        />
      </div>
    )
  }

  return (
    <div className="terminal-panel">
      {repoTerminals.length > 0 && (
        <div className="terminal-panel__header">
          <h2 className="terminal-panel__title">Terminals</h2>
          <span className="terminal-panel__count">
            {repoTerminals.length} / {DEFAULT_CONFIG.maxTerminals}
          </span>
          <div className="terminal-panel__actions">
            <button
              className="terminal-panel__grid-toggle"
              onClick={handleGridToggle}
              title={gridTooltip}
            >
              <GridIcon size={16} />
            </button>
            <PersonaDropdown
              disabled={repoTerminals.length >= DEFAULT_CONFIG.maxTerminals}
              onNewClaude={handleNewTerminal}
              onPersonaSelect={handlePersonaSelect}
              repoPath={activeRepo?.path}
            />
          </div>
        </div>
      )}

      {repoTerminals.length === 0 && (
        <div className="terminal-empty">
          <EmptyState
            icon={<TerminalSquare size={48} />}
            title="No terminals running"
            description="Spawn a new terminal to start coding with Claude"
            action={
              <PersonaDropdown
                onNewClaude={handleNewTerminal}
                onPersonaSelect={handlePersonaSelect}
                repoPath={activeRepo?.path}
              />
            }
          />
        </div>
      )}
      {allTerminals.length > 0 && (
        <div className="terminal-grid" style={{ display: repoTerminals.length > 0 ? undefined : 'none', ...gridStyle }}>
          {allTerminals.map((terminal) => (
            <div
              key={terminal.id}
              style={{ display: terminal.repoPath === activeRepo?.path ? 'block' : 'none' }}
            >
              <Terminal
                terminalId={terminal.id}
                onClose={() => handleCloseTerminal(terminal.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
