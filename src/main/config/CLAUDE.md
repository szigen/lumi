# Config Management

Persistent configuration, UI state, work logs, and codename collection tracking.

## Architecture
- All data lives in the platform config dir (macOS/Linux: `~/.lumi/`, Windows: `%APPDATA%/lumi`), resolved via `src/main/platform` module. In dev mode (`NODE_ENV=development`), uses `~/.lumi-dev` / `%APPDATA%/lumi-dev` to isolate dev data from production:
  - `config.json` — app config (projectsRoot, maxTerminals, theme, terminalFontSize, notifications)
  - `ui-state.json` — UI layout state (openTabs, activeTab, sidebars, projectGridLayouts)
  - `work-logs/<date>/<repo>_<id>.json` — per-session work logs
  - `discovered-codenames.json` — array of discovered terminal codenames

## Rules
- Config reads merge with defaults (`DEFAULT_CONFIG`, `DEFAULT_UI_STATE` from `shared/constants.ts`) via `migrateConfig()` private method
- Directories are auto-created on construction
- Work logs are organized by date subdirectories

## Watch Out
- `addDiscoveredCodename` returns `boolean` indicating if the codename was new (used for UI animation trigger)
- Config changes via IPC propagate to TerminalManager, RepoManager, and NotificationManager in `handlers.ts`
