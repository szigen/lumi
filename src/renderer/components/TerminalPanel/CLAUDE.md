# TerminalPanel Component

Grid container for terminal cards with spawn controls.

## Files
- **TerminalPanel.tsx** — Grid layout, spawn orchestration, column toggling.
- **PersonaDropdown.tsx** — Hover dropdown for new terminal/persona/bash spawn.

## Store Dependencies
- `useTerminalStore` — `terminals`, `getTerminalCount`, `syncFromMain`.
- `useAppStore` — `activeTab`, `gridColumns`, `setGridColumns`, `focusModeActive`, `aiProvider`.
- `useRepoStore` — `getRepoByName`.

## Key Patterns
- `canSpawnTerminal()` enforces terminal limit.
- Spawn and kill handlers call IPC then `syncFromMain()`; renderer does not manually construct terminal records.
- Spawn handlers (`handleNewTerminal`, `handleNewBash`, `handlePersonaSelect`) call `setActiveTerminal(result.id)` after `syncFromMain()` to auto-focus the new terminal.
- `handleNewBash` spawns a plain shell terminal without writing any AI provider launch command.
- Grid columns cycle: `auto -> 2 -> 3`.
- Focus mode computes explicit row heights to fit viewport.

## Watch Out
- PersonaDropdown loads project personas on repo change and emits `onOpenChange` for focus-mode hover behavior.
- PersonaDropdown always shows on hover (even without personas) because "New Bash" is a fixed item.
- Keep all terminals mounted and hide inactive repo cards via `display: none` to preserve xterm state.
