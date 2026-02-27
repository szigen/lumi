# Zustand Stores

State management for the renderer process.

## Stores
- **useTerminalStore** — terminal map/output buffers, active terminal selection, repo-local last active map, global terminal event bridge, `syncFromMain()` reconciliation.
- **useAppStore** — UI layout and modal state. Per-project grid layouts via `projectGridLayouts`, `setProjectGridLayout(repoPath, layout)`, `getActiveGridLayout()`.
- **useRepoStore** — repositories, branches, status, additional paths.
- **useNotificationStore** — toast queue.

## Rules
- Main process is source of truth for terminals.
- Terminal spawn/kill UX paths must call `syncFromMain()` after IPC mutations.
- `syncFromMain()` consumes `TERMINAL_SNAPSHOT` and rebuilds `terminals`, `outputs`, `activeTerminalId`, and `lastActiveByRepo`.
- After spawning a new terminal, callers must explicitly call `setActiveTerminal(newId)` after `syncFromMain()` to focus the new terminal (syncFromMain preserves the current active terminal if still valid).
- Live terminal output should append incrementally in renderer (no head-trimming) to avoid ANSI redraw artifacts; snapshot sync merges without rolling back newer live output.

## Neighbor Focus on Close
- `removeTerminal()` focuses the **previous neighbor** (or next if closing the first) **within the same repo** instead of the first terminal.
- `findNeighborTerminalId(closedId, terminals, repoPath?)` is a pure helper that computes the neighbor from the terminal map **before** deletion. When `repoPath` is provided, only terminals from that repo are considered — this prevents Cmd+W from jumping focus to a different repo's terminal.
- If no same-repo terminals remain after close, `activeTerminalId` becomes `null` (user stays on the same tab with no active terminal).

## Watch Out
- Terminal bridge listener lifetime is app-level, not terminal-panel-level.
- `useAppStore.setActiveTab` and `closeTab` cross-reference terminal/repo stores; keep side effects minimal and deterministic.
- `syncFromMain()` uses a `pendingSync` flag to queue re-syncs requested while a sync is in progress — never silently drops requests.
- `setProjectGridLayout` is debounced (500ms) to prevent concurrent IPC writes on rapid clicks. It also guards against empty `repoPath`.
- `loadUIState` migration reads `useRepoStore.getState().repos` — callers must ensure `loadRepos()` completes before `loadUIState()`.
