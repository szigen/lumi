# Preload Bridge

Secure IPC bridge between main and renderer via `contextBridge`.

## Architecture
- `index.ts` — exposes `window.api` object with typed methods for all IPC operations
- `ipc-utils.ts` — helper utilities (`invokeIpc`, `createIpcListener` with auto-cleanup)
- All methods map to IPC channels from `shared/ipc-channels.ts`

## Rules
- `nodeIntegration: false`, `contextIsolation: true` — only `window.api` is accessible from renderer
- Event listeners use `createIpcListener` which returns a cleanup function
- Every new IPC channel needs a corresponding method added here

## API Groups
- Terminal: spawn, write, kill, resize, list, getBuffer + event listeners (output, exit, bell, sync)
- Repository: getRepos, getFileTree, watch/unwatch + change listeners
- Git: commits, branches, status, commit
- Config: get/set config and UI state
- Actions: list, execute, delete, loadProject, createNew + change listener
- Personas: list, spawn, loadProject + change listener
- Bugs: listBugs, createBug, updateBug, deleteBug, addFix, updateFix, askClaude, applyFix
- System Checks: runSystemChecks, fixSystemCheck (onboarding health checks)
- App: confirm quit flow, shortcut events
