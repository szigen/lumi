import { useEffect, useRef, useCallback } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { TERMINAL_CONSTANTS } from '../constants'

export function useTerminalResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  xtermRef: React.RefObject<XTerm | null>,
  fitAddonRef: React.RefObject<FitAddon | null>,
  terminalId: string
) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fitAddonRef.current?.fit()
      const cols = xtermRef.current?.cols
      const rows = xtermRef.current?.rows
      if (cols && rows) {
        window.api.resizeTerminal(terminalId, cols, rows)
      }
    }, TERMINAL_CONSTANTS.RESIZE_DEBOUNCE_MS)
  }, [terminalId, xtermRef, fitAddonRef])

  // ResizeObserver for container size changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(el)

    return () => {
      resizeObserver.disconnect()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [containerRef, handleResize])

  // IntersectionObserver for visibility changes (e.g. repo switch)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleResize()
      },
      { threshold: TERMINAL_CONSTANTS.INTERSECTION_THRESHOLD }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [containerRef, handleResize])
}
