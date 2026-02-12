import type { ITheme } from '@xterm/xterm'

export const TERMINAL_CONSTANTS = {
  RESIZE_DEBOUNCE_MS: 150,
  SCROLLBACK_LINES: 5000,
  INTERSECTION_THRESHOLD: 0.01,
  WRITE_CHUNK_SIZE: 10_000,
} as const

export const XTERM_THEME: ITheme = {
  background: '#12121f',
  foreground: '#e2e2f0',
  cursor: '#a78bfa',
  cursorAccent: '#12121f',
  selectionBackground: 'rgba(139, 92, 246, 0.3)',
  scrollbarSliderBackground: 'rgba(42, 42, 74, 0.5)',
  scrollbarSliderHoverBackground: 'rgba(74, 74, 106, 0.7)',
  scrollbarSliderActiveBackground: 'rgba(74, 74, 106, 0.9)',
  black: '#0a0a12',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#fbbf24',
  blue: '#a78bfa',
  magenta: '#8b5cf6',
  cyan: '#22d3ee',
  white: '#e2e2f0',
  brightBlack: '#4a4a6a',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde68a',
  brightBlue: '#c4b5fd',
  brightMagenta: '#a78bfa',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
}
