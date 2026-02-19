# Debug Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive Debug Mode view with a 5-stage guided workflow (Describe → Instrument → Reproduce → Diagnose → Verify) for structured bug diagnosis and fix.

**Architecture:** New `debug` view alongside `terminals` and `bugs`. Engine abstraction (`DebugEngine` interface) allows two parallel implementations (SingleSessionEngine, MultiSessionEngine) testable via git worktrees. Main process handles session persistence (`~/.lumi/debug-sessions/`) and log file watching (`fs.watch`). Renderer uses a new Zustand store (`useDebugStore`) and a component tree mirroring BugTracker's pattern.

**Tech Stack:** Electron IPC, Zustand 5, React 19, Framer Motion 12, xterm.js 6, node-pty, fs.watch, BEM CSS

---

### Task 1: Add shared debug types

**Files:**
- Create: `src/shared/debug-types.ts`

**Step 1: Create debug type definitions**

```typescript
// src/shared/debug-types.ts
export type DebugStage = 'describe' | 'instrument' | 'reproduce' | 'diagnose' | 'verify'

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
  engineType: 'single-session' | 'multi-session'
  terminalIds: string[]
}
```

**Step 2: Commit**

```bash
git add src/shared/debug-types.ts
git commit -m "feat(debug): add shared debug session type definitions"
```

---

### Task 2: Add IPC channels for debug mode

**Files:**
- Modify: `src/shared/ipc-channels.ts` (add after line 100, before App lifecycle)

**Step 1: Add debug IPC channel constants**

Add after the `BUGS_APPLY_FIX` line (100):

```typescript
  // Debug mode operations
  DEBUG_LIST_SESSIONS: 'debug:list-sessions',
  DEBUG_CREATE_SESSION: 'debug:create-session',
  DEBUG_UPDATE_SESSION: 'debug:update-session',
  DEBUG_DELETE_SESSION: 'debug:delete-session',
  DEBUG_START_INSTRUMENT: 'debug:start-instrument',
  DEBUG_START_DIAGNOSE: 'debug:start-diagnose',
  DEBUG_CLEANUP_LOGS: 'debug:cleanup-logs',
  DEBUG_START_LOG_WATCH: 'debug:start-log-watch',
  DEBUG_STOP_LOG_WATCH: 'debug:stop-log-watch',
  DEBUG_LOG_ENTRY: 'debug:log-entry',
```

**Step 2: Commit**

```bash
git add src/shared/ipc-channels.ts
git commit -m "feat(debug): add IPC channels for debug mode"
```

---

### Task 3: Extend UIState to support debug view

**Files:**
- Modify: `src/shared/types.ts:81` — extend activeView union
- Modify: `src/renderer/stores/useAppStore.ts` — add toggleDebugView method

**Step 1: Update UIState type**

In `src/shared/types.ts`, change line 81:

```typescript
// Before:
  activeView: 'terminals' | 'bugs'
// After:
  activeView: 'terminals' | 'bugs' | 'debug'
```

**Step 2: Add toggleDebugView to useAppStore**

In `src/renderer/stores/useAppStore.ts`, add next to `toggleBugView`:

```typescript
toggleDebugView: () => {
  set((s) => ({ activeView: s.activeView === 'debug' ? 'terminals' : 'debug' }))
  get().saveUIState()
},
```

**Step 3: Commit**

```bash
git add src/shared/types.ts src/renderer/stores/useAppStore.ts
git commit -m "feat(debug): extend UIState with debug view support"
```

---

### Task 4: Create DebugSessionStorage in main process

**Files:**
- Create: `src/main/debug/DebugSessionStorage.ts`

**Step 1: Implement storage class**

Follow `src/main/bug/bug-storage.ts` pattern exactly (hash-based directory, file locking, validation):

```typescript
// src/main/debug/DebugSessionStorage.ts
import * as fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { DebugSession } from '../../shared/debug-types'

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
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
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
      if (this.locks.get(key) === next) {
        this.locks.delete(key)
      }
    }
  }

  private async readSessions(repoPath: string): Promise<DebugSession[]> {
    const file = this.sessionsFile(repoPath)
    try {
      const data = await fs.readFile(file, 'utf-8')
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      console.error('[DebugSessionStorage] Failed to read:', file, err)
      return []
    }
  }

  private async saveSessions(repoPath: string, sessions: DebugSession[]): Promise<void> {
    await fs.writeFile(this.sessionsFile(repoPath), JSON.stringify(sessions, null, 2))
  }

  async list(repoPath: string): Promise<DebugSession[]> {
    return this.readSessions(repoPath)
  }

  async create(repoPath: string, title: string, description: string, engineType: DebugSession['engineType']): Promise<DebugSession> {
    const trimmedTitle = (title ?? '').trim()
    if (!trimmedTitle) throw new Error('Title is required')
    if (trimmedTitle.length > MAX_TITLE_LENGTH) throw new Error(`Title exceeds ${MAX_TITLE_LENGTH} characters`)
    const trimmedDesc = (description ?? '').trim()
    if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) throw new Error(`Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`)

    return this.withLock(repoPath, async () => {
      const sessions = await this.readSessions(repoPath)
      const session: DebugSession = {
        id: uuidv4(),
        repoPath,
        title: trimmedTitle,
        description: trimmedDesc,
        stage: 'describe',
        status: 'active',
        createdAt: new Date().toISOString(),
        engineType,
        terminalIds: []
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
      if (updates.status === 'completed') {
        sessions[idx].completedAt = new Date().toISOString()
      }
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
git commit -m "feat(debug): add DebugSessionStorage for persistent debug sessions"
```

---

### Task 5: Create LogWatcher in main process

**Files:**
- Create: `src/main/debug/LogWatcher.ts`

