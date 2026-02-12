# Enhanced Focus Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make focus mode truly immersive by hiding the terminal panel header and traffic lights, merging controls into the hover bar.

**Architecture:** Add a new IPC channel for traffic light visibility. Hide the terminal panel header when focus mode is active. Expand FocusExitControl to include terminal controls (count, grid toggle, persona dropdown) alongside the exit button.

**Tech Stack:** Electron IPC, React, Zustand, Framer Motion, Lucide icons, CSS (BEM)

---

### Task 1: Add traffic light visibility IPC channel

**Files:**
- Modify: `src/shared/ipc-channels.ts:53` (add new channel constant)
- Modify: `src/main/ipc/handlers.ts` (add handler)
- Modify: `src/preload/index.ts` (expose to renderer)

**Step 1: Add the IPC channel constant**

In `src/shared/ipc-channels.ts`, add inside the `IPC_CHANNELS` object after `WINDOW_TOGGLE_MAXIMIZE`:

```typescript
WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY: 'window:set-traffic-light-visibility',
```

**Step 2: Add the main process handler**

In `src/main/ipc/handlers.ts`, add after the existing `WINDOW_TOGGLE_MAXIMIZE` handler block:

```typescript
ipcMain.handle(IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY, (_event, visible: boolean) => {
  mainWindow?.setWindowButtonVisibility(visible)
})
```

**Step 3: Add the preload bridge method**

In `src/preload/index.ts`, add after `toggleMaximize`:

```typescript
setTrafficLightVisibility: (visible: boolean) =>
  invokeIpc<void>(IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY, visible),
```

**Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

---

### Task 2: Hide terminal panel header in focus mode

**Files:**
- Modify: `src/renderer/components/TerminalPanel/TerminalPanel.tsx:134-156`

**Step 1: Read focusModeActive from store**

In `TerminalPanel.tsx`, add to the existing store destructuring:

```typescript
const { activeTab, gridColumns, setGridColumns, focusModeActive } = useAppStore()
```

(Change line 26 — add `focusModeActive` to the destructured values.)

**Step 2: Conditionally hide the header**

Change the header rendering block (lines 134-156) from:

```typescript
{repoTerminals.length > 0 && (
  <div className="terminal-panel__header">
```

To:

```typescript
{repoTerminals.length > 0 && !focusModeActive && (
  <div className="terminal-panel__header">
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

---

### Task 3: Expand FocusExitControl with terminal controls

**Files:**
- Modify: `src/renderer/components/FocusMode/FocusExitControl.tsx` (major rewrite)

**Step 1: Rewrite FocusExitControl**

Replace the entire file content with:

```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
      setVisible(false)
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
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

---

### Task 4: Update CSS for enhanced FocusExitControl

**Files:**
- Modify: `src/renderer/styles/globals.css:2237-2279` (focus mode section)

**Step 1: Replace the focus mode CSS block**

Replace the entire `/* === FOCUS MODE === */` section (lines 2237-2279) with:

```css
/* === FOCUS MODE === */
.focus-exit-control {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 80px;
  padding-right: var(--spacing-md);
  background: linear-gradient(to bottom, rgba(18, 18, 31, 0.95), transparent);
  backdrop-filter: blur(8px);
  z-index: 100;
  -webkit-app-region: drag;
}

.focus-exit-control > * {
  -webkit-app-region: no-drag;
}

.focus-exit-control__left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.focus-exit-control__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.focus-exit-control__count {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.focus-exit-control__grid-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.focus-exit-control__grid-toggle:hover {
  background: var(--bg-elevated);
  color: var(--accent-primary);
}

.focus-exit-control__btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  color: var(--accent-primary);
  font-size: 12px;
  transition: all 0.15s ease;
}

.focus-exit-control__btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
```

**Step 2: Verify the app renders correctly**

Run: `npm run dev`
Expected: Focus mode hides header + traffic lights, hover bar shows all controls

---

### Task 5: Update CLAUDE.md files

**Files:**
- Modify: `src/shared/CLAUDE.md` (document new IPC channel)
- Modify: `src/renderer/components/FocusMode/CLAUDE.md` or create if missing
- Modify: `src/renderer/components/TerminalPanel/CLAUDE.md` (document focus mode behavior)
- Modify: `src/preload/CLAUDE.md` (document new API method)

**Step 1: Update shared CLAUDE.md**

Add `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY` to the IPC channels documentation in `src/shared/CLAUDE.md`.

**Step 2: Update TerminalPanel CLAUDE.md**

Add note: "Header is hidden when `focusModeActive` is true — controls move to FocusExitControl"

**Step 3: Update preload CLAUDE.md**

Add `setTrafficLightVisibility` to the Window API group.

**Step 4: Create or update FocusMode CLAUDE.md**

Document the enhanced FocusExitControl: hover bar with traffic light toggle, terminal controls (count, grid, persona dropdown), and exit button. Note IPC dependency on `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY`.
