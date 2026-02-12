# Terminal Management

PTY process spawn/management, output buffering, state queries.

## Files
- **TerminalManager.ts** — PTY lifecycle (spawn, kill, write, resize), delegates to injected dependencies
- **OutputBuffer.ts** — Encapsulates output buffering with ANSI-safe truncation at newline boundaries
- **types.ts** — `ManagedTerminal`, `SpawnResult` (re-exported from shared), `ITerminalNotifier`, `ICodenameTracker` interfaces
- **codenames.ts** — Random codename generator (50 adj x 50 nouns = 2500 combos)

## Rules
- Main process is the single source of truth — TerminalManager owns all terminal metadata and output buffers
- Output buffer keeps last ~100KB per terminal (truncated at nearest newline to preserve ANSI escape sequences)
- Max 12 terminals (configurable via ConfigManager)
- Each terminal gets a random codename on spawn from `codenames.ts`
- Terminals support an optional `task` field set by actions, personas, or manual spawn
- TerminalManager uses dependency injection: `ITerminalNotifier` and `ICodenameTracker` interfaces (DIP)

## Watch Out
- `syncFromMain()` in renderer reconciles state on startup, visibility change, and powerMonitor resume
- IPC channels for state sync: `TERMINAL_LIST`, `TERMINAL_BUFFER`, `TERMINAL_SYNC`
- PTY spawns `zsh` on macOS, `powershell.exe` on Windows
- Codename discovery is tracked in `~/.ai-orchestrator/discovered-codenames.json` via ConfigManager
- Terminal exit handler cleans up from both the Map and notifier
