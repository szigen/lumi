import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
import { EmptyState } from '../ui'
import { Mascot } from '../icons'
import { DEFAULT_CONFIG } from '../../../shared/constants'
import { getProviderLabel, getProviderLaunchCommand } from '../../../shared/ai-provider'
import PersonaDropdown from './PersonaDropdown'
import GridLayoutPopup from './GridLayoutPopup'
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
  const { activeTab, focusModeActive, aiProvider } = useAppStore()
  const gridLayout = useAppStore((s) => s.getActiveGridLayout())
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

  const handleNewBash = useCallback(async () => {
    if (!activeRepo || !canSpawnTerminal(getTerminalCount)) return

    try {
      const result = await window.api.spawnTerminal(activeRepo.path, 'Bash')
      if (result) {
        await syncFromMain()
        useTerminalStore.getState().setActiveTerminal(result.id)
      }
    } catch (error) {
      console.error('Failed to spawn bash terminal:', error)
    }
  }, [activeRepo, getTerminalCount, syncFromMain])

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

  const computedColumns = useMemo(() => {
    if (gridLayout.mode === 'columns') return gridLayout.count
    if (gridLayout.mode === 'rows') {
      const rows = gridLayout.count
      return Math.max(1, Math.ceil(repoTerminals.length / rows))
    }
    // auto mode
    if (!containerWidth) return 1
    return Math.max(1, Math.floor((containerWidth + GRID_GAP) / (400 + GRID_GAP)))
  }, [gridLayout, containerWidth, repoTerminals.length])

  const gridStyle = useMemo(() => {
    if (gridLayout.mode === 'auto') return undefined

    const cols = computedColumns
    if (!containerWidth) return { gridTemplateColumns: `repeat(${cols}, 1fr)` }

    const colWidth = Math.floor((containerWidth - (cols - 1) * GRID_GAP) / cols)
    const style: React.CSSProperties = { gridTemplateColumns: `repeat(${cols}, ${colWidth}px)` }

    if (gridLayout.mode === 'rows') {
      const rows = gridLayout.count
      if (containerHeight) {
        const rowHeight = Math.floor((containerHeight - (rows - 1) * GRID_GAP) / rows)
        style.gridTemplateRows = `repeat(${rows}, ${rowHeight}px)`
        style.gridAutoRows = 'unset'
      }
    }

    return style
  }, [gridLayout, computedColumns, containerWidth, containerHeight])

  const focusGridStyle = useMemo(() => {
    if (!focusModeActive || !containerHeight || repoTerminals.length === 0) return undefined
    const cols = computedColumns

    let colTemplate: string
    if (gridLayout.mode === 'auto') {
      colTemplate = `repeat(auto-fit, minmax(400px, 1fr))`
    } else if (!containerWidth) {
      colTemplate = `repeat(${cols}, 1fr)`
    } else {
      const colWidth = Math.floor((containerWidth - (cols - 1) * GRID_GAP) / cols)
      colTemplate = `repeat(${cols}, ${colWidth}px)`
    }

    const rows = gridLayout.mode === 'rows'
      ? gridLayout.count
      : Math.ceil(repoTerminals.length / cols)
    const rowHeight = Math.floor((containerHeight - (rows - 1) * GRID_GAP) / rows)
    return { gridTemplateColumns: colTemplate, gridTemplateRows: `repeat(${rows}, ${rowHeight}px)` }
  }, [focusModeActive, containerHeight, containerWidth, repoTerminals.length, computedColumns, gridLayout])

  // Compute column-span styles for terminals on the last incomplete row
  // so they stretch to fill the full grid width
  const lastRowSpanStyles = useMemo(() => {
    if (gridLayout.mode === 'auto') return new Map<string, React.CSSProperties>()

    const count = repoTerminals.length
    const cols = computedColumns
    if (cols <= 1 || count === 0) return new Map<string, React.CSSProperties>()

    const remainder = count % cols
    if (remainder === 0) return new Map<string, React.CSSProperties>()

    const map = new Map<string, React.CSSProperties>()
    const lastRowStart = count - remainder
    const baseSpan = Math.floor(cols / remainder)
    const extraCols = cols % remainder

    for (let i = lastRowStart; i < count; i++) {
      const posInLastRow = i - lastRowStart
      const span = posInLastRow >= remainder - extraCols ? baseSpan + 1 : baseSpan
      map.set(repoTerminals[i].id, { gridColumn: `span ${span}` })
    }

    return map
  }, [gridLayout.mode, repoTerminals, computedColumns])

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
            <GridLayoutPopup repoPath={activeRepo?.path ?? ''} />
            <PersonaDropdown
              disabled={repoTerminals.length >= DEFAULT_CONFIG.maxTerminals}
              onNewProvider={handleNewTerminal}
              onNewBash={handleNewBash}
              onPersonaSelect={handlePersonaSelect}
              repoPath={activeRepo?.path}
            />
          </div>
        </div>
      )}

      {repoTerminals.length === 0 && (
        <div className="terminal-empty">
          <EmptyState
            icon={<Mascot variant="empty" size={96} />}
            title="No terminals running"
            description={`Spawn a new terminal to start coding with ${providerLabel}`}
            action={
              <PersonaDropdown
                onNewProvider={handleNewTerminal}
                onNewBash={handleNewBash}
                onPersonaSelect={handlePersonaSelect}
                repoPath={activeRepo?.path}
              />
            }
          />
        </div>
      )}
      {allTerminals.length > 0 && (
        <div ref={gridRef} className={`terminal-grid${focusModeActive ? ' terminal-grid--focus' : ''}`} style={{ display: repoTerminals.length > 0 ? undefined : 'none', ...(focusModeActive ? focusGridStyle : gridStyle) }}>
          {allTerminals.map((terminal) => {
            const isVisible = terminal.repoPath === activeRepo?.path
            return (
            <div
              key={terminal.id}
              style={{ display: isVisible ? 'block' : 'none', ...(isVisible ? lastRowSpanStyles.get(terminal.id) : undefined) }}
            >
              <Terminal
                terminalId={terminal.id}
                onClose={() => handleCloseTerminal(terminal.id)}
              />
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
