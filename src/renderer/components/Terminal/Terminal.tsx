import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useTerminalStore } from '../../stores/useTerminalStore'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string
  onClose: () => void
}

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const { terminals, outputs, updateTerminal, setActiveTerminal } = useTerminalStore()
  const terminal = terminals.get(terminalId)
  const output = outputs.get(terminalId) || ''

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
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4'
      },
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block'
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
      // Only write the new content
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

  return (
    <div
      className="h-full flex flex-col bg-bg-primary border border-border-primary rounded overflow-hidden"
      onClick={() => setActiveTerminal(terminalId)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border-primary">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            terminal?.status === 'running' ? 'bg-green-500' :
            terminal?.status === 'completed' ? 'bg-blue-500' :
            terminal?.status === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-sm text-text-primary truncate">
            {terminal?.task || 'Terminal'}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          ✕
        </button>
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}
