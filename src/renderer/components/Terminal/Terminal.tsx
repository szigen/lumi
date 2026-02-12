import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { X } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { StatusDot } from '../icons'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string
  onClose: () => void
}

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fontSize, setFontSize] = useState(13)

  const { terminals, outputs, updateTerminal, setActiveTerminal, activeTerminalId } = useTerminalStore()
  const terminal = terminals.get(terminalId)
  const output = outputs.get(terminalId) || ''

  const status = terminal?.status || 'idle'
  const isActive = activeTerminalId === terminalId

  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current) return

    const debounceTimer = (handleResize as { _timer?: ReturnType<typeof setTimeout> })._timer
    if (debounceTimer) clearTimeout(debounceTimer)

    ;(handleResize as { _timer?: ReturnType<typeof setTimeout> })._timer = setTimeout(() => {
      fitAddonRef.current?.fit()
      const cols = xtermRef.current?.cols
      const rows = xtermRef.current?.rows
      if (cols && rows) {
        window.api.resizeTerminal(terminalId, cols, rows)
      }
    }, 150)
  }, [terminalId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const path = e.dataTransfer.getData('text/plain')
    if (path) {
      window.api.writeTerminal(terminalId, path)
    }
  }, [terminalId])

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      const size = (cfg as Record<string, unknown>)?.terminalFontSize
      if (typeof size === 'number') setFontSize(size)
    })
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      allowProposedApi: true,
      fontSize,
      fontFamily: "'JetBrains Mono', monospace",
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'none',
      scrollback: 5000,
      theme: {
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
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    // Web links addon - URLs become clickable
    const webLinksAddon = new WebLinksAddon()
    xterm.loadAddon(webLinksAddon)

    // Unicode11 addon - proper emoji/unicode rendering
    const unicode11Addon = new Unicode11Addon()
    xterm.loadAddon(unicode11Addon)
    xterm.unicode.activeVersion = '11'

    xterm.open(terminalRef.current)
    fitAddon.fit()

    // WebGL addon - GPU-accelerated rendering (with fallback)
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      xterm.loadAddon(webglAddon)
    } catch {
      // WebGL not available, fall back to canvas renderer
    }

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    xterm.onData((data) => {
      window.api.writeTerminal(terminalId, data)
    })

    if (output) {
      writeChunked(xterm, output)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      const timer = (handleResize as { _timer?: ReturnType<typeof setTimeout> })._timer
      if (timer) clearTimeout(timer)
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId, handleResize, fontSize])

  // Refit xterm when terminal becomes visible (e.g. repo switch from display:none -> block)
  useEffect(() => {
    const el = terminalRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleResize()
      },
      { threshold: 0.01 }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [handleResize])

  useEffect(() => {
    const handleOutput = (id: string, data: string) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(data)
      }
    }

    const handleExit = (id: string, code: number) => {
      if (id === terminalId) {
        updateTerminal(terminalId, {
          status: code === 0 ? 'completed' : 'error'
        })
      }
    }

    const cleanupOutput = window.api.onTerminalOutput(handleOutput)
    const cleanupExit = window.api.onTerminalExit(handleExit)

    return () => {
      cleanupOutput()
      cleanupExit()
    }
  }, [terminalId, updateTerminal])

  // Handle output buffer restoration from sync
  const lastOutputLengthRef = useRef(0)

  useEffect(() => {
    if (!xtermRef.current) return

    // If output grew significantly (sync happened), re-render
    const currentLength = output.length
    const lastLength = lastOutputLengthRef.current

    if (currentLength > lastLength && lastLength === 0 && currentLength > 0) {
      // Terminal was empty and got buffer from sync - write it chunked
      xtermRef.current.clear()
      writeChunked(xtermRef.current, output)
    }

    lastOutputLengthRef.current = currentLength
  }, [output])

  // Focus xterm when this terminal becomes active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus()
    }
  }, [isActive])

  return (
    <div
      className={`terminal-card ${isDragOver ? 'terminal-card--drag' : ''} ${isActive ? 'terminal-card--focused' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setActiveTerminal(terminalId)}
    >
      <div className="terminal-card__header">
        <StatusDot status={status === 'idle' ? 'idle' : status} />
        <span className="terminal-card__title">{terminal?.task || terminal?.name || 'Terminal'}</span>
        <button
          className="terminal-card__close"
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="terminal-card__body">
        <div ref={terminalRef} />
        {isDragOver && <span className="drag-overlay">Drop file here</span>}
      </div>
    </div>
  )
}

/** Write large buffer in 10KB chunks using requestAnimationFrame to avoid UI freeze */
function writeChunked(xterm: XTerm, data: string) {
  const CHUNK_SIZE = 10_000
  if (data.length <= CHUNK_SIZE) {
    xterm.write(data)
    return
  }

  let offset = 0
  function writeNext() {
    if (offset >= data.length) return
    const chunk = data.slice(offset, offset + CHUNK_SIZE)
    xterm.write(chunk)
    offset += CHUNK_SIZE
    if (offset < data.length) {
      requestAnimationFrame(writeNext)
    }
  }
  writeNext()
}
