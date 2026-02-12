# TerminalPanel Component

Grid container for terminal cards with spawn controls.

## Files
- **TerminalPanel.tsx** — Grid layout, spawn orchestration, column toggling
- **PersonaDropdown.tsx** — Hover dropdown for "New Claude" + persona selection

## Store Dependencies
- `useTerminalStore` — `terminals`, `addTerminal`, `removeTerminal`, `getTerminalCount`
- `useAppStore` — `activeTab`, `gridColumns`, `setGridColumns`
- `useRepoStore` — `getRepoByName`

## Key Patterns
- `canSpawnTerminal()` — shared validation, checks count vs `DEFAULT_CONFIG.maxTerminals`
- `registerSpawnedTerminal()` — shared callback: adds to store, optionally runs initial command
- Grid columns cycle: auto → 2 → 3 (toggle button)
- Header is hidden when `focusModeActive` is true — controls move to FocusExitControl
- All terminals rendered but filtered by `display: none` for inactive repos (preserves xterm state across tab switches)

## Watch Out
- PersonaDropdown loads personas via `window.api.getPersonas(repoPath)` on mount and repoPath change
- PersonaDropdown uses 150ms close delay (`closeTimerRef`) to prevent flickering
- IPC calls (spawn, kill) wrapped in try/catch — errors logged to console
- Empty state shows PersonaDropdown as action button (different placement than header)
