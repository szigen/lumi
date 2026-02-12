# IPC Handlers

Central registration point for all main process IPC handlers.

## Architecture
- `setupIpcHandlers()` initializes all managers (TerminalManager, RepoManager, ConfigManager, ActionStore, ActionEngine, PersonaStore, SystemChecker, BugStorage) and registers all `ipcMain.handle` calls
- `setMainWindow()` and getter functions expose managers to `index.ts`
- All channel names come from `src/shared/ipc-channels.ts`

## Rules
- Every new IPC handler must be registered here and its channel constant added to `ipc-channels.ts`
- Handler groups: Terminal, Repository, Git, Config, UI State, Window, Dialog, Context Menu, System Checks, Actions, Personas, Collection, Bugs
- Change events (`ACTIONS_CHANGED`, `PERSONAS_CHANGED`, `REPOS_CHANGED`) are sent via `mainWindow.webContents.send()`
- `BUGS_ASK_CLAUDE` spawns `claude -p --output-format stream-json --include-partial-messages` and streams deltas via `BUGS_CLAUDE_STREAM_DELTA`/`BUGS_CLAUDE_STREAM_DONE` push channels, plus tool activity via `BUGS_CLAUDE_STREAM_ACTIVITY`. Parses `stream_event` types for live tool usage (content_block_start/stop) with fallback to `assistant` events. Returns `{ started: true }` immediately without blocking.

## Watch Out
- `mainWindow` can be null — handlers that need it should check before use
- `ACTIONS_CREATE_NEW` builds an inline action with `CREATE_ACTION_PROMPT` as `appendSystemPrompt`
- `PERSONAS_SPAWN` uses `buildClaudeCommand` with `claude ""` as base command
- Config changes propagate to managers: `maxTerminals` → TerminalManager, `projectsRoot` → RepoManager
