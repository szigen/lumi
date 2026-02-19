# Debug Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive Debug Mode view with a 5-stage guided workflow (Describe → Instrument → Reproduce → Diagnose → Verify) for structured bug diagnosis, with two swappable engine implementations tested via git worktrees.

**Architecture:** Engine abstraction is the core pattern. UI layer (`useDebugStore` + components) talks to a `DebugEngine` interface — never directly to terminals or IPC. Two concrete engines (`SingleSessionEngine` and `MultiSessionEngine`) are developed on separate git worktrees and tested in parallel. Shared foundation (types, storage, UI, log watcher) is built on `main` first, then each worktree adds its engine.

**Tech Stack:** Electron IPC, Zustand 5, React 19, Framer Motion 12, xterm.js 6, node-pty, fs.watch, BEM CSS

**Worktree Strategy:**
```
main branch
  └── Tasks 1-12: shared foundation (types, storage, IPC, UI shell, integration)
      ├── worktree-A (debug/single-session): Task 13 — SingleSessionEngine
      └── worktree-B (debug/multi-session): Task 14 — MultiSessionEngine
Task 15: smoke test on each worktree
```

---

### Task 1: Add shared debug types

**Files:**
- Create: `src/shared/debug-types.ts`

**Step 1: Create type definitions**

```typescript
// src/shared/debug-types.ts
export type DebugStage = 'describe' | 'instrument' | 'reproduce' | 'diagnose' | 'verify'

export type DebugEngineType = 'single-session' | 'multi-session'

export interface LogLocation {
  file: string
  line: number
  logStatement: string
}

export interface LogEntry {
  timestamp: string
  message: string
  source?: string
}

export interface InstrumentResult {
  logLocations: LogLocation[]
  reproSteps: string[]
  logFilePath: string
  terminalId: string
}

export interface DiagnoseResult {
  diagnosis: string
  filesChanged: { file: string; summary: string }[]
  terminalId: string
}

export interface DebugSession {
  id: string
  repoPath: string
  title: string
  description: string
  stage: DebugStage
  status: 'active' | 'completed' | 'abandoned'
  createdAt: string
  completedAt?: string
  logLocations?: LogLocation[]
  reproSteps?: string[]
  logFilePath?: string
  collectedLogs?: LogEntry[]
  diagnosis?: string
  fixApplied?: boolean
  result?: 'fixed' | 'not-fixed'
  resultNotes?: string
  engineType: DebugEngineType
  terminalIds: string[]
}
```

**Step 2: Update `src/shared/CLAUDE.md`** — add `debug-types.ts` to Files section.

**Step 3: Commit**

```bash
git add src/shared/debug-types.ts src/shared/CLAUDE.md
git commit -m "feat(debug): add shared debug session and engine type definitions"
```

---

### Task 2: Add IPC channels for debug mode

**Files:**
- Modify: `src/shared/ipc-channels.ts` — add after bug channels (line 100)

**Step 1: Add debug channel constants**

Insert before the `// App lifecycle` comment:

```typescript
  // Debug mode operations
  DEBUG_LIST_SESSIONS: 'debug:list-sessions',
  DEBUG_CREATE_SESSION: 'debug:create-session',
  DEBUG_UPDATE_SESSION: 'debug:update-session',
  DEBUG_DELETE_SESSION: 'debug:delete-session',
  DEBUG_SPAWN_TERMINAL: 'debug:spawn-terminal',
  DEBUG_WRITE_TERMINAL: 'debug:write-terminal',
  DEBUG_START_LOG_WATCH: 'debug:start-log-watch',
  DEBUG_STOP_LOG_WATCH: 'debug:stop-log-watch',
  DEBUG_LOG_ENTRY: 'debug:log-entry',
```

Note: No engine-specific channels. Engines use generic `DEBUG_SPAWN_TERMINAL` and `DEBUG_WRITE_TERMINAL` — the engine decides what prompt to write and whether terminal is interactive or headless.

**Step 2: Commit**

```bash
git add src/shared/ipc-channels.ts
git commit -m "feat(debug): add engine-agnostic IPC channels for debug mode"
```

---

### Task 3: Extend UIState with debug view

**Files:**
- Modify: `src/shared/types.ts:81`
- Modify: `src/renderer/stores/useAppStore.ts`

**Step 1: Update UIState**

```typescript
// src/shared/types.ts line 81, change:
  activeView: 'terminals' | 'bugs'
// to:
  activeView: 'terminals' | 'bugs' | 'debug'
```

**Step 2: Add toggleDebugView**

In `src/renderer/stores/useAppStore.ts`, next to `toggleBugView`:

```typescript
toggleDebugView: () => {
  set((s) => ({ activeView: s.activeView === 'debug' ? 'terminals' : 'debug' }))
  get().saveUIState()
},
```

**Step 3: Commit**

```bash
git add src/shared/types.ts src/renderer/stores/useAppStore.ts
git commit -m "feat(debug): extend UIState and appStore with debug view toggle"
```

---

### Task 4: Create DebugSessionStorage

**Files:**
- Create: `src/main/debug/DebugSessionStorage.ts`

**Step 1: Implement storage**

