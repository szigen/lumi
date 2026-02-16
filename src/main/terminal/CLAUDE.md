# Terminal Management

PTY process spawn/management, output buffering, state queries.

## Files
- **TerminalManager.ts** — PTY lifecycle (spawn, kill, write, resize), delegates to injected dependencies
- **StatusStateMachine.ts** — Pure state machine: 6 states (idle, working, waiting-unseen, waiting-focused, waiting-seen, error), driven by title change, activity, and focus/blur events. Uses `ClaudeStatus` from shared/types.ts. Exit code 0 → idle, non-zero → error
- **OscTitleParser.ts** — Buffers partial OSC sequences across PTY data chunks, supports OSC 0/2 titles and OSC 9 notifications, classifies notification payloads (`codex-turn-complete` vs `generic`), infers provider hints (`claude`/`codex`), and emits provider-aware status events with safe null fallback. Max 4KB buffer guard against unbounded growth
- **OutputBuffer.ts** — Encapsulates output buffering with ANSI-safe truncation at newline boundaries
- **types.ts** — `ManagedTerminal`, `SpawnResult` (re-exported from shared), `ITerminalNotifier`, `ICodenameTracker` interfaces
- **codenames.ts** — Random codename generator (50 adj x 50 nouns = 2500 combos)

## Rules
- Main process is the single source of truth — TerminalManager owns all terminal metadata and output buffers
- Output buffer keeps last ~100KB per terminal (truncated at nearest newline to preserve ANSI escape sequences)
- Max 12 terminals (configurable via ConfigManager)
- Each terminal gets a random codename on spawn from `codenames.ts`
- Terminals support an optional `task` field set by actions, personas, or manual spawn
- Terminals track lightweight provider hints (`agentHint`) for safer status parsing (`claude` / `codex` / `unknown`)
- TerminalManager uses dependency injection: `ITerminalNotifier` and `ICodenameTracker` interfaces (DIP)

## Status Detection — Dual Strategy

### Claude: OSC Title Sequences (OSC 0/2)
- `OscTitleParser` parses OSC 0/2 title sequences from PTY data
- Claude-compatible rule: `✳` prefix = idle/finished, non-`✳` title = working
- OSC title sequences are buffered across PTY data chunks — partial sequences accumulate until BEL/ST terminator is received (max 4KB buffer)
- `StatusStateMachine.onTitleChange(isWorking)` drives state transitions

### Codex: OSC 9 Notifications + Activity-Based Fallback
Codex CLI does **not** emit OSC title sequences (OSC 0/2). Instead:
1. **OSC 9 (iTerm2 notification protocol):** `OscTitleParser` classifies payloads as `codex-turn-complete` or `generic`. Only `codex-turn-complete` events are treated as definitive "turn done" signals and transition to waiting state
2. **Activity-based fallback:** PTY output activity triggers `StatusStateMachine.onOutputActivity()` only when `agentHint === 'codex'` → working state. A silence timer (`STATUS_DETECTION.activitySilenceMs`, default 3 seconds) triggers `onOutputSilence()` → waiting state
3. **User input:** When user sends Enter (`\r`) to a Codex terminal, `StatusStateMachine.onUserInput()` transitions to working state

The `activityTimer` field on `ManagedTerminal` tracks the silence timeout. Timers are cleaned up on kill, killAll, onExit, on provider switch to Claude, and when a `codex-turn-complete` notification is observed.

## Other Rules
- Focus/blur events from renderer drive waiting-* state transitions
- `getTerminalList()` includes current `status` from StatusStateMachine for sync
- `getStatus(id)` allows renderer to query current status on demand (used by useTerminalIPC on mount)

## Watch Out
- `write()` strips focus reporting events (`\x1b[I`, `\x1b[O`) before forwarding to PTY — assistant CLIs can enable focus reporting (`\x1b[?1004h`) and stop spinner animation on focus-out, which breaks status detection. We manage focus ourselves via StatusStateMachine
- `syncFromMain()` in renderer reconciles state on startup, visibility change, and powerMonitor resume
- IPC channels for state sync: `TERMINAL_LIST`, `TERMINAL_BUFFER`, `TERMINAL_SYNC`, `TERMINAL_GET_STATUS`
- PTY shell resolved via `src/main/platform` module (`getDefaultShell()`, `getShellArgs()`) — supports macOS, Windows, and Linux with fallback chains
- Codename discovery is tracked in `~/.ai-orchestrator/discovered-codenames.json` via ConfigManager
- Terminal exit handler cleans up from both the Map and notifier
- `statusMachine.setOnChange` callback sends both `TERMINAL_STATUS` IPC and calls `notifier.notifyStatusChange` — notifications are status-driven with repeating intervals, not BEL-driven
- On Windows, PTY spawns with `useConpty: false` (winpty fallback) — ConPTY strips alternate screen buffer sequences (`\x1b[?1049h/l`), causing xterm.js to accumulate output in the main buffer instead of switching screens. Winpty passes VT sequences through unchanged.
