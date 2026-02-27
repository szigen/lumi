# TerminalPanel Component

Grid container for terminal cards with spawn controls.

## Files
- **TerminalPanel.tsx** — Grid layout, spawn orchestration, column toggling.
- **PersonaDropdown.tsx** — Hover dropdown for new terminal/persona spawn.
- **GridLayoutPopup.tsx** — Click popup for selecting grid layout mode (auto/columns/rows) and count.

## Store Dependencies
- `useTerminalStore` — `terminals`, `getTerminalCount`, `syncFromMain`.
- `useAppStore` — `activeTab`, `getActiveGridLayout`, `setProjectGridLayout`, `focusModeActive`, `aiProvider`.
- `useRepoStore` — `getRepoByName`.

## Key Patterns
- `canSpawnTerminal()` enforces terminal limit.
- Spawn and kill handlers call IPC then `syncFromMain()`; renderer does not manually construct terminal records.
- Spawn handlers (`handleNewTerminal`, `handlePersonaSelect`, `handleNewBash`) call `setActiveTerminal(result.id)` after `syncFromMain()` to auto-focus the new terminal.
- `handleNewBash` passes `'Bash'` as task label so the terminal card has a visible name.
- Grid layout: per-project via `GridLayoutPopup`, supports auto/columns/rows modes with counts 2-5.
- `GridLayoutPopup` uses selectors (`useAppStore((s) => s.getActiveGridLayout())`) to avoid full-store subscription and infinite re-render loops.
- Focus mode computes explicit row heights to fit viewport.

## Watch Out
- PersonaDropdown loads project personas on repo change and emits `onOpenChange` for focus-mode hover behavior.
- Keep all terminals mounted and hide inactive repo cards via `display: none` to preserve xterm state.