Follow `src/main/bug/bug-storage.ts` exactly — hash-based dir, file lock, validation:

```typescript
// src/main/debug/DebugSessionStorage.ts
import * as fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { DebugSession, DebugEngineType } from '../../shared/debug-types'

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export class DebugSessionStorage {
  private baseDir: string
  private locks = new Map<string, Promise<void>>()

  constructor() {
    this.baseDir = path.join(os.homedir(), '.lumi', 'debug-sessions')
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true })
    }
  }

  private hashPath(repoPath: string): string {
    return createHash('sha256').update(repoPath).digest('hex').slice(0, 16)
  }

  private sessionsFile(repoPath: string): string {
    const dir = path.join(this.baseDir, this.hashPath(repoPath))
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return path.join(dir, 'sessions.json')
  }

  private async withLock<T>(repoPath: string, fn: () => Promise<T>): Promise<T> {
    const key = this.hashPath(repoPath)
    const prev = this.locks.get(key) ?? Promise.resolve()
    let resolve: () => void
    const next = new Promise<void>((r) => { resolve = r })
    this.locks.set(key, next)
    try {
      await prev
      return await fn()
    } finally {
      resolve!()
      if (this.locks.get(key) === next) this.locks.delete(key)
    }
  }

  private async readSessions(repoPath: string): Promise<DebugSession[]> {
    const file = this.sessionsFile(repoPath)
    try {
      const data = await fs.readFile(file, 'utf-8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      console.error('[DebugSessionStorage] Read failed:', file, err)
      return []
    }
  }

  private async saveSessions(repoPath: string, sessions: DebugSession[]): Promise<void> {
    await fs.writeFile(this.sessionsFile(repoPath), JSON.stringify(sessions, null, 2))
  }

  async list(repoPath: string): Promise<DebugSession[]> {
    return this.readSessions(repoPath)
  }

  async create(repoPath: string, title: string, description: string, engineType: DebugEngineType): Promise<DebugSession> {
    const t = (title ?? '').trim()
    if (!t) throw new Error('Title is required')
    if (t.length > MAX_TITLE_LENGTH) throw new Error(`Title exceeds ${MAX_TITLE_LENGTH} chars`)
    const d = (description ?? '').trim()
    if (d.length > MAX_DESCRIPTION_LENGTH) throw new Error(`Description exceeds ${MAX_DESCRIPTION_LENGTH} chars`)

    return this.withLock(repoPath, async () => {
      const sessions = await this.readSessions(repoPath)
      const session: DebugSession = {
        id: uuidv4(), repoPath, title: t, description: d,
        stage: 'describe', status: 'active',
        createdAt: new Date().toISOString(),
        engineType, terminalIds: []
      }
      sessions.push(session)
      await this.saveSessions(repoPath, sessions)
      return session
    })
  }

  async update(repoPath: string, sessionId: string, updates: Partial<DebugSession>): Promise<DebugSession | null> {
    return this.withLock(repoPath, async () => {
      const sessions = await this.readSessions(repoPath)
      const idx = sessions.findIndex(s => s.id === sessionId)
      if (idx === -1) return null
      Object.assign(sessions[idx], updates)
      if (updates.status === 'completed') sessions[idx].completedAt = new Date().toISOString()
      await this.saveSessions(repoPath, sessions)
      return sessions[idx]
    })
  }

  async delete(repoPath: string, sessionId: string): Promise<boolean> {
    return this.withLock(repoPath, async () => {
      const sessions = await this.readSessions(repoPath)
      const filtered = sessions.filter(s => s.id !== sessionId)
      if (filtered.length === sessions.length) return false
      await this.saveSessions(repoPath, filtered)
      return true
    })
  }
}
```

**Step 2: Commit**

```bash
git add src/main/debug/DebugSessionStorage.ts
git commit -m "feat(debug): add persistent debug session storage"
```

---

### Task 5: Create LogWatcher

**Files:**
- Create: `src/main/debug/LogWatcher.ts`

**Step 1: Implement watcher**

```typescript
// src/main/debug/LogWatcher.ts
import { watch, existsSync } from 'fs'
import * as fs from 'fs/promises'
import type { FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { LogEntry } from '../../shared/debug-types'

export class LogWatcher {
  private watcher: FSWatcher | null = null
  private lastSize = 0

  async start(filePath: string, sessionId: string, window: BrowserWindow): Promise<boolean> {
    this.stop()
    if (!existsSync(filePath)) {
      await fs.writeFile(filePath, '')
    }
    this.lastSize = 0

    try {
      this.watcher = watch(filePath, async () => {
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          if (content.length <= this.lastSize) return
          const newContent = content.slice(this.lastSize)
          this.lastSize = content.length
          for (const line of newContent.split('\n').filter(Boolean)) {
            const entry: LogEntry = { timestamp: new Date().toISOString(), message: line.trim() }
            if (window && !window.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.DEBUG_LOG_ENTRY, sessionId, entry)
            }
          }
        } catch { /* file temporarily locked during write */ }
      })
      return true
    } catch (err) {
      console.error('[LogWatcher] Start failed:', err)
      return false
    }
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = null
    this.lastSize = 0
  }
}
```

