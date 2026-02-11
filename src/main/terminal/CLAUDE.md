# Terminal Management

PTY process spawn/management, output buffering, state queries.

## Rules
- Main process is the single source of truth — TerminalManager owns all terminal metadata and output buffers
- Output buffer keeps last 100KB per terminal (sliced on overflow)
- Max 12 terminals (configurable via ConfigManager)
- Each terminal gets a random codename on spawn from `codenames.ts` (50 adj x 50 nouns = 2500 combos)
- Terminals support an optional `task` field set by actions, personas, or manual spawn

## Watch Out
- `syncFromMain()` in renderer reconciles state on startup, visibility change, and powerMonitor resume
- IPC channels for state sync: `TERMINAL_LIST`, `TERMINAL_BUFFER`, `TERMINAL_SYNC`
- PTY spawns `zsh` on macOS, `powershell.exe` on Windows
- Codename discovery is tracked in `~/.ai-orchestrator/discovered-codenames.json` via ConfigManager
- Terminal exit handler cleans up from both the Map and NotificationManager
