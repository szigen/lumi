# FocusMode Components

Distraction-free terminal view with hover-activated controls.

## Files
- **FocusExitControl.tsx** — Hover bar with spawn/grid controls and exit action.

## Behavior
- On mount/unmount, toggles macOS traffic-light visibility via `WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY`.
- Hover zone (`top 50px`, `500ms` delay) controls bar visibility.
- Uses PersonaDropdown for new terminal/persona spawning.
- Spawn/kill flows rely on `syncFromMain()` instead of local optimistic terminal insertion.

## Store Dependencies
- `useAppStore` — focus mode, active tab, grid state.
- `useTerminalStore` — `terminals`, `getTerminalCount`, `syncFromMain`.
- `useRepoStore` — active repo lookup.