**Step 2: Commit**

```bash
git add src/main/debug/LogWatcher.ts
git commit -m "feat(debug): add fs.watch-based log file watcher"
```

---

### Task 6: Register debug IPC handlers

**Files:**
- Create: `src/main/ipc/handlers/register-debug-handlers.ts`
- Modify: `src/main/ipc/handlers/types.ts` — add to context
- Modify: `src/main/ipc/handlers.ts` — instantiate and wire

**Step 1: Extend IpcHandlerContext**

In `src/main/ipc/handlers/types.ts`, add:

```typescript
import type { DebugSessionStorage } from '../../debug/DebugSessionStorage'
import type { LogWatcher } from '../../debug/LogWatcher'
```

Add fields to interface:
```typescript
  debugSessionStorage: DebugSessionStorage
  logWatcher: LogWatcher
```

**Step 2: Create handler file**

These handlers are engine-agnostic. They just do CRUD on sessions + provide a generic terminal spawn/write and log watch. The engine logic lives in the renderer.

```typescript
// src/main/ipc/handlers/register-debug-handlers.ts
import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { DebugSession, DebugEngineType } from '../../../shared/debug-types'
import type { IpcHandlerContext } from './types'

function isValidRepoPath(repoPath: string): boolean {
  return (
    typeof repoPath === 'string' &&
    path.isAbsolute(repoPath) &&
    !repoPath.includes('..') &&
    existsSync(repoPath)
  )
}

export function registerDebugHandlers(context: IpcHandlerContext): void {
  const { getMainWindow, terminalManager, debugSessionStorage, logWatcher } = context

  // CRUD
  ipcMain.handle(IPC_CHANNELS.DEBUG_LIST_SESSIONS, async (_, repoPath: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.list(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_CREATE_SESSION, async (_, repoPath: string, title: string, description: string, engineType: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.create(repoPath, title, description, engineType as DebugEngineType)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_UPDATE_SESSION, async (_, repoPath: string, sessionId: string, updates: Partial<DebugSession>) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.update(repoPath, sessionId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_DELETE_SESSION, async (_, repoPath: string, sessionId: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.delete(repoPath, sessionId)
  })

  // Generic terminal spawn — engine decides what to do with it
  ipcMain.handle(IPC_CHANNELS.DEBUG_SPAWN_TERMINAL, async (_, repoPath: string, task: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    const result = terminalManager.spawn(repoPath, mainWindow)
    if (result) terminalManager.setTask(result.id, task)
    return result
  })

  // Generic terminal write — engine builds the command, this just writes it
  ipcMain.handle(IPC_CHANNELS.DEBUG_WRITE_TERMINAL, async (_, terminalId: string, data: string) => {
    return terminalManager.write(terminalId, data)
  })

  // Log watcher
  ipcMain.handle(IPC_CHANNELS.DEBUG_START_LOG_WATCH, async (_, filePath: string, sessionId: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return false
    return logWatcher.start(filePath, sessionId, mainWindow)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_STOP_LOG_WATCH, async () => {
    logWatcher.stop()
    return true
  })
}
```

**Step 3: Wire in handlers.ts**

In `src/main/ipc/handlers.ts`:

Add imports:
```typescript
import { DebugSessionStorage } from '../debug/DebugSessionStorage'
import { LogWatcher } from '../debug/LogWatcher'
import { registerDebugHandlers } from './handlers/register-debug-handlers'
```

After `const bugStorage = new BugStorage()` (line 60):
```typescript
  const debugSessionStorage = new DebugSessionStorage()
  const logWatcher = new LogWatcher()
```

Add to context object:
```typescript
    debugSessionStorage,
    logWatcher,
```

After `registerBugHandlers(context)` (line 119):
```typescript
  registerDebugHandlers(context)
```

**Step 4: Commit**

```bash
git add src/main/ipc/handlers/register-debug-handlers.ts src/main/ipc/handlers/types.ts src/main/ipc/handlers.ts
git commit -m "feat(debug): register engine-agnostic debug IPC handlers"
```

---

### Task 7: Add debug preload API

**Files:**
- Modify: `src/preload/index.ts`

**Step 1: Add debug methods after bug operations section (after line 144)**

```typescript
  // Debug mode operations
  listDebugSessions: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.DEBUG_LIST_SESSIONS, repoPath),
  createDebugSession: (repoPath: string, title: string, description: string, engineType: string) =>
    invokeIpc<unknown>(IPC_CHANNELS.DEBUG_CREATE_SESSION, repoPath, title, description, engineType),
  updateDebugSession: (repoPath: string, sessionId: string, updates: Record<string, unknown>) =>
    invokeIpc<unknown>(IPC_CHANNELS.DEBUG_UPDATE_SESSION, repoPath, sessionId, updates),
  deleteDebugSession: (repoPath: string, sessionId: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.DEBUG_DELETE_SESSION, repoPath, sessionId),
  debugSpawnTerminal: (repoPath: string, task: string) =>
    invokeIpc<{ id: string; name: string; isNew: boolean } | null>(IPC_CHANNELS.DEBUG_SPAWN_TERMINAL, repoPath, task),
  debugWriteTerminal: (terminalId: string, data: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.DEBUG_WRITE_TERMINAL, terminalId, data),
  startDebugLogWatch: (filePath: string, sessionId: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.DEBUG_START_LOG_WATCH, filePath, sessionId),
  stopDebugLogWatch: () =>
    invokeIpc<boolean>(IPC_CHANNELS.DEBUG_STOP_LOG_WATCH),
  onDebugLogEntry: (cb: (sessionId: string, entry: { timestamp: string; message: string; source?: string }) => void) =>
    createIpcListener<[string, { timestamp: string; message: string; source?: string }]>(IPC_CHANNELS.DEBUG_LOG_ENTRY, cb),
```

