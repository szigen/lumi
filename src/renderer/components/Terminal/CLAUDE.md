# Terminal Component

xterm.js wrapper per session. Logic decomposed into hooks, constants, and utilities.

## Files
- **Terminal.tsx** — Thin shell that composes hooks and renders the card
- **constants.ts** — `TERMINAL_CONSTANTS` (debounce ms, scrollback, chunk size) and `XTERM_THEME` (ANSI palette matching app theme)
- **utils.ts** — `writeChunked(xterm, data)` — writes large buffers in 10KB chunks via `requestAnimationFrame`
- **hooks/useXTermInstance.ts** — xterm init, addon loading (FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon with fallback), exposes `xtermReady`
- **hooks/useTerminalResize.ts** — ResizeObserver + IntersectionObserver, 150ms debounce via `useRef`
- **hooks/useTerminalOutputRenderer.ts** — applies store output to xterm via patch strategy (`append` delta or `replace` full redraw)
- **hooks/useTerminalDragDrop.ts** — drag-over/drop state, writes dropped file path to PTY

## Store Dependencies
- `useTerminalStore` — reads `terminals`, `outputs`, `activeTerminalId`; calls `setActiveTerminal`

## Watch Out
- xterm init guards on `containerRef.current` existing — won't create if DOM not ready
- `useXTermInstance` requires `allowProposedApi: true` for Unicode11Addon
- WebGL addon wrapped in try/catch — silently falls back to canvas renderer
- Output replay is driven by store state; global terminal bridge in `useTerminalStore` owns IPC listeners
- `useTerminalOutputRenderer` must use `xtermReady` guard so restore cannot race with xterm initialization
- Font size loaded async from config on mount — initial render uses default 13px
