# Terminal Management

PTY process spawn/management, output buffering, state queries.

## Files
- **TerminalManager.ts** — PTY lifecycle (spawn, kill, write, resize), delegates to injected dependencies
- **StatusStateMachine.ts** — Pure state machine: 6 states (idle, working, waiting-unseen, waiting-focused, waiting-seen, error), driven by title change and focus/blur events. Uses `ClaudeStatus` from shared/types.ts. Exit code 0 → idle, non-zero → error
- **OscTitleParser.ts** — Buffers partial OSC title sequences across PTY data chunks, invokes callback with working/idle state. Max 4KB buffer guard against unbounded growth
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
- Status detection uses OSC title sequences via `OscTitleParser`: `✳` prefix = idle/finished, anything else = working
- OSC title sequences are buffered across PTY data chunks — partial sequences accumulate until BEL/ST terminator is received (max 4KB buffer)
- Focus/blur events from renderer drive waiting-* state transitions
- `getTerminalList()` includes current `status` from StatusStateMachine for sync
- `getStatus(id)` allows renderer to query current status on demand (used by useTerminalIPC on mount)

## Watch Out
- `syncFromMain()` in renderer reconciles state on startup, visibility change, and powerMonitor resume
- IPC channels for state sync: `TERMINAL_LIST`, `TERMINAL_BUFFER`, `TERMINAL_SYNC`, `TERMINAL_GET_STATUS`
- PTY spawns `zsh` on macOS, `powershell.exe` on Windows
- Codename discovery is tracked in `~/.ai-orchestrator/discovered-codenames.json` via ConfigManager
- Terminal exit handler cleans up from both the Map and notifier