**Step 2: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat(debug): expose debug mode API in preload bridge"
```

---

### Task 8: Create DebugEngine interface

This is the key abstraction. It lives in the renderer and talks to the preload API. Both engines implement this same interface.

**Files:**
- Create: `src/renderer/engines/DebugEngine.ts`
- Create: `src/renderer/engines/prompts.ts`

**Step 1: Define interface**

```typescript
// src/renderer/engines/DebugEngine.ts
import type { DebugSession, InstrumentResult, DiagnoseResult, LogEntry } from '../../shared/debug-types'

/**
 * Abstract engine interface for debug workflows.
 * UI calls these methods — engine decides HOW to interact with AI.
 */
export interface DebugEngine {
  /**
   * Analyze bug, add debug logs, return repro steps.
   * Called when transitioning from Describe → Instrument.
   */
  instrument(session: DebugSession): Promise<InstrumentResult>

  /**
   * Read collected logs, diagnose root cause, apply fix.
   * Called when transitioning from Reproduce → Diagnose.
   */
  diagnose(session: DebugSession, logs: LogEntry[]): Promise<DiagnoseResult>

  /**
   * Remove debug logging from codebase.
   * Called when user marks as Fixed in Verify stage.
   */
  cleanup(session: DebugSession): Promise<void>

  /** Terminal IDs this engine is currently using */
  getActiveTerminalIds(): string[]

  /** Dispose engine resources (kill terminals, stop watchers) */
  dispose(): void
}

/**
 * Factory function type. Store calls this to create engine for a session.
 */
export type DebugEngineFactory = (session: DebugSession) => DebugEngine
```

**Step 2: Create shared prompts (used by both engines)**

```typescript
// src/renderer/engines/prompts.ts
export function buildInstrumentPrompt(title: string, description: string): string {
  return `I need to debug a bug. Here's the description:

Title: ${title}
Description: ${description}

Please:
1. Analyze the codebase to identify likely source
2. Add debug logging with [DEBUG] prefix to relevant locations
3. Also write debug output to ./debug.log file
4. Tell me the reproduction steps`
}

export function buildDiagnosePrompt(title: string, description: string, logs: string): string {
  return `The bug was reproduced. Here are the debug logs:

${logs || '(No logs collected)'}

Original bug:
Title: ${title}
Description: ${description}

Please:
1. Analyze the logs to find root cause
2. Apply a fix
3. Remove all [DEBUG] logging you added
4. Explain what was wrong and what you fixed`
}

export function buildCleanupPrompt(): string {
  return 'Remove all [DEBUG] logging statements from the codebase and delete debug.log if it exists.'
}
```

**Step 3: Commit**

```bash
git add src/renderer/engines/DebugEngine.ts src/renderer/engines/prompts.ts
git commit -m "feat(debug): define DebugEngine interface, factory type, and shared prompts"
```

---

### Task 9: Create useDebugStore (engine-aware)

The store holds sessions and delegates stage work to the active engine.

**Files:**
- Create: `src/renderer/stores/useDebugStore.ts`

**Step 1: Implement store**

```typescript
// src/renderer/stores/useDebugStore.ts
import { create } from 'zustand'
import type { DebugSession, DebugStage, LogEntry, DebugEngineType } from '../../shared/debug-types'
import type { DebugEngine, DebugEngineFactory } from '../engines/DebugEngine'

interface DebugState {
  sessions: DebugSession[]
  activeSessionId: string | null
  loading: boolean

  // Engine
  engineFactory: DebugEngineFactory | null
  activeEngine: DebugEngine | null

  // Log watcher (used by MultiSessionEngine, passive for SingleSession)
  logWatcherActive: boolean
  liveLogEntries: LogEntry[]

  // Stage processing
  stageProcessing: boolean

  // Actions
  setEngineFactory: (factory: DebugEngineFactory) => void
  loadSessions: (repoPath: string) => Promise<void>
  createSession: (repoPath: string, title: string, description: string, engineType: DebugEngineType) => Promise<DebugSession | null>
  selectSession: (sessionId: string | null) => void
  updateSession: (repoPath: string, sessionId: string, updates: Partial<DebugSession>) => Promise<void>
  deleteSession: (repoPath: string, sessionId: string) => Promise<void>

