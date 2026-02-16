# Zustand Stores

State management for the renderer process.

## Stores
- **useTerminalStore** — terminal map/output buffers, active terminal selection, repo-local last active map, global terminal event bridge, `syncFromMain()` reconciliation.
- **useAppStore** — UI layout and modal state.
- **useRepoStore** — repositories, branches, status, additional paths.
- **useBugStore** — bug tracker state and assistant streaming state.
- **useNotificationStore** — toast queue.

## Rules
- Main process is source of truth for terminals.
- Terminal spawn/kill UX paths must call `syncFromMain()` after IPC mutations.
- `syncFromMain()` consumes `TERMINAL_SNAPSHOT` and rebuilds `terminals`, `outputs`, `activeTerminalId`, and `lastActiveByRepo`.
- Terminal output append must use buffer trimming helpers.

## Watch Out
- Terminal bridge listener lifetime is app-level, not terminal-panel-level.
- `useAppStore.setActiveTab` and `closeTab` cross-reference terminal/repo stores; keep side effects minimal and deterministic.
- Bug assistant stream handlers append large text and activities in-memory; avoid unnecessary re-subscriptions.
