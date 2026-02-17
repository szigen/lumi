import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { TerminalSquare, FolderOpen, Grid2x2, LayoutGrid, Columns3 } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
import { EmptyState } from '../ui'
import { DEFAULT_CONFIG } from '../../../shared/constants'
import { getProviderLabel, getProviderLaunchCommand } from '../../../shared/ai-provider'
import PersonaDropdown from './PersonaDropdown'
import type { Persona } from '../../../shared/persona-types'

const GRID_GAP = 12 // --spacing-md

/** Shared validation: checks max terminal limit and shows alert if exceeded */
function canSpawnTerminal(getTerminalCount: () => number): boolean {
  if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
    alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
    return false
  }
  return true
}

export default function TerminalPanel() {
  const { terminals, getTerminalCount, syncFromMain } = useTerminalStore()
  const { activeTab, gridColumns, setGridColumns, focusModeActive, aiProvider } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const allTerminals = Array.from(terminals.values())
  const repoTerminals = activeRepo
    ? allTerminals.filter(t => t.repoPath === activeRepo.path)
    : []

  const handleNewTerminal = useCallback(async () => {
    if (!activeRepo || !canSpawnTerminal(getTerminalCount)) return

    try {
      const result = await window.api.spawnTerminal(activeRepo.path)
      if (result) {
        await window.api.writeTerminal(result.id, getProviderLaunchCommand(aiProvider))
        await syncFromMain()
        useTerminalStore.getState().setActiveTerminal(result.id)
      }
    } catch (error) {
      console.error('Failed to spawn terminal:', error)
    }
  }, [activeRepo, aiProvider, getTerminalCount, syncFromMain])

  const handlePersonaSelect = useCallback(async (persona: Persona) => {
    if (!activeRepo || !canSpawnTerminal(getTerminalCount)) return

    try {
      const result = await window.api.spawnPersona(persona.id, activeRepo.path)
      if (result) {
        await syncFromMain()
        useTerminalStore.getState().setActiveTerminal(result.id)
      }
    } catch (error) {
      console.error('Failed to spawn persona:', error)
    }
  }, [activeRepo, getTerminalCount, syncFromMain])

  const handleCloseTerminal = useCallback(async (terminalId: string) => {
    try {
      await window.api.killTerminal(terminalId)
      await syncFromMain()
    } catch (error) {
      console.error('Failed to kill terminal:', error)
    }
  }, [syncFromMain])

  const gridRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const hasTerminals = allTerminals.length > 0

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
      setContainerHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasTerminals])

  const handleGridToggle = useCallback(() => {
    const cycle: Array<number | 'auto'> = ['auto', 2, 3]
    const currentIndex = cycle.indexOf(gridColumns)
    const nextIndex = (currentIndex + 1) % cycle.length
    setGridColumns(cycle[nextIndex])
  }, [gridColumns, setGridColumns])

  const computedColumns = useMemo(() => {
    if (gridColumns !== 'auto') return gridColumns
    if (!containerWidth) return 1
    return Math.max(1, Math.floor((containerWidth + GRID_GAP) / (400 + GRID_GAP)))
  }, [gridColumns, containerWidth])

  const gridStyle = useMemo(() => {
    if (gridColumns === 'auto') return undefined
    if (!containerWidth) return { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }
    const colWidth = Math.floor((containerWidth - (gridColumns - 1) * GRID_GAP) / gridColumns)
    return { gridTemplateColumns: `repeat(${gridColumns}, ${colWidth}px)` }
  }, [gridColumns, containerWidth])

  const focusGridStyle = useMemo(() => {
    if (!focusModeActive || !containerHeight || repoTerminals.length === 0) return undefined
    const cols = gridColumns === 'auto' ? computedColumns : gridColumns
    const colTemplate = gridColumns === 'auto'
      ? `repeat(auto-fit, minmax(400px, 1fr))`
      : (!containerWidth
          ? `repeat(${gridColumns}, 1fr)`
          : `repeat(${gridColumns}, ${Math.floor((containerWidth - (gridColumns - 1) * GRID_GAP) / gridColumns)}px)`)
    const rows = Math.ceil(repoTerminals.length / cols)
    const rowHeight = Math.floor((containerHeight - (rows - 1) * GRID_GAP) / rows)
    return { gridTemplateColumns: colTemplate, gridTemplateRows: `repeat(${rows}, ${rowHeight}px)` }
  }, [focusModeActive, containerHeight, containerWidth, repoTerminals.length, computedColumns, gridColumns])

  const GridIcon = gridColumns === 2 ? Grid2x2 : gridColumns === 3 ? Columns3 : LayoutGrid
  const gridTooltip = gridColumns === 'auto' ? 'Auto grid' : `${gridColumns} columns`
  const providerLabel = getProviderLabel(aiProvider)

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
      {repoTerminals.length > 0 && !focusModeActive && (
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
              onNewProvider={handleNewTerminal}
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
            description={`Spawn a new terminal to start coding with ${providerLabel}`}
            action={
              <PersonaDropdown
                onNewProvider={handleNewTerminal}
                onPersonaSelect={handlePersonaSelect}
                repoPath={activeRepo?.path}
              />
            }
          />
        </div>
      )}
      {allTerminals.length > 0 && (
        <div ref={gridRef} className={`terminal-grid${focusModeActive ? ' terminal-grid--focus' : ''}`} style={{ display: repoTerminals.length > 0 ? undefined : 'none', ...(focusModeActive ? focusGridStyle : gridStyle) }}>
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