  // Stage transitions (delegated to engine)
  startInstrument: (repoPath: string, session: DebugSession) => Promise<void>
  startDiagnose: (repoPath: string, session: DebugSession) => Promise<void>
  startCleanup: (repoPath: string, session: DebugSession) => Promise<void>
  completeSession: (repoPath: string, sessionId: string, result: 'fixed' | 'not-fixed', notes?: string) => Promise<void>
  abandonSession: (repoPath: string, sessionId: string) => Promise<void>
  goBackToStage: (repoPath: string, sessionId: string, stage: DebugStage) => Promise<void>

  // Log watcher
  startLogWatch: (filePath: string, sessionId: string) => Promise<void>
  stopLogWatch: () => Promise<void>
  appendLogEntry: (entry: LogEntry) => void
  subscribeToLogEntries: () => () => void

  // Cleanup
  disposeEngine: () => void
}

const STAGE_ORDER: DebugStage[] = ['describe', 'instrument', 'reproduce', 'diagnose', 'verify']

export const useDebugStore = create<DebugState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  engineFactory: null,
  activeEngine: null,
  logWatcherActive: false,
  liveLogEntries: [],
  stageProcessing: false,

  setEngineFactory: (factory) => set({ engineFactory: factory }),

  loadSessions: async (repoPath) => {
    set({ loading: true })
    try {
      const sessions = await window.api.listDebugSessions(repoPath) as DebugSession[]
      set({ sessions, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createSession: async (repoPath, title, description, engineType) => {
    try {
      const session = await window.api.createDebugSession(repoPath, title, description, engineType) as DebugSession
      // Create engine for this session
      const factory = get().engineFactory
      const engine = factory ? factory(session) : null
      set((s) => ({
        sessions: [...s.sessions, session],
        activeSessionId: session.id,
        activeEngine: engine,
        liveLogEntries: []
      }))
      return session
    } catch {
      return null
    }
  },

  selectSession: (sessionId) => {
    get().disposeEngine()
    const session = get().sessions.find((s) => s.id === sessionId)
    const factory = get().engineFactory
    const engine = session && factory ? factory(session) : null
    set({
      activeSessionId: sessionId,
      activeEngine: engine,
      liveLogEntries: [],
      stageProcessing: false
    })
  },

  updateSession: async (repoPath, sessionId, updates) => {
    const result = await window.api.updateDebugSession(repoPath, sessionId, updates) as DebugSession | null
    if (result) {
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === sessionId ? result : sess))
      }))
    }
  },

  deleteSession: async (repoPath, sessionId) => {
    if (get().activeSessionId === sessionId) get().disposeEngine()
    await window.api.deleteDebugSession(repoPath, sessionId)
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== sessionId),
      activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId
    }))
  },

  startInstrument: async (repoPath, session) => {
    const engine = get().activeEngine
    if (!engine) return
    set({ stageProcessing: true })
    try {
      const result = await engine.instrument(session)
      await get().updateSession(repoPath, session.id, {
        stage: 'reproduce',
        logLocations: result.logLocations,
        reproSteps: result.reproSteps,
        logFilePath: result.logFilePath,
        terminalIds: [...session.terminalIds, result.terminalId]
      })
    } finally {
      set({ stageProcessing: false })
    }
  },

  startDiagnose: async (repoPath, session) => {
    const engine = get().activeEngine
    if (!engine) return
    set({ stageProcessing: true })
    try {
      const logs = get().liveLogEntries
      const result = await engine.diagnose(session, logs)
      await get().updateSession(repoPath, session.id, {
        stage: 'verify',
        diagnosis: result.diagnosis,
        collectedLogs: logs,
        fixApplied: true,
        terminalIds: [...session.terminalIds, result.terminalId]
      })
    } finally {
      set({ stageProcessing: false })
    }
  },

  startCleanup: async (repoPath, session) => {
    const engine = get().activeEngine
    if (!engine) return
    await engine.cleanup(session)
  },

  completeSession: async (repoPath, sessionId, result, notes) => {
    await get().updateSession(repoPath, sessionId, {
      status: 'completed', result, resultNotes: notes
    })
    get().stopLogWatch()
    get().disposeEngine()
  },

  abandonSession: async (repoPath, sessionId) => {
    await get().updateSession(repoPath, sessionId, { status: 'abandoned' })
    get().stopLogWatch()
    get().disposeEngine()
  },

  goBackToStage: async (repoPath, sessionId, stage) => {
    await get().updateSession(repoPath, sessionId, { stage })
    set({ liveLogEntries: [], stageProcessing: false })
  },

  startLogWatch: async (filePath, sessionId) => {
    const started = await window.api.startDebugLogWatch(filePath, sessionId)
    set({ logWatcherActive: started })
  },

  stopLogWatch: async () => {
    await window.api.stopDebugLogWatch()
    set({ logWatcherActive: false })
  },

  appendLogEntry: (entry) => {
    set((s) => ({ liveLogEntries: [...s.liveLogEntries, entry] }))
  },

  subscribeToLogEntries: () => {
    const cleanup = window.api.onDebugLogEntry((_sessionId: string, entry: { timestamp: string; message: string; source?: string }) => {
      const state = useDebugStore.getState()
      if (state.activeSessionId === _sessionId) {
        state.appendLogEntry(entry)
      }
    })
    return cleanup
  },

  disposeEngine: () => {
    get().activeEngine?.dispose()
    set({ activeEngine: null })
  }
}))

