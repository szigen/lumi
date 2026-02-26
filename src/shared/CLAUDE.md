# Shared Types & Constants

Type definitions and constants shared between main and renderer.

## Files
- **types.ts** — shared domain interfaces, including `TerminalStatus`, `Terminal`, `TerminalInfo`, `TerminalSnapshot`, `FileViewerState`, `CommitDiffFile`, `FileViewerMode`, `GridLayoutMode`, `GridLayout`.
- **ipc-channels.ts** — centralized IPC channel constants (`domain:operation` naming). Includes `ACTIONS_EDIT` for terminal-first action editing, `WINDOW_FULLSCREEN_CHANGED` for fullscreen state sync.
- **action-types.ts** — action/persona config payload types.
- **bug-types.ts** — bug tracker domain types.
- **persona-types.ts** — persona definition.
- **constants.ts** — default app config/UI state.

## Rules
- Do not use hardcoded IPC strings; always add channels here first.
- `Terminal` (renderer) uses `Date`, IPC payloads (`TerminalInfo`/`TerminalSnapshot`) use ISO strings.
- Terminal stream channels are `BUGS_ASSISTANT_STREAM_*`; legacy Claude alias channels are removed.
- Keep status naming provider-agnostic (`TerminalStatus`).
