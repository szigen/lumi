# Terminal Management

PTY process spawn/management, output buffering, and status tracking.

## Files
- **TerminalManager.ts** — PTY lifecycle (spawn, kill, write, resize), output buffering, snapshot/status queries.
- **StatusStateMachine.ts** — Pure state machine for `TerminalStatus` (`idle`, `working`, `waiting-unseen`, `waiting-focused`, `waiting-seen`, `error`).
- **OscTitleParser.ts** — Parses OSC title/notification events and provider hints.
- **OutputBuffer.ts** — Output truncation (newline-aware, ~500KB default).
- **types.ts** — `ManagedTerminal`, `SpawnResult` re-export, notifier/tracker interfaces.

## Rules
- Main process is the single source of truth for terminal metadata/output.
- Renderer reconciliation must use `getTerminalSnapshots()` via `TERMINAL_SNAPSHOT`.
- Focus events from renderer drive waiting state transitions through `TERMINAL_FOCUS`.
- Status push channel is `TERMINAL_STATUS`; one-off pull uses `TERMINAL_GET_STATUS`.

## Watch Out
- `write()` strips focus reporting control sequences (`\x1b[I`, `\x1b[O`) before PTY write.
- Codex fallback status detection is activity-timer based and scoped by `agentHint === 'codex'`.
- Cleanup order on exit is important: remove terminal + notifier context before stale status notifications can fire.
- **Window focus awareness:** `StatusStateMachine` tracks both tab-level focus (`onFocus`/`onBlur`) and window-level focus (`onWindowFocus`/`onWindowBlur`). A terminal is effectively focused only when both its tab is active AND the app window is focused. `TerminalManager.setWindowFocused()` propagates BrowserWindow focus/blur events to all terminals. This ensures native OS notifications fire when the app is in the background, even for the active tab.