// Memoized selector
let _cachedSession: DebugSession | null = null
let _cachedId: string | null = null
let _cachedLen = 0

export const selectActiveSession = (state: DebugState): DebugSession | undefined => {
  if (state.activeSessionId === _cachedId && state.sessions.length === _cachedLen) {
    return _cachedSession ?? undefined
  }
  _cachedId = state.activeSessionId
  _cachedLen = state.sessions.length
  _cachedSession = state.sessions.find((s) => s.id === state.activeSessionId) ?? null
  return _cachedSession ?? undefined
}
```

**Step 2: Commit**

```bash
git add src/renderer/stores/useDebugStore.ts
git commit -m "feat(debug): add engine-aware useDebugStore"
```

---

### Task 10: Create DebugMode UI components

**Files:**
- Create: `src/renderer/components/DebugMode/index.ts`
- Create: `src/renderer/components/DebugMode/DebugMode.tsx`
- Create: `src/renderer/components/DebugMode/DebugStepper.tsx`
- Create: `src/renderer/components/DebugMode/SessionHistory.tsx`
- Create: `src/renderer/components/DebugMode/stages/DescribeStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/InstrumentStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/ReproduceStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/DiagnoseStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/VerifyStage.tsx`
- Create: `src/renderer/components/DebugMode/DebugMode.css`

This task creates all UI components. They are engine-agnostic — they call `useDebugStore` methods which delegate to the active engine.

**Key points:**
- `DebugMode.tsx` — root: session history vs active session routing, two-column layout (stage content + terminal)
- `DebugStepper.tsx` — horizontal 5-stage progress bar
- `SessionHistory.tsx` — list past sessions + "New" button
- Stage components call store methods (`startInstrument`, `startDiagnose`, `completeSession`, etc.)
- Terminal rendered via existing `<Terminal terminalId={id} />` component
- Active terminal ID comes from `engine.getActiveTerminalIds()`

Refer to previous plan (Tasks 9-11) for exact component code. The only change: stage components call `useDebugStore` methods instead of directly spawning terminals.

**DescribeStage change from old plan:**
```tsx
// Instead of hardcoding engine type, pass it from store's engineFactory context
const session = await createSession(repoPath, title, description, 'single-session')
// The store's createSession calls engineFactory(session) to create the engine
if (session) {
  await startInstrument(repoPath, session)
}
```

**ReproduceStage change:**
```tsx
// Instead of directly calling IPC, use store
const handleProceed = async () => {
  if (activeSession) {
    await startDiagnose(repoPath, activeSession)
  }
}
```

**VerifyStage change:**
```tsx
const handleFixed = async () => {
  if (activeSession) {
    await startCleanup(repoPath, activeSession)
    await completeSession(repoPath, activeSession.id, 'fixed', notes)
  }
}
```

**Step 1: Create all component files** (use previous plan's code with the store method adjustments noted above)

**Step 2: Commit**

```bash
git add src/renderer/components/DebugMode/
git commit -m "feat(debug): add DebugMode UI components and CSS"
```

---

### Task 11: Integrate into LeftSidebar and Layout

**Files:**
- Modify: `src/renderer/components/LeftSidebar/LeftSidebar.tsx`
- Modify: `src/renderer/components/Layout/Layout.tsx`

**Step 1: Add Debug Mode button to LeftSidebar**

Import `Crosshair` from lucide-react. Add `toggleDebugView` from `useAppStore`. After the Known Bugs button:

```tsx
<button
  className={`known-bugs-btn ${activeView === 'debug' ? 'known-bugs-btn--active' : ''}`}
  onClick={toggleDebugView}
  disabled={!activeRepo}
>
  <Crosshair size={16} />
  <span>Debug Mode</span>
</button>
```

**Step 2: Add view routing in Layout**

Import `DebugMode`. Change view conditional:

```tsx
{activeView === 'debug' ? <DebugMode /> : activeView === 'bugs' ? <BugTracker /> : <TerminalPanel />}
```

**Step 3: Commit**

```bash
git add src/renderer/components/LeftSidebar/LeftSidebar.tsx src/renderer/components/Layout/Layout.tsx
git commit -m "feat(debug): integrate debug mode into sidebar and layout routing"
```

---

### Task 12: Update CLAUDE.md files, typecheck, lint

**Files:**
- Create: `src/main/debug/CLAUDE.md`
- Create: `src/renderer/components/DebugMode/CLAUDE.md`
- Create: `src/renderer/engines/CLAUDE.md`
- Modify: `src/shared/CLAUDE.md`
- Modify: `src/main/ipc/CLAUDE.md`

**Step 1: Create CLAUDE.md files** — document each module's purpose and rules.

**Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1
```

**Step 3: Run lint, fix issues**

