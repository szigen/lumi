# IPC Handlers

Central registration point for all main process IPC handlers.

## Architecture
- `setupIpcHandlers()` initializes all managers (TerminalManager, RepoManager, ConfigManager, ActionStore, ActionEngine, PersonaStore, SystemChecker, BugStorage) and registers all `ipcMain.handle` calls
- `setMainWindow()` and getter functions expose managers to `index.ts`
- All channel names come from `src/shared/ipc-channels.ts`

## Rules
- Every new IPC handler must be registered here and its channel constant added to `ipc-channels.ts`
- Handler groups: Terminal, Repository, Git, Config, UI State, Window, Dialog, Context Menu, System Checks, Actions, Personas, Collection, Bugs
- Terminal sync uses `TERMINAL_SNAPSHOT` for atomic metadata+buffer reconciliation from main to renderer
- Change events (`ACTIONS_CHANGED`, `PERSONAS_CHANGED`, `REPOS_CHANGED`) are sent via `mainWindow.webContents.send()`
- `BUGS_ASK_CLAUDE` spawns `claude -p --output-format stream-json --include-partial-messages` and streams deltas via `BUGS_CLAUDE_STREAM_DELTA`/`BUGS_CLAUDE_STREAM_DONE` push channels, plus tool activity via `BUGS_CLAUDE_STREAM_ACTIVITY`. Parses `stream_event` types for live tool usage (content_block_start/stop) with fallback to `assistant` events. Returns `{ started: true }` immediately without blocking.
- All bug IPC handlers validate `repoPath` via `isValidRepoPath()` (absolute path, no `..`, must exist)
- `BUGS_ASK_CLAUDE` enforces max 2 concurrent Claude processes (`MAX_CLAUDE_PROCESSES`), 5-minute timeout, and 1MB buffer limit
- `BUGS_APPLY_FIX` uses heredoc stdin (`<<'__EOF__'`) to pass prompts safely — never shell-interpolated
- Stream handlers use `sendToRenderer()` helper that checks `mainWindow` isn't destroyed before sending

## Watch Out
- `WINDOW_MINIMIZE` and `WINDOW_CLOSE` — used by Linux custom window controls (renderer buttons call these via preload)
- `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY` is guarded with `process.platform === 'darwin'` — safe no-op on Windows/Linux
- `CONTEXT_REVEAL_IN_FILE_MANAGER` renamed from `CONTEXT_REVEAL_IN_FINDER` for cross-platform naming
- `mainWindow` can be null — handlers that need it should check before use
- `ACTIONS_CREATE_NEW` builds an inline action with `CREATE_ACTION_PROMPT` as `appendSystemPrompt`
- `PERSONAS_SPAWN` uses `buildClaudeCommand` with `claude ""` as base command
- Config changes propagate to managers: `maxTerminals` → TerminalManager, `projectsRoot` → RepoManager
- `activeClaudeProcesses` map tracks running Claude processes by bugId — cleaned up on close/error/timeout
