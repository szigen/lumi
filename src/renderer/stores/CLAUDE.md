# Zustand Stores

State management for the renderer process.

## Stores
- **useTerminalStore** — terminal sessions, output buffers, active terminal tracking, per-repo last-active tracking
- **useAppStore** — UI layout (open tabs, active tab, sidebars, settings modal, quit dialog, focus mode, grid columns, collapsedGroups for repo group collapse state)
- **useRepoStore** — repository list and `additionalPaths` from main process; exports `groupReposBySource()` helper, `RepoGroup` interface, and `PathGroupInfo` minimal interface for grouped repo display. `loadAdditionalPaths()` fetches config and updates `additionalPaths` state.
- **useNotificationStore** — toast notification queue

## Rules
- Main process is source of truth for terminal data — renderer syncs via `syncFromMain()`
- `syncFromMain()` guards against concurrent calls with `syncing` flag
- `syncFromMain()` logic decomposed into pure helper functions: `reconcileTerminals`, `resolveActiveTerminal`, `rebuildLastActiveByRepo`
- Tab switching auto-selects the last active terminal for that repo (`lastActiveByRepo` map)
- Closing a tab kills all terminals for that repo and unwatches file tree
- UI state persists to main process via `saveUIState()` on every layout change

## Watch Out
- `useAppStore.setActiveTab` cross-references `useTerminalStore` and `useRepoStore` — stores are coupled
- `syncFromMain` reconnects orphaned terminals by fetching their output buffer from main
- Terminal removal cascades: updates `lastActiveByRepo`, selects next available terminal