**Step 1: Implement log file watcher**

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
  private filePath: string | null = null
  private sessionId: string | null = null

  async start(
    filePath: string,
    sessionId: string,
    window: BrowserWindow
  ): Promise<boolean> {
    this.stop()
    if (!existsSync(filePath)) {
      // Create empty log file so watcher can attach
      await fs.writeFile(filePath, '')
    }

    this.filePath = filePath
    this.sessionId = sessionId
    this.lastSize = 0

    try {
      this.watcher = watch(filePath, async () => {
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          if (content.length <= this.lastSize) return
          const newContent = content.slice(this.lastSize)
          this.lastSize = content.length

          const lines = newContent.split('\n').filter(Boolean)
          for (const line of lines) {
            const entry: LogEntry = {
              timestamp: new Date().toISOString(),
              message: line.trim()
            }
            if (window && !window.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.DEBUG_LOG_ENTRY, sessionId, entry)
            }
          }
        } catch {
          // File might be temporarily unavailable during write
        }
      })
      return true
    } catch (err) {
      console.error('[LogWatcher] Failed to start:', err)
      return false
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    this.filePath = null
    this.sessionId = null
    this.lastSize = 0
  }

  isWatching(): boolean {
    return this.watcher !== null
  }
}
```

**Step 2: Commit**

```bash
git add src/main/debug/LogWatcher.ts
git commit -m "feat(debug): add LogWatcher for real-time debug log file monitoring"
```

---

### Task 6: Register debug IPC handlers

**Files:**
- Create: `src/main/ipc/handlers/register-debug-handlers.ts`
- Modify: `src/main/ipc/handlers/types.ts` — add `debugSessionStorage` and `logWatcher` to context
- Modify: `src/main/ipc/handlers.ts` — instantiate and wire debug services

**Step 1: Update IpcHandlerContext**

In `src/main/ipc/handlers/types.ts`, add imports and fields:

```typescript
import type { DebugSessionStorage } from '../../debug/DebugSessionStorage'
import type { LogWatcher } from '../../debug/LogWatcher'

// Add to IpcHandlerContext interface:
  debugSessionStorage: DebugSessionStorage
  logWatcher: LogWatcher
```

**Step 2: Create register-debug-handlers.ts**

```typescript
// src/main/ipc/handlers/register-debug-handlers.ts
import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { DebugSession } from '../../../shared/debug-types'
import type { IpcHandlerContext } from './types'
import { buildDelimitedInputCommand } from './utils'

function isValidRepoPath(repoPath: string): boolean {
  return (
    typeof repoPath === 'string' &&
    path.isAbsolute(repoPath) &&
    !repoPath.includes('..') &&
    existsSync(repoPath)
  )
}

