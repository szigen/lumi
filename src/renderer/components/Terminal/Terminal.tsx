import { useEffect, useRef, useCallback, useState } from 'react'
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

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { terminals, outputs, updateTerminal, setActiveTerminal } = useTerminalStore()
  const terminal = terminals.get(terminalId)
  const output = outputs.get(terminalId) || ''

  const status = terminal?.status || 'idle'

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = xtermRef.current
      window.api.resizeTerminal(terminalId, cols, rows)
    }
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
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      fontSize: 13,
      fontFamily: "monospace",
      cursorBlink: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    xterm.onData((data) => {
      window.api.writeTerminal(terminalId, data)
    })

    if (output) {
      xterm.write(output)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId, handleResize])

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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setActiveTerminal(terminalId)}
    >
      <div>
        <StatusDot status={status === 'idle' ? 'idle' : status} />
        <span>{terminal?.task || 'Terminal'}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose() }}>
          <X size={16} />
        </button>
      </div>

      <div ref={terminalRef} />
      {isDragOver && <span>Drop file here</span>}
    </div>
  )
}