```bash
npm run lint 2>&1
```

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: add CLAUDE.md for debug modules, fix typecheck and lint"
```

---

### Task 13: Implement SingleSessionEngine (worktree-A)

**Setup:** Create worktree from current main.

```bash
git branch debug/single-session
git worktree add ../ai-orchestrator-single-session debug/single-session
```

**Files (in worktree-A):**
- Create: `src/renderer/engines/SingleSessionEngine.ts`
- Modify: `src/renderer/components/DebugMode/DebugMode.tsx` — wire factory

**Step 1: Implement engine**

```typescript
// src/renderer/engines/SingleSessionEngine.ts
import type { DebugEngine } from './DebugEngine'
import type { DebugSession, InstrumentResult, DiagnoseResult, LogEntry } from '../../shared/debug-types'
import { buildInstrumentPrompt, buildDiagnosePrompt, buildCleanupPrompt } from './prompts'

export class SingleSessionEngine implements DebugEngine {
  private terminalId: string | null = null

  async instrument(session: DebugSession): Promise<InstrumentResult> {
    // Spawn one interactive terminal — this will be the single session for all stages
    const result = await window.api.debugSpawnTerminal(session.repoPath, 'Debug: Analyzing')
    if (!result) throw new Error('Failed to spawn terminal')
    this.terminalId = result.id

    // Write instrument prompt to the interactive session
    const prompt = buildInstrumentPrompt(session.title, session.description)
    // Use heredoc to write prompt to the interactive claude/codex session
    setTimeout(() => {
      window.api.debugWriteTerminal(this.terminalId!, prompt + '\r')
    }, 1000) // wait for CLI to boot

    // Since this is interactive, we can't parse structured output easily.
    // Return placeholder — user advances manually by watching terminal.
    return {
      logLocations: [],
      reproSteps: [],
      logFilePath: `${session.repoPath}/debug.log`,
      terminalId: result.id
    }
  }

  async diagnose(session: DebugSession, logs: LogEntry[]): Promise<DiagnoseResult> {
    if (!this.terminalId) throw new Error('No active terminal')

    // Write diagnose prompt to the SAME terminal session
    const logsText = logs.map((e) => `[${e.timestamp}] ${e.message}`).join('\n')
    const prompt = buildDiagnosePrompt(session.title, session.description, logsText)
    window.api.debugWriteTerminal(this.terminalId, prompt + '\r')

    return {
      diagnosis: '',
      filesChanged: [],
      terminalId: this.terminalId
    }
  }

  async cleanup(session: DebugSession): Promise<void> {
    if (!this.terminalId) return
    const prompt = buildCleanupPrompt()
    window.api.debugWriteTerminal(this.terminalId, prompt + '\r')
  }

  getActiveTerminalIds(): string[] {
    return this.terminalId ? [this.terminalId] : []
  }

  dispose(): void {
    if (this.terminalId) {
      window.api.killTerminal(this.terminalId)
      this.terminalId = null
    }
  }
}
```

**Step 2: Create shared prompts file**

```typescript
// src/renderer/engines/prompts.ts
export function buildInstrumentPrompt(title: string, description: string): string {
  return `I need to debug a bug. Here's the description:

Title: ${title}
Description: ${description}

Please:
1. Analyze the codebase to identify likely source
2. Add debug logging with [DEBUG] prefix to relevant locations
3. Also write debug output to ./debug.log file
4. Tell me the reproduction steps`
}

export function buildDiagnosePrompt(title: string, description: string, logs: string): string {
  return `The bug was reproduced. Here are the debug logs:

${logs || '(No logs collected)'}

Original bug:
Title: ${title}
Description: ${description}

Please:
1. Analyze the logs to find root cause
2. Apply a fix
3. Remove all [DEBUG] logging you added
4. Explain what was wrong and what you fixed`
}

export function buildCleanupPrompt(): string {
  return 'Remove all [DEBUG] logging statements from the codebase and delete debug.log if it exists.'
}
```

**Step 3: Wire factory in DebugMode.tsx**

```typescript
import { SingleSessionEngine } from '../../engines/SingleSessionEngine'

// In DebugMode component, on mount:
useEffect(() => {
  useDebugStore.getState().setEngineFactory(() => new SingleSessionEngine())
}, [])
```

**Step 4: Commit in worktree-A**

```bash
git add src/renderer/engines/SingleSessionEngine.ts src/renderer/engines/prompts.ts src/renderer/components/DebugMode/DebugMode.tsx
git commit -m "feat(debug): implement SingleSessionEngine — one interactive terminal for all stages"
```

---

### Task 14: Implement MultiSessionEngine (worktree-B)

**Setup:** Create worktree from current main.

```bash
git branch debug/multi-session
git worktree add ../ai-orchestrator-multi-session debug/multi-session
```

**Files (in worktree-B):**
- Create: `src/renderer/engines/MultiSessionEngine.ts`
- Modify: `src/renderer/components/DebugMode/DebugMode.tsx` — wire factory

**Step 1: Implement engine**

```typescript
// src/renderer/engines/MultiSessionEngine.ts
import type { DebugEngine } from './DebugEngine'
import type { DebugSession, InstrumentResult, DiagnoseResult, LogEntry } from '../../shared/debug-types'
import { buildInstrumentPrompt, buildDiagnosePrompt, buildCleanupPrompt } from './prompts'
import { buildDelimitedInputCommand } from './command-utils'

