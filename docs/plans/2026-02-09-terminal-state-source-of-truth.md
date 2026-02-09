# Terminal State: Main Process as Single Source of Truth

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix terminals disappearing from UI after macOS sleep/wake by making main process the single source of truth for terminal state.

**Architecture:** Main process (`TerminalManager`) becomes the authoritative owner of all terminal metadata and output buffer. Renderer's `useTerminalStore` becomes a cache that syncs from main on startup, resume, and visibility change. A new `TERMINAL_LIST` IPC channel lets renderer query active terminals at any time. Output buffering in main process enables reconnection without blank screens.

**Tech Stack:** Electron IPC, node-pty, Zustand, xterm.js, Electron powerMonitor

---

### Task 1: Add TerminalInfo type to shared types

**Files:**
- Modify: `src/shared/types.ts:1-9`

**Step 1: Add the TerminalInfo interface**

Add after the existing `Terminal` interface (line 9):

```typescript
/** Serializable terminal info sent from main → renderer via IPC */
export interface TerminalInfo {
  id: string
  name: string
  repoPath: string
  createdAt: string
  task?: string
}
```

This is the IPC-transferable version of terminal metadata (no PTY reference, Date as string for serialization).

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add TerminalInfo type for main→renderer IPC"
```

---

### Task 2: Add new IPC channels

**Files:**
- Modify: `src/shared/ipc-channels.ts:6-12`

**Step 1: Add TERMINAL_LIST and TERMINAL_BUFFER channels**

Add these two lines after `TERMINAL_EXIT` (line 12):

```typescript
  TERMINAL_LIST: 'terminal:list',
  TERMINAL_BUFFER: 'terminal:buffer',
  TERMINAL_SYNC: 'terminal:sync',
```

- `TERMINAL_LIST`: renderer queries main for all active terminals
- `TERMINAL_BUFFER`: renderer requests output buffer for a specific terminal
- `TERMINAL_SYNC`: main pushes "sync now" signal to renderer

**Step 2: Commit**

```bash
git add src/shared/ipc-channels.ts
git commit -m "feat: add TERMINAL_LIST, TERMINAL_BUFFER, TERMINAL_SYNC IPC channels"
```

---

### Task 3: Add output buffering and getTerminalList to TerminalManager

**Files:**
- Modify: `src/main/terminal/TerminalManager.ts`
- Modify: `src/main/terminal/types.ts`

**Step 1: Add outputBuffer to ManagedTerminal type**

In `src/main/terminal/types.ts`, add `task` and remove reliance on renderer for metadata:

```typescript
import type { IPty } from 'node-pty'

export interface SpawnResult {
  id: string
  name: string
  isNew: boolean
}

export interface ManagedTerminal {
  id: string
  name: string
  pty: IPty
  repoPath: string
  createdAt: Date
  task?: string
  outputBuffer: string
}
```

**Step 2: Update TerminalManager to buffer output and expose terminal list**

In `src/main/terminal/TerminalManager.ts`:

1. In `spawn()` method, add `outputBuffer: ''` and `task` to the terminal object (line 43-49):

```typescript
    const terminal: ManagedTerminal = {
      id,
      name,
      pty: ptyProcess,
      repoPath,
      createdAt: new Date(),
      outputBuffer: ''
    }
```

2. In `ptyProcess.onData()` callback (line 51-57), append to buffer with size limit:

```typescript
    ptyProcess.onData((data) => {
      // Append to output buffer (keep last 100KB)
      terminal.outputBuffer += data
      if (terminal.outputBuffer.length > 100_000) {
        terminal.outputBuffer = terminal.outputBuffer.slice(-100_000)
      }

      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data)
        this.notificationManager.processPtyOutput(id, data, window, repoPath)
      }
      this.emit('output', { terminalId: id, data })
    })
```

3. Add `setTask()` method:

```typescript
  setTask(terminalId: string, task: string): void {
    const terminal = this.terminals.get(terminalId)
    if (terminal) terminal.task = task
  }
```

4. Add `getTerminalList()` method that returns serializable terminal info:

```typescript
  getTerminalList(): Array<{ id: string; name: string; repoPath: string; createdAt: string; task?: string }> {
    return Array.from(this.terminals.values()).map(t => ({
      id: t.id,
      name: t.name,
      repoPath: t.repoPath,
      createdAt: t.createdAt.toISOString(),
      task: t.task
    }))
  }
```

5. Add `getOutputBuffer()` method:

```typescript
  getOutputBuffer(terminalId: string): string | null {
    const terminal = this.terminals.get(terminalId)
    return terminal ? terminal.outputBuffer : null
  }
