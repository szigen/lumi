import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { X } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { StatusDot } from '../icons'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string
  onClose: () => void
}

// Synthwave terminal theme
const SYNTHWAVE_THEME = {
  background: '#0c0e12',
  foreground: '#e4e4e7',
  cursor: '#8b5cf6',
  cursorAccent: '#0c0e12',
  selectionBackground: 'rgba(139, 92, 246, 0.3)',
  selectionForeground: '#e4e4e7',
  black: '#1a1e25',
  red: '#f43f5e',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#8b5cf6',
  magenta: '#d946ef',
  cyan: '#06b6d4',
  white: '#e4e4e7',
  brightBlack: '#71717a',
  brightRed: '#fb7185',
  brightGreen: '#34d399',
  brightYellow: '#fbbf24',
  brightBlue: '#a78bfa',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#fafafa',
}

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const { terminals, outputs, updateTerminal, setActiveTerminal } = useTerminalStore()
  const terminal = terminals.get(terminalId)
  const output = outputs.get(terminalId) || ''

  const status = terminal?.status || 'idle'

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = xtermRef.current
      window.api.writeTerminal(terminalId, `\x1b[8;${rows};${cols}t`)
    }
  }, [terminalId])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      theme: SYNTHWAVE_THEME,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Handle user input
    xterm.onData((data) => {
      window.api.writeTerminal(terminalId, data)
    })

    // Write existing output
    if (output) {
      xterm.write(output)
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [terminalId, handleResize])

  // Write new output
  useEffect(() => {
    if (xtermRef.current && output) {
      const currentContent = xtermRef.current.buffer.active.length
      if (currentContent === 0) {
        xtermRef.current.write(output)
      }
    }
  }, [output])

  // Listen for terminal output
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

    window.api.onTerminalOutput(handleOutput)
    window.api.onTerminalExit(handleExit)
  }, [terminalId, updateTerminal])

  // Status-based glow classes
  const statusGlowClass = {
    running: 'shadow-glow-success',
    completed: 'shadow-glow-info',
    error: 'shadow-glow-error',
    idle: '',
  }[status]

  const statusBorderClass = {
    running: 'border-success/30',
    completed: 'border-info/30',
    error: 'border-error/30',
    idle: 'border-border-default',
  }[status]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`
        h-full flex flex-col
        bg-bg-primary rounded-xl overflow-hidden
        border ${statusBorderClass}
        ${statusGlowClass}
        transition-shadow duration-slow
      `}
      onClick={() => setActiveTerminal(terminalId)}
    >
      {/* Terminal Header */}
      <div className="
        flex items-center justify-between
        px-3 py-2
        bg-bg-secondary/80 backdrop-blur-sm
        border-b border-border-subtle
      ">
        <div className="flex items-center gap-2.5">
          <StatusDot
            status={status === 'idle' ? 'idle' : status}
            size="md"
          />
          <span className="text-sm text-text-primary font-medium truncate max-w-48">
            {terminal?.task || 'Terminal'}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="
            p-1 rounded-md
            text-text-tertiary hover:text-text-primary
            hover:bg-surface-hover
            transition-all duration-fast
          "
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Terminal Content */}
      <div ref={terminalRef} className="flex-1 bg-bg-primary" />
    </motion.div>
  )
}