export class MultiSessionEngine implements DebugEngine {
  private instrumentTerminalId: string | null = null
  private diagnoseTerminalId: string | null = null

  async instrument(session: DebugSession): Promise<InstrumentResult> {
    // Spawn headless terminal — runs `claude -p` or `codex exec -`
    const result = await window.api.debugSpawnTerminal(session.repoPath, 'Debug: Instrumenting (headless)')
    if (!result) throw new Error('Failed to spawn terminal')
    this.instrumentTerminalId = result.id

    const prompt = buildInstrumentPrompt(session.title, session.description)
    // Headless: write as non-interactive command
    const command = buildDelimitedInputCommand(prompt)
    setTimeout(() => {
      window.api.debugWriteTerminal(this.instrumentTerminalId!, command)
    }, 500)

    return {
      logLocations: [],
      reproSteps: [],
      logFilePath: `${session.repoPath}/debug.log`,
      terminalId: result.id
    }
  }

  async diagnose(session: DebugSession, logs: LogEntry[]): Promise<DiagnoseResult> {
    // Spawn NEW interactive terminal for diagnosis and fix
    const result = await window.api.debugSpawnTerminal(session.repoPath, 'Debug: Diagnosing & fixing')
    if (!result) throw new Error('Failed to spawn terminal')
    this.diagnoseTerminalId = result.id

    const logsText = logs.map((e) => `[${e.timestamp}] ${e.message}`).join('\n')
    const prompt = buildDiagnosePrompt(session.title, session.description, logsText)

    // Interactive: boot CLI, then write prompt
    setTimeout(() => {
      window.api.debugWriteTerminal(this.diagnoseTerminalId!, prompt + '\r')
    }, 1000)

    return {
      diagnosis: '',
      filesChanged: [],
      terminalId: result.id
    }
  }

  async cleanup(session: DebugSession): Promise<void> {
    const termId = this.diagnoseTerminalId || this.instrumentTerminalId
    if (!termId) return
    const prompt = buildCleanupPrompt()
    window.api.debugWriteTerminal(termId, prompt + '\r')
  }

  getActiveTerminalIds(): string[] {
    const ids: string[] = []
    if (this.instrumentTerminalId) ids.push(this.instrumentTerminalId)
    if (this.diagnoseTerminalId) ids.push(this.diagnoseTerminalId)
    return ids
  }

  dispose(): void {
    if (this.instrumentTerminalId) {
      window.api.killTerminal(this.instrumentTerminalId)
      this.instrumentTerminalId = null
    }
    if (this.diagnoseTerminalId) {
      window.api.killTerminal(this.diagnoseTerminalId)
      this.diagnoseTerminalId = null
    }
  }
}
```

**Step 2: Create renderer-side command util**

```typescript
// src/renderer/engines/command-utils.ts

/**
 * Build headless provider command. Provider detected from config.
 * In multi-session mode, instrument runs headless (claude -p / codex exec -)
 */
export function buildDelimitedInputCommand(prompt: string): string {
  const marker = `__DEBUG_${Date.now()}__`
  // Default to claude -p; provider switching handled at main process level
  return `claude -p <<'${marker}'\n${prompt}\n${marker}\r`
}
```

**Step 3: Wire factory in DebugMode.tsx**

```typescript
import { MultiSessionEngine } from '../../engines/MultiSessionEngine'

useEffect(() => {
  useDebugStore.getState().setEngineFactory(() => new MultiSessionEngine())
}, [])
```

**Step 4: Commit in worktree-B**

```bash
git add src/renderer/engines/MultiSessionEngine.ts src/renderer/engines/command-utils.ts src/renderer/components/DebugMode/DebugMode.tsx
git commit -m "feat(debug): implement MultiSessionEngine — headless instrument + interactive diagnose"
```

---

### Task 15: Smoke test both worktrees

**Step 1: Test SingleSession (worktree-A)**

```bash
cd ../ai-orchestrator-single-session
npm run dev
```

Checklist:
- [ ] Debug Mode button in sidebar
- [ ] Session history (empty)
- [ ] New session → Describe form
- [ ] Start Debug → single terminal spawns with claude/codex
- [ ] Stepper shows Instrument → Reproduce
- [ ] Proceed → same terminal gets diagnose prompt
- [ ] Verify → Fixed/Not Fixed

**Step 2: Test MultiSession (worktree-B)**

```bash
cd ../ai-orchestrator-multi-session
npm run dev
```

Checklist:
- [ ] Same UI as worktree-A
- [ ] Start Debug → headless terminal runs `claude -p`
- [ ] Reproduce stage → log watcher active if debug.log exists
- [ ] Proceed → NEW terminal spawns for interactive diagnose
- [ ] Verify works same as SingleSession

**Step 3: Document findings**

Compare:
- Reliability of terminal output
- Context quality in diagnose stage
- UX feel (single terminal vs two terminals)
- Log watcher effectiveness

**Step 4: Commit fixes from each worktree**

```bash
# In each worktree
git add -A
git commit -m "fix: polish debug mode after smoke test"
```