export function registerDebugHandlers(context: IpcHandlerContext): void {
  const {
    getMainWindow,
    getActiveProvider,
    terminalManager,
    debugSessionStorage,
    logWatcher
  } = context

  ipcMain.handle(IPC_CHANNELS.DEBUG_LIST_SESSIONS, async (_, repoPath: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.list(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_CREATE_SESSION, async (_, repoPath: string, title: string, description: string, engineType: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.create(repoPath, title, description, engineType as DebugSession['engineType'])
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_UPDATE_SESSION, async (_, repoPath: string, sessionId: string, updates: Partial<DebugSession>) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.update(repoPath, sessionId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.DEBUG_DELETE_SESSION, async (_, repoPath: string, sessionId: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return debugSessionStorage.delete(repoPath, sessionId)
  })

  // Spawn terminal and send instrument prompt
  ipcMain.handle(IPC_CHANNELS.DEBUG_START_INSTRUMENT, async (_, repoPath: string, sessionId: string, bugDescription: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')

    const provider = getActiveProvider()
    const result = terminalManager.spawn(repoPath, mainWindow)
    if (!result) return null

    terminalManager.setTask(result.id, 'Debug: Instrumenting')

    const prompt = `You are debugging a reported bug. Here is the bug description:

${bugDescription}

Your task:
1. Analyze the codebase to identify the likely source of this bug
2. Add targeted debug logging (console.log with [DEBUG] prefix) to the relevant code locations
3. Write all debug output to a file called "debug.log" in the project root (in addition to console)
4. List the exact reproduction steps the user should follow

After you're done, output a summary in this exact format:
---LOG_LOCATIONS---
file:line | log statement description
---REPRO_STEPS---
1. Step one
2. Step two
---LOG_FILE---
path/to/debug.log
---END---`

    setTimeout(() => {
      const command = provider === 'codex'
        ? buildDelimitedInputCommand('codex exec -', prompt)
        : buildDelimitedInputCommand('claude -p', prompt)
      terminalManager.write(result.id, command)
    }, 500)

    return result
  })

  // Spawn terminal and send diagnose prompt with collected logs
  ipcMain.handle(IPC_CHANNELS.DEBUG_START_DIAGNOSE, async (_, repoPath: string, sessionId: string, bugDescription: string, collectedLogs: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')

    const provider = getActiveProvider()
    const result = terminalManager.spawn(repoPath, mainWindow)
    if (!result) return null

    terminalManager.setTask(result.id, 'Debug: Diagnosing & fixing')

    const prompt = `You are fixing a bug. Here is the bug description:

${bugDescription}

Here are the debug logs collected during reproduction:

${collectedLogs}

Your task:
1. Analyze the logs to identify the root cause
2. Apply a fix to the codebase
3. Remove all [DEBUG] logging statements you or a previous session added
4. Explain what was wrong and what you fixed

Output a summary of your diagnosis and the fix applied.`

    setTimeout(() => {
      const command = provider === 'codex'
        ? buildDelimitedInputCommand('codex exec -', prompt)
        : buildDelimitedInputCommand('claude -p', prompt)
      terminalManager.write(result.id, command)
    }, 500)

    return result
  })

  // Cleanup debug logs from codebase
  ipcMain.handle(IPC_CHANNELS.DEBUG_CLEANUP_LOGS, async (_, repoPath: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')

    const provider = getActiveProvider()
    const result = terminalManager.spawn(repoPath, mainWindow)
    if (!result) return null

    terminalManager.setTask(result.id, 'Debug: Cleanup')

    const prompt = 'Remove all lines containing [DEBUG] logging statements from the codebase. Also delete the debug.log file if it exists.'

    setTimeout(() => {
      const command = provider === 'codex'
        ? buildDelimitedInputCommand('codex exec -', prompt)
        : buildDelimitedInputCommand('claude -p', prompt)
      terminalManager.write(result.id, command)
    }, 500)

    return result
  })

  // Log watcher controls
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

**Step 3: Wire into handlers.ts**

In `src/main/ipc/handlers.ts`:

Add imports:
```typescript
import { DebugSessionStorage } from '../debug/DebugSessionStorage'
import { LogWatcher } from '../debug/LogWatcher'
import { registerDebugHandlers } from './handlers/register-debug-handlers'
```

In `setupIpcHandlers()`, after `bugStorage` creation:
```typescript
  const debugSessionStorage = new DebugSessionStorage()
  const logWatcher = new LogWatcher()
```

Add to context object:
```typescript
    debugSessionStorage,
    logWatcher,
```

Add registration call after `registerBugHandlers(context)`:
```typescript
  registerDebugHandlers(context)
```

**Step 4: Commit**

```bash
git add src/main/ipc/handlers/register-debug-handlers.ts src/main/ipc/handlers/types.ts src/main/ipc/handlers.ts
git commit -m "feat(debug): register debug IPC handlers with instrument/diagnose/logwatch"
```

---

### Task 7: Add debug preload API

**Files:**
- Modify: `src/preload/index.ts` — add debug operations section

**Step 1: Add debug API methods**

Add after the Bug operations section (after line 144):

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
  startDebugInstrument: (repoPath: string, sessionId: string, bugDescription: string) =>
    invokeIpc<{ id: string; name: string; isNew: boolean } | null>(IPC_CHANNELS.DEBUG_START_INSTRUMENT, repoPath, sessionId, bugDescription),
  startDebugDiagnose: (repoPath: string, sessionId: string, bugDescription: string, collectedLogs: string) =>
    invokeIpc<{ id: string; name: string; isNew: boolean } | null>(IPC_CHANNELS.DEBUG_START_DIAGNOSE, repoPath, sessionId, bugDescription, collectedLogs),
  debugCleanupLogs: (repoPath: string) =>
    invokeIpc<{ id: string; name: string; isNew: boolean } | null>(IPC_CHANNELS.DEBUG_CLEANUP_LOGS, repoPath),
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
git commit -m "feat(debug): expose debug IPC methods in preload bridge"
```

---

### Task 8: Create useDebugStore

**Files:**
- Create: `src/renderer/stores/useDebugStore.ts`

**Step 1: Implement the store**

```typescript
// src/renderer/stores/useDebugStore.ts
import { create } from 'zustand'
import type { DebugSession, DebugStage, LogEntry } from '../../shared/debug-types'

interface DebugState {
  sessions: DebugSession[]
  activeSessionId: string | null
  loading: boolean

  // Log watcher
  logWatcherActive: boolean
  liveLogEntries: LogEntry[]

  // Terminal tracking
  instrumentTerminalId: string | null
  diagnoseTerminalId: string | null

  // Actions
  loadSessions: (repoPath: string) => Promise<void>
  createSession: (repoPath: string, title: string, description: string, engineType: DebugSession['engineType']) => Promise<DebugSession | null>
  selectSession: (sessionId: string | null) => void
  updateSession: (repoPath: string, sessionId: string, updates: Partial<DebugSession>) => Promise<void>
  deleteSession: (repoPath: string, sessionId: string) => Promise<void>
  advanceStage: (repoPath: string, sessionId: string) => Promise<void>
  goBackToStage: (repoPath: string, sessionId: string, stage: DebugStage) => Promise<void>
  completeSession: (repoPath: string, sessionId: string, result: 'fixed' | 'not-fixed', notes?: string) => Promise<void>
  abandonSession: (repoPath: string, sessionId: string) => Promise<void>

  // Instrument
  startInstrument: (repoPath: string, sessionId: string, description: string) => Promise<void>

  // Log watcher
  startLogWatch: (filePath: string, sessionId: string) => Promise<void>
  stopLogWatch: () => Promise<void>
  appendLogEntry: (entry: LogEntry) => void
  clearLogEntries: () => void

  // Diagnose
  startDiagnose: (repoPath: string, sessionId: string, description: string, logs: string) => Promise<void>

  // Cleanup
  cleanupLogs: (repoPath: string) => Promise<void>

  // Log listener
  subscribeToLogEntries: () => () => void

  // Terminal cleanup
  clearTerminals: () => void
}

const STAGE_ORDER: DebugStage[] = ['describe', 'instrument', 'reproduce', 'diagnose', 'verify']

export const useDebugStore = create<DebugState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  logWatcherActive: false,
  liveLogEntries: [],
  instrumentTerminalId: null,
  diagnoseTerminalId: null,

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
      set((s) => ({ sessions: [...s.sessions, session], activeSessionId: session.id }))
      return session
    } catch {
      return null
    }
  },

  selectSession: (sessionId) => {
    set({ activeSessionId: sessionId, liveLogEntries: [], instrumentTerminalId: null, diagnoseTerminalId: null })
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
    await window.api.deleteDebugSession(repoPath, sessionId)
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== sessionId),
      activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId
    }))
  },

  advanceStage: async (repoPath, sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (!session) return
    const currentIdx = STAGE_ORDER.indexOf(session.stage)
    if (currentIdx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIdx + 1]
      await get().updateSession(repoPath, sessionId, { stage: nextStage })
    }
  },

  goBackToStage: async (repoPath, sessionId, stage) => {
    await get().updateSession(repoPath, sessionId, { stage })
  },

  completeSession: async (repoPath, sessionId, result, notes) => {
    await get().updateSession(repoPath, sessionId, {
      status: 'completed',
      result,
      resultNotes: notes
    })
    get().stopLogWatch()
  },

  abandonSession: async (repoPath, sessionId) => {
    await get().updateSession(repoPath, sessionId, { status: 'abandoned' })
    get().stopLogWatch()
  },

  startInstrument: async (repoPath, sessionId, description) => {
    const result = await window.api.startDebugInstrument(repoPath, sessionId, description)
    if (result) {
      set({ instrumentTerminalId: result.id })
      await get().updateSession(repoPath, sessionId, {
        stage: 'instrument',
        terminalIds: [...(get().sessions.find((s) => s.id === sessionId)?.terminalIds ?? []), result.id]
      })
    }
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

  clearLogEntries: () => {
    set({ liveLogEntries: [] })
  },

  startDiagnose: async (repoPath, sessionId, description, logs) => {
    const result = await window.api.startDebugDiagnose(repoPath, sessionId, description, logs)
    if (result) {
      set({ diagnoseTerminalId: result.id })
      await get().updateSession(repoPath, sessionId, {
        stage: 'diagnose',
        collectedLogs: get().liveLogEntries,
        terminalIds: [...(get().sessions.find((s) => s.id === sessionId)?.terminalIds ?? []), result.id]
      })
    }
  },

  cleanupLogs: async (repoPath) => {
    await window.api.debugCleanupLogs(repoPath)
  },

  subscribeToLogEntries: () => {
    const cleanup = window.api.onDebugLogEntry((sessionId: string, entry: { timestamp: string; message: string; source?: string }) => {
      const state = useDebugStore.getState()
      if (state.activeSessionId === sessionId) {
        state.appendLogEntry(entry)
      }
    })
    return cleanup
  },

  clearTerminals: () => {
    set({ instrumentTerminalId: null, diagnoseTerminalId: null })
  }
}))

