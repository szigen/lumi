# Shared Types & Constants

Type definitions and constants shared between main and renderer processes.

## Files
- **types.ts** — core interfaces: `Terminal`, `TerminalInfo`, `Repository`, `Commit`, `Branch`, `Config`, `UIState`, `WorkLog`, `FileTreeNode`, `FileChange`
- **ipc-channels.ts** — centralized IPC channel name constants (`IPC_CHANNELS` object + `IpcChannel` type)
- **action-types.ts** — `Action`, `ActionStep`, `ClaudeConfig` types
- **persona-types.ts** — `Persona` type definition
- **constants.ts** — `DEFAULT_CONFIG`, `DEFAULT_UI_STATE`

## Rules
- All IPC channel names must be defined in `ipc-channels.ts` — never use string literals
- Channel naming convention: `domain:operation` (e.g., `terminal:spawn`, `git:commits`)
- `Terminal` (renderer) vs `TerminalInfo` (serializable for IPC) — TerminalInfo uses `string` for dates, Terminal uses `Date`
- `ClaudeConfig` is shared between actions and personas
