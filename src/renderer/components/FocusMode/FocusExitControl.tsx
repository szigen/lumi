import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Grid2x2, LayoutGrid, Columns3 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { DEFAULT_CONFIG } from '../../../shared/constants'
import PersonaDropdown from '../TerminalPanel/PersonaDropdown'
import type { Persona } from '../../../shared/persona-types'
import type { SpawnResult } from '../../../shared/types'

const HOVER_ZONE_HEIGHT = 50
const HOVER_DELAY_MS = 500

/** Shared validation: checks max terminal limit */
function canSpawnTerminal(getTerminalCount: () => number): boolean {
  if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
    alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
    return false
  }
  return true
}

export default function FocusExitControl() {
  const { toggleFocusMode, activeTab, gridColumns, setGridColumns } = useAppStore()
  const { terminals, addTerminal, removeTerminal, getTerminalCount } = useTerminalStore()
  const { getRepoByName } = useRepoStore()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDropdownOpenRef = useRef(false)

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    isDropdownOpenRef.current = open
  }, [])

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const allTerminals = Array.from(terminals.values())
  const repoTerminals = activeRepo
    ? allTerminals.filter(t => t.repoPath === activeRepo.path)
    : []

  // Toggle traffic lights with hover visibility
  useEffect(() => {
    window.api.setTrafficLightVisibility(visible)
  }, [visible])

  // Hide traffic lights on mount, restore on unmount
  useEffect(() => {
    window.api.setTrafficLightVisibility(false)
    return () => {
      window.api.setTrafficLightVisibility(true)
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientY <= HOVER_ZONE_HEIGHT) {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setVisible(true)
        }, HOVER_DELAY_MS)
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (!isDropdownOpenRef.current) {
        setVisible(false)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [handleMouseMove])

  const registerSpawnedTerminal = useCallback((
    result: SpawnResult,
    repoPath: string,
    options?: { task?: string; initialCommand?: string }
  ) => {
    addTerminal({
      id: result.id,
      name: result.name,
      repoPath,
      status: 'idle',
      task: options?.task,
      isNew: result.isNew,
      createdAt: new Date()
    })
    if (options?.initialCommand) {
      window.api.writeTerminal(result.id, options.initialCommand)
    }
  }, [addTerminal])

  const handleNewTerminal = useCallback(async () => {
    if (!activeRepo || !canSpawnTerminal(getTerminalCount)) return
    try {
      const result = await window.api.spawnTerminal(activeRepo.path)
      if (result) {
        registerSpawnedTerminal(result, activeRepo.path, { initialCommand: 'claude\r' })
      }
    } catch (error) {
      console.error('Failed to spawn terminal:', error)
    }
  }, [activeRepo, getTerminalCount, registerSpawnedTerminal])

  const handlePersonaSelect = useCallback(async (persona: Persona) => {
    if (!activeRepo || !canSpawnTerminal(getTerminalCount)) return
    try {
      const result = await window.api.spawnPersona(persona.id, activeRepo.path)
      if (result) {
        registerSpawnedTerminal(result, activeRepo.path, { task: persona.label })
      }
    } catch (error) {
      console.error('Failed to spawn persona:', error)
    }
  }, [activeRepo, getTerminalCount, registerSpawnedTerminal])

  const handleGridToggle = useCallback(() => {
    const cycle: Array<number | 'auto'> = ['auto', 2, 3]
    const currentIndex = cycle.indexOf(gridColumns)
    const nextIndex = (currentIndex + 1) % cycle.length
    setGridColumns(cycle[nextIndex])
  }, [gridColumns, setGridColumns])

  const GridIcon = gridColumns === 2 ? Grid2x2 : gridColumns === 3 ? Columns3 : LayoutGrid
  const gridTooltip = gridColumns === 'auto' ? 'Auto grid' : `${gridColumns} columns`

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="focus-exit-control"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="focus-exit-control__left">
            {repoTerminals.length > 0 && (
              <>
                <span className="focus-exit-control__label">Terminals</span>
                <span className="focus-exit-control__count">
                  {repoTerminals.length} / {DEFAULT_CONFIG.maxTerminals}
                </span>
                <button
                  className="focus-exit-control__grid-toggle"
                  onClick={handleGridToggle}
                  title={gridTooltip}
                >
                  <GridIcon size={14} />
                </button>
              </>
            )}
            <PersonaDropdown
              disabled={repoTerminals.length >= DEFAULT_CONFIG.maxTerminals}
              onNewClaude={handleNewTerminal}
              onPersonaSelect={handlePersonaSelect}
              repoPath={activeRepo?.path}
              onOpenChange={handleDropdownOpenChange}
            />
          </div>
          <button
            className="focus-exit-control__btn"
            onClick={toggleFocusMode}
          >
            <X size={14} />
            Exit Focus Mode
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