// Memoized selector for active session
let _cachedActiveSession: DebugSession | null = null
let _cachedActiveId: string | null = null
let _cachedSessionsLength = 0

export const selectActiveSession = (state: DebugState): DebugSession | undefined => {
  if (state.activeSessionId === _cachedActiveId && state.sessions.length === _cachedSessionsLength) {
    return _cachedActiveSession ?? undefined
  }
  _cachedActiveId = state.activeSessionId
  _cachedSessionsLength = state.sessions.length
  _cachedActiveSession = state.sessions.find((s) => s.id === state.activeSessionId) ?? null
  return _cachedActiveSession ?? undefined
}
```

**Step 2: Commit**

```bash
git add src/renderer/stores/useDebugStore.ts
git commit -m "feat(debug): add useDebugStore with full session lifecycle management"
```

---

### Task 9: Create DebugMode component tree (UI shell)

**Files:**
- Create: `src/renderer/components/DebugMode/DebugMode.tsx`
- Create: `src/renderer/components/DebugMode/DebugStepper.tsx`
- Create: `src/renderer/components/DebugMode/SessionHistory.tsx`
- Create: `src/renderer/components/DebugMode/DebugMode.css`
- Create: `src/renderer/components/DebugMode/index.ts`

**Step 1: Create barrel export**

```typescript
// src/renderer/components/DebugMode/index.ts
export { DebugMode } from './DebugMode'
```

**Step 2: Create DebugStepper**

```tsx
// src/renderer/components/DebugMode/DebugStepper.tsx
import { motion } from 'framer-motion'
import type { DebugStage } from '../../../shared/debug-types'

const STAGES: { key: DebugStage; label: string }[] = [
  { key: 'describe', label: 'Describe' },
  { key: 'instrument', label: 'Instrument' },
  { key: 'reproduce', label: 'Reproduce' },
  { key: 'diagnose', label: 'Diagnose' },
  { key: 'verify', label: 'Verify' }
]

interface Props {
  currentStage: DebugStage
}

