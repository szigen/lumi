# Config Management

Persistent configuration, UI state, work logs, and codename collection tracking.

## Architecture
- All data lives in `~/.ai-orchestrator/`:
  - `config.json` — app config (projectsRoot, maxTerminals, theme, terminalFontSize)
  - `ui-state.json` — UI layout state (openTabs, activeTab, sidebars, gridColumns)
  - `work-logs/<date>/<repo>_<id>.json` — per-session work logs
  - `discovered-codenames.json` — array of discovered terminal codenames

## Rules
- Config reads merge with defaults (`DEFAULT_CONFIG`, `DEFAULT_UI_STATE` from `shared/constants.ts`)
- Directories are auto-created on construction
- Work logs are organized by date subdirectories

## Watch Out
- `addDiscoveredCodename` returns `boolean` indicating if the codename was new (used for UI animation trigger)
- Config changes via IPC propagate to TerminalManager and RepoManager in `handlers.ts`
