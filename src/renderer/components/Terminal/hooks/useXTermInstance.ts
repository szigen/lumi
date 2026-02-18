import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { TERMINAL_CONSTANTS, XTERM_THEME } from '../constants'

export function useXTermInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fontSize: number,
  terminalId: string
) {
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [xtermReady, setXtermReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return

    const xterm = new XTerm({
      allowProposedApi: true,
      fontSize,
      fontFamily: "'JetBrains Mono', monospace",
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'none',
      scrollback: TERMINAL_CONSTANTS.SCROLLBACK_LINES,
      theme: XTERM_THEME,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    const webLinksAddon = new WebLinksAddon()
    xterm.loadAddon(webLinksAddon)

    const unicode11Addon = new Unicode11Addon()
    xterm.loadAddon(unicode11Addon)
    xterm.unicode.activeVersion = '11'

    xterm.open(containerRef.current)
    fitAddon.fit()

    // GPU-accelerated rendering with fallback
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => webglAddon.dispose())
      xterm.loadAddon(webglAddon)
    } catch {
      // WebGL not available, canvas renderer is fine
    }

    // Windows/Linux: Ctrl+Shift+C → copy, Ctrl+Shift+V → paste
    if (window.api.platform !== 'darwin') {
      xterm.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.type === 'keydown') {
          if (e.key === 'C' || e.key === 'c') {
            const selection = xterm.getSelection()
            if (selection) {
              navigator.clipboard.writeText(selection)
            }
            return false
          }
          if (e.key === 'V' || e.key === 'v') {
            navigator.clipboard.readText().then((text) => {
              xterm.paste(text)
            })
            return false
          }
        }
        return true
      })
    }

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon
    setXtermReady(true)

    xterm.onData((data) => {
      window.api.writeTerminal(terminalId, data)
    })

    return () => {
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      setXtermReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId, fontSize])

  return { xtermRef, fitAddonRef, xtermReady }
}