export function DebugStepper({ currentStage }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="debug-stepper">
      {STAGES.map((stage, idx) => (
        <div key={stage.key} className="debug-stepper__item">
          {idx > 0 && (
            <div className={`debug-stepper__line ${idx <= currentIdx ? 'debug-stepper__line--active' : ''}`} />
          )}
          <motion.div
            className={`debug-stepper__dot ${
              idx < currentIdx ? 'debug-stepper__dot--completed' :
              idx === currentIdx ? 'debug-stepper__dot--current' : ''
            }`}
            animate={idx === currentIdx ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className={`debug-stepper__label ${idx <= currentIdx ? 'debug-stepper__label--active' : ''}`}>
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Create SessionHistory**

```tsx
// src/renderer/components/DebugMode/SessionHistory.tsx
import { Plus } from 'lucide-react'
import type { DebugSession } from '../../../shared/debug-types'

interface Props {
  sessions: DebugSession[]
  onSelect: (sessionId: string) => void
  onNew: () => void
}

export function SessionHistory({ sessions, onSelect, onNew }: Props) {
  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="session-history">
      <div className="session-history__header">
        <h2 className="session-history__title">Debug Mode</h2>
        <button className="session-history__new-btn" onClick={onNew}>
          <Plus size={16} />
          <span>New Debug Session</span>
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="session-history__empty">No debug sessions yet. Start one to diagnose a bug.</p>
      ) : (
        <div className="session-history__list">
          {sorted.map((session) => (
            <button
              key={session.id}
              className="session-history__card"
              onClick={() => onSelect(session.id)}
            >
              <span className={`session-history__status session-history__status--${session.status}`} />
              <div className="session-history__info">
                <span className="session-history__name">{session.title}</span>
                <span className="session-history__meta">
                  {session.status} &middot; {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create DebugMode main component**

```tsx
// src/renderer/components/DebugMode/DebugMode.tsx
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import { useDebugStore, selectActiveSession } from '../../stores/useDebugStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { DebugStepper } from './DebugStepper'
import { SessionHistory } from './SessionHistory'
import { DescribeStage } from './stages/DescribeStage'
import { InstrumentStage } from './stages/InstrumentStage'
import { ReproduceStage } from './stages/ReproduceStage'
import { DiagnoseStage } from './stages/DiagnoseStage'
import { VerifyStage } from './stages/VerifyStage'
import { Terminal } from '../Terminal'
import './DebugMode.css'

export function DebugMode() {
  const activeTab = useAppStore((s) => s.activeTab)
  const getRepoByName = useRepoStore((s) => s.getRepoByName)
  const repo = activeTab ? getRepoByName(activeTab) : null
  const repoPath = repo?.path ?? ''

  const sessions = useDebugStore((s) => s.sessions)
  const activeSession = useDebugStore(selectActiveSession)
  const loadSessions = useDebugStore((s) => s.loadSessions)
  const selectSession = useDebugStore((s) => s.selectSession)
  const createSession = useDebugStore((s) => s.createSession)
  const instrumentTerminalId = useDebugStore((s) => s.instrumentTerminalId)
  const diagnoseTerminalId = useDebugStore((s) => s.diagnoseTerminalId)
  const syncFromMain = useTerminalStore((s) => s.syncFromMain)

  const [showHistory, setShowHistory] = useState(true)

  useEffect(() => {
    if (repoPath) loadSessions(repoPath)
  }, [repoPath, loadSessions])

  // Subscribe to log entry events
  useEffect(() => {
    const cleanup = useDebugStore.getState().subscribeToLogEntries()
    return cleanup
  }, [])

  const handleNewSession = useCallback(() => {
    setShowHistory(false)
    selectSession(null)
  }, [selectSession])

  const handleSelectSession = useCallback((sessionId: string) => {
    selectSession(sessionId)
    setShowHistory(false)
  }, [selectSession])

  const handleSessionCreated = useCallback(() => {
    // Session was created via DescribeStage, it set activeSessionId
  }, [])

  const handleBackToHistory = useCallback(() => {
    selectSession(null)
    setShowHistory(true)
  }, [selectSession])

  if (!repoPath) {
    return <div className="debug-mode debug-mode--empty">Select a repository to use Debug Mode.</div>
  }

  // Show session history when no active session
  if (showHistory && !activeSession) {
    return (
      <SessionHistory
        sessions={sessions}
        onSelect={handleSelectSession}
        onNew={handleNewSession}
      />
    )
  }

  // Describe stage (new session form) when no active session
  if (!activeSession) {
    return (
      <div className="debug-mode">
        <div className="debug-mode__content">
          <DescribeStage
            repoPath={repoPath}
            onCreated={handleSessionCreated}
            onBack={handleBackToHistory}
          />
        </div>
      </div>
    )
  }

  // Active terminal ID based on stage
  const activeTerminalId =
    activeSession.stage === 'diagnose' || activeSession.stage === 'verify'
      ? diagnoseTerminalId
      : instrumentTerminalId

  const stageContent = (() => {
    switch (activeSession.stage) {
      case 'describe':
        return <DescribeStage repoPath={repoPath} onCreated={handleSessionCreated} onBack={handleBackToHistory} />
      case 'instrument':
        return <InstrumentStage session={activeSession} repoPath={repoPath} />
      case 'reproduce':
        return <ReproduceStage session={activeSession} repoPath={repoPath} />
      case 'diagnose':
        return <DiagnoseStage session={activeSession} repoPath={repoPath} />
      case 'verify':
        return <VerifyStage session={activeSession} repoPath={repoPath} onBack={handleBackToHistory} />
      default:
        return null
    }
  })()

  return (
    <div className="debug-mode">
      <DebugStepper currentStage={activeSession.stage} />
      <div className="debug-mode__body">
        <div className="debug-mode__left">
          {stageContent}
        </div>
        <div className="debug-mode__right">
          {activeTerminalId ? (
            <Terminal terminalId={activeTerminalId} />
          ) : (
            <div className="debug-mode__terminal-placeholder">
              Terminal will appear when AI starts working...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 5: Create CSS**

```css
/* src/renderer/components/DebugMode/DebugMode.css */

.debug-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.debug-mode--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.debug-mode__body {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: var(--border-subtle);
}

.debug-mode__left {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-deep);
}

.debug-mode__right {
  flex: 1;
  background: var(--bg-deep);
  display: flex;
  flex-direction: column;
}

.debug-mode__terminal-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-style: italic;
}

/* Stepper */
.debug-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  gap: 4px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
}

.debug-stepper__item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.debug-stepper__line {
  width: 32px;
  height: 2px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.debug-stepper__line--active {
  background: var(--accent-primary);
}

.debug-stepper__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-subtle);
  flex-shrink: 0;
}

.debug-stepper__dot--completed {
  background: var(--accent-primary);
}

.debug-stepper__dot--current {
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-dim);
}

.debug-stepper__label {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.debug-stepper__label--active {
  color: var(--text-primary);
  font-weight: 500;
}

/* Session History */
.session-history {
  padding: 32px;
  max-width: 640px;
  margin: 0 auto;
}

.session-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.session-history__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.session-history__new-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
  font-size: 13px;
}

.session-history__new-btn:hover {
  opacity: 0.9;
}

.session-history__empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 48px 0;
}

.session-history__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-history__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.session-history__card:hover {
  border-color: var(--accent-primary);
}

.session-history__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.session-history__status--active {
  background: var(--status-working);
}

.session-history__status--completed {
  background: var(--status-idle);
}

.session-history__status--abandoned {
  background: var(--text-tertiary);
}

.session-history__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-history__name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.session-history__meta {
  font-size: 12px;
  color: var(--text-tertiary);
}
```

**Step 6: Commit**

```bash
git add src/renderer/components/DebugMode/
git commit -m "feat(debug): add DebugMode component shell with stepper and session history"
```

---

### Task 10: Create stage components

**Files:**
- Create: `src/renderer/components/DebugMode/stages/DescribeStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/InstrumentStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/ReproduceStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/DiagnoseStage.tsx`
- Create: `src/renderer/components/DebugMode/stages/VerifyStage.tsx`

**Step 1: Create DescribeStage**

```tsx
// src/renderer/components/DebugMode/stages/DescribeStage.tsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useDebugStore } from '../../../stores/useDebugStore'

interface Props {
  repoPath: string
  onCreated: () => void
  onBack: () => void
}

export function DescribeStage({ repoPath, onCreated, onBack }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const createSession = useDebugStore((s) => s.createSession)
  const startInstrument = useDebugStore((s) => s.startInstrument)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    const session = await createSession(repoPath, title, description, 'single-session')
    if (session) {
      await startInstrument(repoPath, session.id, `${title}\n\n${description}`)
      onCreated()
    }
    setSubmitting(false)
  }

  return (
    <div className="describe-stage">
      <button className="describe-stage__back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Back to sessions</span>
      </button>
      <h3 className="describe-stage__heading">Describe the bug</h3>
      <div className="describe-stage__field">
        <label className="describe-stage__label">Title</label>
        <input
          className="describe-stage__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief bug summary..."
          autoFocus
        />
      </div>
      <div className="describe-stage__field">
        <label className="describe-stage__label">Description</label>
        <textarea
          className="describe-stage__textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's happening? What did you expect?"
          rows={6}
        />
      </div>
      <button
        className="describe-stage__submit"
        onClick={handleSubmit}
        disabled={!title.trim() || submitting}
      >
        {submitting ? 'Starting...' : 'Start Debug'}
      </button>
    </div>
  )
}
```

**Step 2: Create InstrumentStage**

```tsx
// src/renderer/components/DebugMode/stages/InstrumentStage.tsx
import { Loader } from 'lucide-react'
import type { DebugSession } from '../../../../shared/debug-types'

interface Props {
  session: DebugSession
  repoPath: string
}

export function InstrumentStage({ session }: Props) {
  return (
    <div className="instrument-stage">
      <div className="instrument-stage__status">
        <Loader size={16} className="instrument-stage__spinner" />
        <span>Analyzing bug and adding debug logs...</span>
      </div>

      {session.logLocations && session.logLocations.length > 0 && (
        <div className="debug-card">
          <h4 className="debug-card__title">Added Logs</h4>
          <ul className="debug-card__list">
            {session.logLocations.map((loc, i) => (
              <li key={i} className="debug-card__item">
                <code>{loc.file}:{loc.line}</code>
                <span>{loc.logStatement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.reproSteps && session.reproSteps.length > 0 && (
        <div className="debug-card">
          <h4 className="debug-card__title">Reproduction Steps</h4>
          <ol className="debug-card__ordered-list">
            {session.reproSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="instrument-stage__hint">
        Watch the terminal on the right. When the AI finishes, the session will advance to Reproduce.
      </p>
    </div>
  )
}
```

**Step 3: Create ReproduceStage**

```tsx
// src/renderer/components/DebugMode/stages/ReproduceStage.tsx
import { useState, useEffect } from 'react'
import { Play, Check } from 'lucide-react'
import type { DebugSession } from '../../../../shared/debug-types'
import { useDebugStore } from '../../../stores/useDebugStore'

interface Props {
  session: DebugSession
  repoPath: string
}

export function ReproduceStage({ session, repoPath }: Props) {
  const [additionalContext, setAdditionalContext] = useState('')
  const liveLogEntries = useDebugStore((s) => s.liveLogEntries)
  const logWatcherActive = useDebugStore((s) => s.logWatcherActive)
  const startLogWatch = useDebugStore((s) => s.startLogWatch)
  const advanceStage = useDebugStore((s) => s.advanceStage)
  const startDiagnose = useDebugStore((s) => s.startDiagnose)
  const completeSession = useDebugStore((s) => s.completeSession)
  const stopLogWatch = useDebugStore((s) => s.stopLogWatch)

  // Start log watcher if we have a log file path
  useEffect(() => {
    if (session.logFilePath && !logWatcherActive) {
      startLogWatch(session.logFilePath, session.id)
    }
    return () => { stopLogWatch() }
  }, [session.logFilePath, session.id, logWatcherActive, startLogWatch, stopLogWatch])

  const handleProceed = async () => {
    const logsText = liveLogEntries.map((e) => `[${e.timestamp}] ${e.message}`).join('\n')
    const fullDescription = additionalContext
      ? `${session.title}\n\n${session.description}\n\nAdditional context: ${additionalContext}`
      : `${session.title}\n\n${session.description}`
    await startDiagnose(repoPath, session.id, fullDescription, logsText || '(No logs collected)')
  }

  const handleMarkFixed = async () => {
    await completeSession(repoPath, session.id, 'fixed', 'Fixed during instrumentation')
  }

  return (
    <div className="reproduce-stage">
      {session.reproSteps && session.reproSteps.length > 0 && (
        <div className="debug-card">
          <h4 className="debug-card__title">Reproduction Steps</h4>
          <ol className="debug-card__ordered-list">
            {session.reproSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="debug-card">
        <h4 className="debug-card__title">
          Debug Logs
          {logWatcherActive && <span className="debug-card__live-badge">Live</span>}
        </h4>
        <div className="debug-card__log-viewer">
          {liveLogEntries.length === 0 ? (
            <span className="debug-card__log-empty">Waiting for log entries...</span>
          ) : (
            liveLogEntries.map((entry, i) => (
              <div key={i} className="debug-card__log-entry">
                <span className="debug-card__log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span className="debug-card__log-message">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="reproduce-stage__context">
        <input
          className="reproduce-stage__input"
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Enter additional context about the issue..."
        />
      </div>

      <div className="reproduce-stage__actions">
        <button className="reproduce-stage__btn reproduce-stage__btn--secondary" onClick={handleMarkFixed}>
          <Check size={14} />
          <span>Mark Fixed</span>
        </button>
        <button className="reproduce-stage__btn reproduce-stage__btn--primary" onClick={handleProceed}>
          <Play size={14} />
          <span>Proceed</span>
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Create DiagnoseStage**

```tsx
// src/renderer/components/DebugMode/stages/DiagnoseStage.tsx
import { Loader } from 'lucide-react'
import type { DebugSession } from '../../../../shared/debug-types'

interface Props {
  session: DebugSession
  repoPath: string
}

export function DiagnoseStage({ session }: Props) {
  return (
    <div className="diagnose-stage">
      <div className="diagnose-stage__status">
        <Loader size={16} className="diagnose-stage__spinner" />
        <span>Analyzing logs and applying fix...</span>
      </div>

      {session.collectedLogs && session.collectedLogs.length > 0 && (
        <div className="debug-card">
          <h4 className="debug-card__title">Collected Logs ({session.collectedLogs.length} entries)</h4>
          <div className="debug-card__log-viewer debug-card__log-viewer--collapsed">
            {session.collectedLogs.slice(0, 5).map((entry, i) => (
              <div key={i} className="debug-card__log-entry">
                <span className="debug-card__log-message">{entry.message}</span>
              </div>
            ))}
            {session.collectedLogs.length > 5 && (
              <span className="debug-card__log-more">+{session.collectedLogs.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {session.diagnosis && (
        <div className="debug-card">
          <h4 className="debug-card__title">Diagnosis</h4>
          <p className="debug-card__text">{session.diagnosis}</p>
        </div>
      )}

      <p className="diagnose-stage__hint">
        Watch the terminal on the right. The AI is diagnosing and applying a fix.
      </p>
    </div>
  )
}
```

**Step 5: Create VerifyStage**

```tsx
// src/renderer/components/DebugMode/stages/VerifyStage.tsx
import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { DebugSession } from '../../../../shared/debug-types'
import { useDebugStore } from '../../../stores/useDebugStore'

interface Props {
  session: DebugSession
  repoPath: string
  onBack: () => void
}

export function VerifyStage({ session, repoPath, onBack }: Props) {
  const [notes, setNotes] = useState('')
  const completeSession = useDebugStore((s) => s.completeSession)
  const goBackToStage = useDebugStore((s) => s.goBackToStage)
  const cleanupLogs = useDebugStore((s) => s.cleanupLogs)

  const handleFixed = async () => {
    await cleanupLogs(repoPath)
    await completeSession(repoPath, session.id, 'fixed', notes)
    onBack()
  }

  const handleNotFixed = async () => {
    await goBackToStage(repoPath, session.id, 'instrument')
  }

  return (
    <div className="verify-stage">
      <h3 className="verify-stage__heading">Verify the fix</h3>
      <p className="verify-stage__description">
        Test the fix and confirm whether the bug is resolved.
      </p>

      {session.diagnosis && (
        <div className="debug-card">
          <h4 className="debug-card__title">What was fixed</h4>
          <p className="debug-card__text">{session.diagnosis}</p>
        </div>
      )}

      <div className="verify-stage__field">
        <label className="verify-stage__label">Notes (optional)</label>
        <textarea
          className="verify-stage__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations about the fix..."
          rows={3}
        />
      </div>

      <div className="verify-stage__actions">
        <button className="verify-stage__btn verify-stage__btn--secondary" onClick={handleNotFixed}>
          <RotateCcw size={14} />
          <span>Not Fixed</span>
        </button>
        <button className="verify-stage__btn verify-stage__btn--primary" onClick={handleFixed}>
          <Check size={14} />
          <span>Fixed</span>
        </button>
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/renderer/components/DebugMode/stages/
git commit -m "feat(debug): add all 5 stage components (describe, instrument, reproduce, diagnose, verify)"
```

---

### Task 11: Add stage CSS to DebugMode.css

**Files:**
- Modify: `src/renderer/components/DebugMode/DebugMode.css` — append stage and card styles

**Step 1: Append stage styles**

Add to the end of `DebugMode.css`:

```css
/* Stage common styles */
.describe-stage,
.instrument-stage,
.reproduce-stage,
.diagnose-stage,
.verify-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.describe-stage__back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  margin-bottom: 8px;
}

.describe-stage__back:hover {
  color: var(--text-primary);
}

.describe-stage__heading,
.verify-stage__heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.describe-stage__field,
.verify-stage__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.describe-stage__label,
.verify-stage__label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.describe-stage__input,
.reproduce-stage__input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
}

.describe-stage__input:focus,
.reproduce-stage__input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.describe-stage__textarea,
.verify-stage__textarea {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.describe-stage__textarea:focus,
.verify-stage__textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.describe-stage__submit {
  align-self: flex-end;
  padding: 8px 20px;
  border-radius: 6px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.describe-stage__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Status spinners */
.instrument-stage__status,
.diagnose-stage__status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.instrument-stage__spinner,
.diagnose-stage__spinner {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.instrument-stage__hint,
.diagnose-stage__hint {
  color: var(--text-tertiary);
  font-size: 13px;
  font-style: italic;
}

.verify-stage__description {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

/* Debug cards */
.debug-card {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-surface);
  overflow: hidden;
}

.debug-card__title {
  padding: 10px 14px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 8px;
}

.debug-card__live-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--status-error);
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 80, 80, 0.1);
}

.debug-card__list {
  list-style: none;
  padding: 8px 14px;
  margin: 0;
}

.debug-card__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}

.debug-card__item:last-child {
  border-bottom: none;
}

.debug-card__item code {
  color: var(--accent-primary);
  font-size: 12px;
}

.debug-card__ordered-list {
  padding: 8px 14px 8px 30px;
  margin: 0;
}

.debug-card__ordered-list li {
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-primary);
}

.debug-card__text {
  padding: 10px 14px;
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Log viewer */
.debug-card__log-viewer {
  padding: 8px 14px;
  max-height: 200px;
  overflow-y: auto;
  font-family: var(--font-mono, monospace);
  font-size: 12px;
}

.debug-card__log-viewer--collapsed {
  max-height: 120px;
}

.debug-card__log-empty {
  color: var(--text-tertiary);
  font-style: italic;
}

.debug-card__log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.debug-card__log-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.debug-card__log-message {
  color: var(--text-primary);
  word-break: break-all;
}

.debug-card__log-more {
  color: var(--text-tertiary);
  font-size: 12px;
  padding: 4px 0;
}

/* Action buttons */
.reproduce-stage__context {
  margin-top: 8px;
}

.reproduce-stage__actions,
.verify-stage__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.reproduce-stage__btn,
.verify-stage__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.reproduce-stage__btn--secondary,
.verify-stage__btn--secondary {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.reproduce-stage__btn--secondary:hover,
.verify-stage__btn--secondary:hover {
  border-color: var(--text-secondary);
}

.reproduce-stage__btn--primary,
.verify-stage__btn--primary {
  background: var(--accent-primary);
  color: var(--text-on-accent);
}

.reproduce-stage__btn--primary:hover,
.verify-stage__btn--primary:hover {
  opacity: 0.9;
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/DebugMode/DebugMode.css
git commit -m "feat(debug): add complete CSS for debug mode stages and cards"
```

---

### Task 12: Integrate into LeftSidebar and Layout

**Files:**
- Modify: `src/renderer/components/LeftSidebar/LeftSidebar.tsx` — add Debug Mode button
- Modify: `src/renderer/components/Layout/Layout.tsx` — add debug view routing

**Step 1: Add Debug Mode button to LeftSidebar**

In `src/renderer/components/LeftSidebar/LeftSidebar.tsx`, add import:
```typescript
import { Crosshair } from 'lucide-react'
```

Then after the Known Bugs button (the `</button>` closing tag at approximately line 34), add:
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

Also add `toggleDebugView` to the destructured values from `useAppStore`.

**Step 2: Update Layout view routing**

In `src/renderer/components/Layout/Layout.tsx`, add import:
```typescript
import { DebugMode } from '../DebugMode'
```

Change the view routing (around line 169-171) from:
```tsx
{activeView === 'bugs' ? <BugTracker /> : <TerminalPanel />}
```
to:
```tsx
{activeView === 'debug' ? <DebugMode /> : activeView === 'bugs' ? <BugTracker /> : <TerminalPanel />}
```

**Step 3: Commit**

```bash
git add src/renderer/components/LeftSidebar/LeftSidebar.tsx src/renderer/components/Layout/Layout.tsx
git commit -m "feat(debug): integrate debug mode into sidebar and layout view routing"
```

---

### Task 13: Update CLAUDE.md files

**Files:**
- Modify: `src/shared/CLAUDE.md` — add debug-types.ts reference
- Modify: `src/main/ipc/CLAUDE.md` — add debug handler reference
- Create: `src/main/debug/CLAUDE.md`
- Create: `src/renderer/components/DebugMode/CLAUDE.md`

**Step 1: Create and update CLAUDE.md files**

`src/main/debug/CLAUDE.md`:
```markdown
# Debug Mode (Main Process)

Session persistence and log file monitoring for Debug Mode.

## Files
- **DebugSessionStorage.ts** — JSON-based persistent storage for debug sessions (`~/.lumi/debug-sessions/`). Hash-based directory per repo, file locking for concurrent access.
- **LogWatcher.ts** — `fs.watch`-based real-time log file monitor. Emits `DEBUG_LOG_ENTRY` IPC events for new lines.

## Rules
- Follow BugStorage patterns (hash path, withLock, validation).
- LogWatcher must guard against destroyed windows before emitting.
- Always create empty log file before starting watch if it doesn't exist.
```

`src/renderer/components/DebugMode/CLAUDE.md`:
```markdown
# DebugMode Component

Interactive 5-stage debug workflow view.

## Architecture
- **DebugMode.tsx** — Root component. Session history ↔ active session routing. Two-column layout (stage content + terminal).
- **DebugStepper.tsx** — Horizontal stepper bar showing 5 stages with active/completed states.
- **SessionHistory.tsx** — Session list with new session button. Shown when no active session.
- **stages/** — Per-stage components:
  - **DescribeStage** — Bug title/description form → starts instrument.
  - **InstrumentStage** — Shows AI progress, log locations, repro steps.
  - **ReproduceStage** — Live log viewer, repro steps, Proceed/Mark Fixed buttons.
  - **DiagnoseStage** — Shows collected logs, diagnosis, fix summary.
  - **VerifyStage** — Fixed/Not Fixed controls with optional notes.

## Dependencies
- `useDebugStore` for all state management
- `useAppStore` for active tab/repo
- `useTerminalStore` for terminal sync
- Terminal component for AI terminal rendering

## CSS
- BEM naming: `.debug-mode__*`, `.debug-stepper__*`, `.session-history__*`, `.debug-card__*`
- Stage-specific: `.describe-stage__*`, `.instrument-stage__*`, `.reproduce-stage__*`, `.diagnose-stage__*`, `.verify-stage__*`
```

**Step 2: Update existing CLAUDE.md files**

Add `debug-types.ts` to `src/shared/CLAUDE.md` files section.
Add `register-debug-handlers.ts` to `src/main/ipc/CLAUDE.md`.

**Step 3: Commit**

```bash
git add src/main/debug/CLAUDE.md src/renderer/components/DebugMode/CLAUDE.md src/shared/CLAUDE.md src/main/ipc/CLAUDE.md
git commit -m "docs: add CLAUDE.md files for debug mode modules"
```

---

### Task 14: Typecheck and fix

**Step 1: Run typecheck**

```bash
npx tsc --noEmit 2>&1
```

**Step 2: Fix any type errors found**

Common expected issues:
- `toggleDebugView` not yet on useAppStore type — verify it was added in Task 3
- `window.api` type might not include new debug methods — verify preload types exported
- Stage component import paths

**Step 3: Run lint**

```bash
npm run lint 2>&1
```

**Step 4: Fix any lint issues**

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and lint issues for debug mode"
```

---

### Task 15: Smoke test

**Step 1: Start dev mode**

```bash
npm run dev
```

**Step 2: Manual verification checklist**

- [ ] Debug Mode button appears in LeftSidebar
- [ ] Clicking it shows session history (empty state)
- [ ] "New Debug Session" opens describe form
- [ ] Filling title + clicking "Start Debug" spawns terminal
- [ ] Stepper shows Instrument stage active
- [ ] Back to sessions button works
- [ ] View toggles between terminals/bugs/debug correctly

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish debug mode after smoke test"
```
