# Zustand Stores

State management for the renderer process.

## Stores
- **useTerminalStore** — terminal sessions, output buffers, active terminal tracking, per-repo last-active tracking
- **useAppStore** — UI layout (open tabs, active tab, sidebars, settings modal, quit dialog, focus mode, grid columns, collapsedGroups for repo group collapse state, activeView for terminals/bugs toggle)
- **useRepoStore** — repository list and `additionalPaths` from main process; exports `groupReposBySource()` helper, `RepoGroup` interface, and `PathGroupInfo` minimal interface for grouped repo display. `loadAdditionalPaths()` fetches config and updates `additionalPaths` state.
- **useBugStore** — bug tracker state: bugs list, selected bug, filter, Claude loading state, fix terminal tracking, streaming state (`streamingBugId`, `streamingText`, `streamingRepoPath`, `streamingActivities`). Actions: loadBugs, createBug, updateBug, deleteBug, addFix, updateFix, askClaude (streaming), applyFix, markFixResult, subscribeToStream (returns cleanup fn, subscribes to delta/done/activity IPC events). Exports memoized selectors: `selectFilteredBugs`, `selectSelectedBug`. Data persisted via BugStorage in main process.
- **useNotificationStore** — toast notification queue with typed toasts (`ToastType`: bell, error, success, info). `addToast()` for bell notifications (deduplicates by terminalId), `notify(type, title, message)` for generic toasts. `NotificationToast` has `type`, `title` (was `repoName`), optional `terminalId`

## Rules
- Main process is source of truth for terminal data — renderer syncs via `syncFromMain()`
- `syncFromMain()` guards against concurrent calls with `syncing` flag
- `syncFromMain()` logic decomposed into pure helper functions: `reconcileTerminals`, `resolveActiveTerminal`, `rebuildLastActiveByRepo`
- Tab switching auto-selects the last active terminal for that repo (`lastActiveByRepo` map)
- Closing a tab kills all terminals for that repo and unwatches file tree
- UI state persists to main process via `saveUIState()` on every layout change
- BugTracker components use granular selectors `useBugStore((s) => s.field)` — never destructure entire store
- Use exported memoized selectors (`selectFilteredBugs`, `selectSelectedBug`) instead of calling methods in render
- `subscribeToStream` should be called via `useBugStore.getState().subscribeToStream()` with `[]` dependency to avoid re-subscribe on every store update

## Watch Out
- `useAppStore.setActiveTab` cross-references `useTerminalStore` and `useRepoStore` — stores are coupled
- `syncFromMain` reconnects orphaned terminals by fetching their output buffer from main
- Terminal removal cascades: updates `lastActiveByRepo`, selects next available terminal
