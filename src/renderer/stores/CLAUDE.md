# Zustand Stores

State management for the renderer process.

## Stores
- **useTerminalStore** — terminal map/output buffers, active terminal selection, repo-local last active map, global terminal event bridge, `syncFromMain()` reconciliation, `minimizeTerminal(id)`/`restoreTerminal(id)` for renderer-side minimize state.
- **useAppStore** — UI layout and modal state. Per-project grid layouts via `projectGridLayouts`, `setProjectGridLayout(repoPath, layout)`, `getActiveGridLayout()`. Close-tab confirmation dialog via `closeTabDialogOpen`, `showCloseTabDialog(repoName, count)`, `confirmCloseTab()`.
- **useRepoStore** — repositories, branches, status, additional paths.
- **useNotificationStore** — toast queue.

## Rules
- Main process is source of truth for terminals.
- Terminal spawn/kill UX paths must call `syncFromMain()` after IPC mutations.
- `syncFromMain()` consumes `TERMINAL_SNAPSHOT` and rebuilds `terminals`, `outputs`, `activeTerminalId`, and `lastActiveByRepo`.
- After spawning a new terminal, callers must explicitly call `setActiveTerminal(newId)` after `syncFromMain()` to focus the new terminal (syncFromMain preserves the current active terminal if still valid).
- Live terminal output should append incrementally in renderer (no head-trimming) to avoid ANSI redraw artifacts; snapshot sync merges without rolling back newer live output.

## Minimized Terminal Filtering
- `getVisibleTerminals(terminals)` — exported utility that filters out minimized terminals. Used across stores and hooks to ensure minimized terminals never receive focus.
- `minimizeTerminal(id)` — proactively shifts focus to a visible neighbor when the active terminal is minimized. Uses `findNeighborTerminalId` with visible-only map.
- `syncFromMain()` passes visible terminals to `resolveActiveTerminal` and `rebuildLastActiveByRepo` so minimized terminals are excluded from active/lastActive resolution.
- `useAppStore.setActiveTab` skips minimized terminals when restoring last-active or falling back to first terminal.
- `useKeyboardShortcuts.navigateTerminal` cycles only through visible terminals.
- Notification click and toast bell click **restore** a minimized terminal before focusing it (user intent is explicit).

## Neighbor Focus on Close
- `removeTerminal()` focuses the **previous neighbor** (or next if closing the first) **within the same repo**, excluding minimized terminals.
- `findNeighborTerminalId(closedId, terminals, repoPath?)` is a pure helper that computes the neighbor from the terminal map **before** deletion. When `repoPath` is provided, only terminals from that repo are considered — this prevents Cmd+W from jumping focus to a different repo's terminal. Callers pass `getVisibleTerminals()` result to exclude minimized terminals.
- If no same-repo visible terminals remain after close, `activeTerminalId` becomes `null` (user stays on the same tab with no active terminal).

## Watch Out
- Terminal bridge listener lifetime is app-level, not terminal-panel-level.
- `useAppStore.setActiveTab` and `closeTab` cross-reference terminal/repo stores; keep side effects minimal and deterministic.
- `closeTab` checks for minimized terminals before closing — if any exist, it shows `CloseTabDialog` instead of proceeding. `confirmCloseTab()` bypasses the guard and performs the actual close.
- `syncFromMain()` uses a `pendingSync` flag to queue re-syncs requested while a sync is in progress — never silently drops requests.
- `setProjectGridLayout` is debounced (500ms) to prevent concurrent IPC writes on rapid clicks. It also guards against empty `repoPath`.
- `loadUIState` migration reads `useRepoStore.getState().repos` — callers must ensure `loadRepos()` completes before `loadUIState()`.
