# Shared Types & Constants

Type definitions and constants shared between main and renderer processes.

## Files
- **types.ts** — core interfaces: `Terminal`, `TerminalInfo`, `Repository`, `AdditionalPath`, `Commit`, `Branch`, `Config`, `UIState`, `WorkLog`, `FileTreeNode`, `FileChange`. Exports `ClaudeStatus` type (single source of truth for 6 terminal states: idle, working, waiting-unseen, waiting-focused, waiting-seen, error)
- **ipc-channels.ts** — centralized IPC channel name constants (`IPC_CHANNELS` object + `IpcChannel` type). Includes `TERMINAL_STATUS` (main→renderer push), `TERMINAL_GET_STATUS` (renderer→main pull), `TERMINAL_FOCUS` (renderer→main focus notification), `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY` (toggle macOS traffic light buttons, guarded on main process), `WINDOW_MINIMIZE` and `WINDOW_CLOSE` (Linux custom window controls), `CONTEXT_REVEAL_IN_FILE_MANAGER` (platform-agnostic, renamed from CONTEXT_REVEAL_IN_FINDER), `SYSTEM_CHECK_RUN` and `SYSTEM_CHECK_FIX` (onboarding system health checks), `BUGS_CLAUDE_STREAM_DELTA`, `BUGS_CLAUDE_STREAM_DONE`, and `BUGS_CLAUDE_STREAM_ACTIVITY` (streaming Claude responses and tool activity for bug tracker)
- **action-types.ts** — `Action`, `ActionStep`, `ClaudeConfig` types
- **bug-types.ts** — `Bug`, `Fix`, `BugFilter` types for the bug tracker feature
- **persona-types.ts** — `Persona` type definition
- **constants.ts** — `DEFAULT_CONFIG`, `DEFAULT_UI_STATE`

## Rules
- All IPC channel names must be defined in `ipc-channels.ts` — never use string literals
- Channel naming convention: `domain:operation` (e.g., `terminal:spawn`, `git:commits`)
- `Terminal` (renderer) vs `TerminalInfo` (serializable for IPC) — TerminalInfo uses `string` for dates, Terminal uses `Date`. TerminalInfo includes `status` field for sync
- `ClaudeConfig` is shared between actions and personas