```

**Step 3: Commit**

```bash
git add src/main/terminal/TerminalManager.ts src/main/terminal/types.ts
git commit -m "feat: add output buffering, getTerminalList, getOutputBuffer to TerminalManager"
```

---

### Task 4: Register new IPC handlers

**Files:**
- Modify: `src/main/ipc/handlers.ts:64-86`

**Step 1: Add TERMINAL_LIST and TERMINAL_BUFFER handlers**

Add after the existing terminal handlers block (after line 86):

```typescript
  ipcMain.handle(IPC_CHANNELS.TERMINAL_LIST, async () => {
    return terminalManager!.getTerminalList()
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_BUFFER, async (_, terminalId: string) => {
    return terminalManager!.getOutputBuffer(terminalId)
  })
```

**Step 2: Update spawn handler to accept task parameter**

Modify `TERMINAL_SPAWN` handler (line 65-68) to also accept and store task:

```typescript
  ipcMain.handle(IPC_CHANNELS.TERMINAL_SPAWN, async (_, repoPath: string, task?: string) => {
    if (!mainWindow) throw new Error('No main window')
    const result = terminalManager!.spawn(repoPath, mainWindow)
    if (result && task) {
      terminalManager!.setTask(result.id, task)
    }
    return result
  })
```

**Step 3: Update ACTIONS_EXECUTE handler to store task on main side**

Modify `ACTIONS_EXECUTE` handler (line 214-222). After the execute call, set the task:

```typescript
  ipcMain.handle(
    IPC_CHANNELS.ACTIONS_EXECUTE,
    async (_, actionId: string, repoPath: string) => {
      const actions = actionStore!.getActions(repoPath)
      const action = actions.find((a) => a.id === actionId)
      if (!action) throw new Error(`Action not found: ${actionId}`)
      const result = await actionEngine!.execute(action, repoPath)
      if (result) {
        terminalManager!.setTask(result.id, action.label)
      }
      return result
    }
  )
```

**Step 4: Update PERSONAS_SPAWN handler to store task on main side**

Modify `PERSONAS_SPAWN` handler (line 263-280). After spawn, set the task:

```typescript
  ipcMain.handle(
    IPC_CHANNELS.PERSONAS_SPAWN,
    async (_, personaId: string, repoPath: string) => {
      if (!mainWindow) throw new Error('No main window')

      const personas = personaStore!.getPersonas(repoPath)
      const persona = personas.find((p) => p.id === personaId)
      if (!persona) throw new Error(`Persona not found: ${personaId}`)

      const result = terminalManager!.spawn(repoPath, mainWindow, false)
      if (!result) return null

      terminalManager!.setTask(result.id, persona.label)
      const command = buildClaudeCommand('claude ""\r', persona.claude)
      terminalManager!.write(result.id, command)

      return result
    }
  )
```

**Step 5: Update CREATE_ACTION handler similarly**

Modify `ACTIONS_CREATE_NEW` handler (line 235-252). After execute, set the task:

```typescript
  ipcMain.handle(IPC_CHANNELS.ACTIONS_CREATE_NEW, async (_, repoPath: string) => {
    const action: import('../../shared/action-types').Action = {
      id: '__create-action',
      label: 'Create Action',
      icon: 'Plus',
      scope: 'user',
      claude: {
        appendSystemPrompt: CREATE_ACTION_PROMPT
      },
      steps: [
        {
          type: 'write',
          content: `claude "."\r`
        }
      ]
    }
    const result = await actionEngine!.execute(action, repoPath)
    if (result) {
      terminalManager!.setTask(result.id, 'Create Action')
    }
    return result
  })
```

**Step 6: Commit**

```bash
git add src/main/ipc/handlers.ts
git commit -m "feat: add TERMINAL_LIST, TERMINAL_BUFFER IPC handlers, store task in main"
```

---

### Task 5: Expose new IPC methods in preload

**Files:**
- Modify: `src/preload/index.ts:6-15`

**Step 1: Add listTerminals, getTerminalBuffer, and onTerminalSync to the api object**

Add after `resizeTerminal` (line 15):

```typescript
  listTerminals: () =>
    invokeIpc<Array<{ id: string; name: string; repoPath: string; createdAt: string; task?: string }>>(IPC_CHANNELS.TERMINAL_LIST),
  getTerminalBuffer: (terminalId: string) =>
    invokeIpc<string | null>(IPC_CHANNELS.TERMINAL_BUFFER, terminalId),
  onTerminalSync: (callback: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.TERMINAL_SYNC, callback),
```

**Step 2: Update spawnTerminal to accept optional task**

Modify line 8-9:

```typescript
  spawnTerminal: (repoPath: string, task?: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.TERMINAL_SPAWN, repoPath, task),
```

**Step 3: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat: expose listTerminals, getTerminalBuffer, onTerminalSync in preload"
```

---

### Task 6: Refactor useTerminalStore to sync from main process

**Files:**
- Modify: `src/renderer/stores/useTerminalStore.ts`

**Step 1: Replace the store with sync-based implementation**

The store keeps its local cache but adds a `syncFromMain()` method that queries main process and reconciles:

```typescript
import { create } from 'zustand'
import type { Terminal } from '../../shared/types'

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null
  lastActiveByRepo: Map<string, string>
  syncing: boolean

  addTerminal: (terminal: Terminal) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<Terminal>) => void
  appendOutput: (id: string, data: string) => void
  setActiveTerminal: (id: string | null) => void
  getTerminalsByRepo: (repoPath: string) => Terminal[]
  getTerminalCount: () => number
  syncFromMain: () => Promise<void>
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  outputs: new Map(),
  activeTerminalId: null,
  lastActiveByRepo: new Map(),
  syncing: false,

  addTerminal: (terminal) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      newTerminals.set(terminal.id, terminal)
      const newOutputs = new Map(state.outputs)
      if (!newOutputs.has(terminal.id)) {
        newOutputs.set(terminal.id, '')
      }
      return { terminals: newTerminals, outputs: newOutputs, activeTerminalId: terminal.id }
    })
  },

  removeTerminal: (id) => {
    set((state) => {
      const terminal = state.terminals.get(id)
      const newTerminals = new Map(state.terminals)
      newTerminals.delete(id)
      const newOutputs = new Map(state.outputs)
      newOutputs.delete(id)

      const newLastActive = new Map(state.lastActiveByRepo)
      if (terminal) {
        const lastActiveForRepo = newLastActive.get(terminal.repoPath)
        if (lastActiveForRepo === id) {
          const repoTerminals = Array.from(newTerminals.values())
            .filter(t => t.repoPath === terminal.repoPath)
          if (repoTerminals.length > 0) {
            newLastActive.set(terminal.repoPath, repoTerminals[0].id)
          } else {
            newLastActive.delete(terminal.repoPath)
          }
        }
      }

      const newActive = state.activeTerminalId === id
        ? Array.from(newTerminals.keys())[0] || null
        : state.activeTerminalId

      return {
        terminals: newTerminals,
        outputs: newOutputs,
        activeTerminalId: newActive,
        lastActiveByRepo: newLastActive
      }
    })
  },

  updateTerminal: (id, updates) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      const terminal = newTerminals.get(id)
      if (terminal) {
        newTerminals.set(id, { ...terminal, ...updates })
      }
      return { terminals: newTerminals }
    })
  },

  appendOutput: (id, data) => {
    set((state) => {
      const newOutputs = new Map(state.outputs)
      const current = newOutputs.get(id) || ''
      newOutputs.set(id, current + data)
      return { outputs: newOutputs }
    })
  },

  setActiveTerminal: (id) => {
    if (!id) {
      set({ activeTerminalId: null })
      return
    }

    const terminal = get().terminals.get(id)
    if (terminal) {
      const newLastActive = new Map(get().lastActiveByRepo)
      newLastActive.set(terminal.repoPath, id)
      set({ activeTerminalId: id, lastActiveByRepo: newLastActive })
    } else {
      set({ activeTerminalId: id })
    }
  },

  getTerminalsByRepo: (repoPath) => {
    return Array.from(get().terminals.values()).filter((t) => t.repoPath === repoPath)
  },

  getTerminalCount: () => get().terminals.size,

  syncFromMain: async () => {
    if (get().syncing) return
    set({ syncing: true })

    try {
      const mainTerminals = await window.api.listTerminals()
      const mainIds = new Set(mainTerminals.map(t => t.id))
      const currentTerminals = get().terminals
      const currentOutputs = get().outputs

      const newTerminals = new Map<string, Terminal>()
      const newOutputs = new Map<string, string>()

      // Add/update terminals that exist in main
      for (const mt of mainTerminals) {
        const existing = currentTerminals.get(mt.id)
        if (existing) {
          // Keep existing renderer-side state (status, isNew, etc.)
          newTerminals.set(mt.id, existing)
          newOutputs.set(mt.id, currentOutputs.get(mt.id) || '')
        } else {
          // Terminal exists in main but not in renderer — reconnect
          const buffer = await window.api.getTerminalBuffer(mt.id)
          newTerminals.set(mt.id, {
            id: mt.id,
            name: mt.name,
            repoPath: mt.repoPath,
            status: 'running',
            task: mt.task,
            createdAt: new Date(mt.createdAt)
          })
          newOutputs.set(mt.id, buffer || '')
        }
      }

      // Terminals that exist in renderer but not in main are stale — remove them
      // (they were killed while renderer was disconnected)

      // Fix active terminal if it was removed
      const currentActive = get().activeTerminalId
      const newActive = currentActive && mainIds.has(currentActive)
        ? currentActive
        : (newTerminals.size > 0 ? newTerminals.keys().next().value ?? null : null)

      // Rebuild lastActiveByRepo
      const newLastActive = new Map<string, string>()
      for (const [id, t] of newTerminals) {
        if (!newLastActive.has(t.repoPath)) {
          newLastActive.set(t.repoPath, id)
        }
      }
      // Preserve current active selections where still valid
      for (const [repo, termId] of get().lastActiveByRepo) {
        if (newTerminals.has(termId)) {
          newLastActive.set(repo, termId)
        }
      }

      set({
        terminals: newTerminals,
        outputs: newOutputs,
        activeTerminalId: newActive,
        lastActiveByRepo: newLastActive
      })
    } finally {
      set({ syncing: false })
    }
  }
}))
```

**Step 2: Commit**

```bash
git add src/renderer/stores/useTerminalStore.ts
git commit -m "feat: add syncFromMain to useTerminalStore for main process reconciliation"
```

---

### Task 7: Add sync triggers in Layout (resume, visibility, startup)

**Files:**
- Modify: `src/renderer/components/Layout/Layout.tsx:38-53`

**Step 1: Import useTerminalStore and add sync on startup + events**

Add import at top:

```typescript
import { useTerminalStore } from '../../stores/useTerminalStore'
```

Inside the `Layout` component, add:

```typescript
  const { syncFromMain } = useTerminalStore()
```

**Step 2: Add sync to the initialization block**

Modify the `initialize` function (line 39-53) to include syncFromMain:

```typescript
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          loadUIState(),
          loadRepos()
        ])
        // Sync terminal state from main process on startup
        await syncFromMain()
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [loadUIState, loadRepos, syncFromMain])
```

**Step 3: Add visibility change and terminal sync listeners**

Add a new useEffect after the initialization one:

```typescript
  // Re-sync terminals when app regains focus (covers macOS sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromMain()
      }
    }

    const handleFocus = () => {
      syncFromMain()
    }

    // Listen for main process sync signal (powerMonitor resume)
    const cleanupSync = window.api.onTerminalSync(() => {
      syncFromMain()
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      cleanupSync()
    }
  }, [syncFromMain])
```

**Step 4: Commit**

```bash
git add src/renderer/components/Layout/Layout.tsx
git commit -m "feat: sync terminal state from main on startup, resume, and visibility change"
```

---

### Task 8: Add powerMonitor resume event in main process

**Files:**
- Modify: `src/main/index.ts:1,164-181`

**Step 1: Import powerMonitor**

Change the electron import (line 1):

```typescript
import { app, BrowserWindow, Menu, ipcMain, powerMonitor } from 'electron'
```

**Step 2: Add resume handler inside app.whenReady**

Add after the `app.on('activate', ...)` block (after line 181):

```typescript
  // Notify renderer to re-sync terminal state after macOS sleep/wake
  powerMonitor.on('resume', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.TERMINAL_SYNC)
  })
```

**Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: send TERMINAL_SYNC to renderer on powerMonitor resume"
```

---

### Task 9: Update Terminal.tsx to handle reconnection

**Files:**
- Modify: `src/renderer/components/Terminal/Terminal.tsx:68-116`

**Step 1: Handle the case where output comes from sync (buffer restore)**

The key issue: after sync, `output` in the store will contain the full buffer from main process. The existing code at line 102-104 already writes buffered output on mount:

```typescript
    if (output) {
      xterm.write(output)
    }
```

This already handles reconnection! When `syncFromMain()` populates the outputs map with the buffer from main, and the Terminal component mounts (or remounts), it will write the buffered output.

However, we need to ensure that if the component is already mounted and sync happens, the xterm gets the new data. The IPC listener at line 134-156 handles live data. But during sleep, data may have been missed.

Add a new effect that watches for output changes from sync and writes missed data:

After the IPC listener effect (line 134-156), add:

```typescript
  // Handle output buffer restoration from sync
  const lastOutputLengthRef = useRef(0)

  useEffect(() => {
    if (!xtermRef.current) return

    // If output grew significantly (sync happened), re-render
    const currentLength = output.length
    const lastLength = lastOutputLengthRef.current

    if (currentLength > lastLength && lastLength === 0 && currentLength > 0) {
      // Terminal was empty and got buffer from sync — write it
      xtermRef.current.clear()
      xtermRef.current.write(output)
    }

    lastOutputLengthRef.current = currentLength
  }, [output])
```

Add `useRef` to the imports at line 1 if not already there (it is).

**Step 2: Commit**

```bash
git add src/renderer/components/Terminal/Terminal.tsx
git commit -m "feat: handle output buffer restoration on terminal reconnect"
```

---

### Task 10: Update all terminal spawn callers to use sync pattern

The spawn callers in renderer (TerminalPanel, QuickActions, useKeyboardShortcuts) currently do:
1. Call `window.api.spawnTerminal()`
2. Manually call `addTerminal()` with constructed Terminal object

This dual-write pattern is the root cause. We need to ensure main is always the authority. The cleanest approach: after spawn, call `syncFromMain()` instead of manually adding. But this adds latency. Better approach: keep the manual add for responsiveness (optimistic update) but ensure sync will reconcile.

Actually the current pattern is fine because:
- `addTerminal()` adds to renderer immediately (optimistic)
- Main process already has the terminal after spawn returns
- `syncFromMain()` will see it exists in both and keep the renderer version

No changes needed here. The existing pattern works with the sync mechanism.

However, we should pass `task` to `spawnTerminal` so main stores it:

**Files:**
- Modify: `src/renderer/components/TerminalPanel/TerminalPanel.tsx:30-41`
- Modify: `src/renderer/components/LeftSidebar/QuickActions.tsx:53-70`
- Modify: `src/renderer/hooks/useKeyboardShortcuts.ts:18-31`

**Step 1: No changes needed for TerminalPanel and useKeyboardShortcuts**

The `spawnTerminal` calls in these files don't have a task, and the main process `spawn` handler already handles `task` as optional. No code changes required.

**Step 2: Update QuickActions to pass task to actions**

In `QuickActions.tsx`, the `executeAndTrack` function (line 53-70) calls various APIs that return SpawnResult. The task is already being set via the updated IPC handlers in Task 4, so no renderer changes needed.

**Step 3: Commit** (skip if no changes)

This task requires no code changes. The work was already done in Task 4 (storing task in main process).

---

### Task 11: Manual testing checklist

This is not a code task but a verification plan:

1. **Start app, spawn 2-3 terminals** → verify they appear in UI
2. **Close laptop lid (sleep), wait 10 seconds, open lid (wake)** → verify terminals still appear in UI
3. **Check terminal output** → verify you can see previous output (from buffer)
4. **Type in terminal after wake** → verify input still works
5. **Cmd+Q after wake** → verify quit dialog shows correct terminal count
6. **Spawn new terminal after wake** → verify it appears normally
7. **Kill a terminal after wake** → verify it disappears from UI
8. **Reload renderer (Cmd+R in dev mode) with active terminals** → verify terminals reappear after reload via sync

---

## Summary of All File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/types.ts` | Modify | Add `TerminalInfo` interface |
| `src/shared/ipc-channels.ts` | Modify | Add `TERMINAL_LIST`, `TERMINAL_BUFFER`, `TERMINAL_SYNC` channels |
| `src/main/terminal/types.ts` | Modify | Add `task`, `outputBuffer` to `ManagedTerminal` |
| `src/main/terminal/TerminalManager.ts` | Modify | Add output buffering, `getTerminalList()`, `getOutputBuffer()`, `setTask()` |
| `src/main/ipc/handlers.ts` | Modify | Add `TERMINAL_LIST`/`TERMINAL_BUFFER` handlers, store task in spawn/action/persona handlers |
| `src/preload/index.ts` | Modify | Add `listTerminals()`, `getTerminalBuffer()`, `onTerminalSync()` |
| `src/renderer/stores/useTerminalStore.ts` | Modify | Add `syncFromMain()` method |
| `src/renderer/components/Layout/Layout.tsx` | Modify | Add sync on startup, visibility change, and TERMINAL_SYNC event |
| `src/main/index.ts` | Modify | Add `powerMonitor.on('resume')` to send TERMINAL_SYNC |
| `src/renderer/components/Terminal/Terminal.tsx` | Modify | Handle output buffer restoration on reconnect |
