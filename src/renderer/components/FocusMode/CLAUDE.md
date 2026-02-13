# FocusMode Components

Distraction-free terminal view with hover-activated controls.

## Files
- **FocusExitControl.tsx** — Enhanced hover bar with terminal controls and exit button
- **FocusHoverBar.tsx** — (if exists) Additional hover UI elements

## FocusExitControl Behavior
- On mount: hides macOS traffic lights via `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY` IPC
- On unmount: restores traffic light visibility
- Hover zone (top 50px, 500ms delay) toggles bar visibility and traffic lights together
- Left section: terminal count, grid toggle (auto/2/3 columns), PersonaDropdown for spawning
- Right section: exit focus mode button
- Reuses `canSpawnTerminal()` validation and `registerSpawnedTerminal()` pattern from TerminalPanel
- Bar is draggable (`-webkit-app-region: drag`) with interactive children opted out
- **Dropdown open guard:** Uses `isDropdownOpenRef` to prevent hiding the hover bar while PersonaDropdown is open. `handleDropdownOpenChange` callback updates the ref; `handleMouseMove` skips `setVisible(false)` when ref is true. When dropdown closes, ref resets → next mousemove hides bar normally.

## Store Dependencies
- `useAppStore` — `toggleFocusMode`, `activeTab`, `gridColumns`, `setGridColumns`
- `useTerminalStore` — `terminals`, `addTerminal`, `removeTerminal`, `getTerminalCount`
- `useRepoStore` — `getRepoByName`

## IPC Dependencies
- `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY` — controls macOS window button visibility (guarded on main process — no-op on Windows/Linux)
