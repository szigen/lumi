# Preload Bridge

Secure IPC bridge between main and renderer via `contextBridge`.

## Architecture
- `index.ts` exposes typed `window.api` methods.
- `ipc-utils.ts` provides `invokeIpc` and `createIpcListener` helpers.
- Channel names are sourced from `src/shared/ipc-channels.ts` only.

## Rules
- `nodeIntegration: false`, `contextIsolation: true`.
- Every new IPC channel must have an explicit preload mapping.
- Terminal reconciliation API is `getTerminalSnapshots()`; list/buffer legacy helpers are removed.

## API Groups
- Terminal: spawn, write, kill, resize, `getTerminalSnapshots`, status/focus/sync listeners.
- Repository + Git: repo discovery/file tree/watch + commit/branch/status APIs.
- Actions + Personas: list/load/execute/edit/spawn and change listeners (`editAction` for terminal-first editing).
- Bugs: `askBugAssistant` + `onBugAssistantStream*` channels, fix CRUD/apply.
- Config/UI State, Window controls, Dialog, System checks, App lifecycle.

## Watch Out
- Keep listener callbacks strongly typed; always return cleanup function from `createIpcListener` wrappers.
- Avoid backward-compat alias methods once channels are removed from `ipc-channels.ts`.
