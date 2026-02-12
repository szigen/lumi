import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { StatusDot } from '../icons'
import { useXTermInstance, useTerminalResize, useTerminalIPC, useTerminalDragDrop } from './hooks'
import { writeChunked } from './utils'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string
  onClose: () => void
}

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(13)

  const terminal = useTerminalStore((s) => s.terminals.get(terminalId))
  const output = useTerminalStore((s) => s.outputs.get(terminalId) || '')
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId)
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal)

  const status = terminal?.status || 'idle'
  const isActive = activeTerminalId === terminalId

  const { isDragOver, dragHandlers } = useTerminalDragDrop(terminalId)
  const { xtermRef, fitAddonRef } = useXTermInstance(terminalRef, fontSize, terminalId)

  useTerminalResize(terminalRef, xtermRef, fitAddonRef, terminalId)
  useTerminalIPC(terminalId, xtermRef)

  // Load font size from config
  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      const size = (cfg as Record<string, unknown>)?.terminalFontSize
      if (typeof size === 'number') setFontSize(size)
    })
  }, [])

  // Write initial output after xterm mounts
  useEffect(() => {
    if (xtermRef.current && output) {
      writeChunked(xtermRef.current, output)
    }
    // Only on initial mount — IPC hook handles subsequent output
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xtermRef.current])

  // Focus xterm when this terminal becomes active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus()
    }
  }, [isActive, xtermRef])

  // Notify main process of focus changes for status dot
  useEffect(() => {
    if (isActive) {
      window.api.focusTerminal(terminalId)
    }
  }, [isActive, terminalId])

  return (
    <div
      className={`terminal-card ${isDragOver ? 'terminal-card--drag' : ''} ${isActive ? 'terminal-card--focused' : ''}`}
      {...dragHandlers}
      onClick={() => setActiveTerminal(terminalId)}
    >
      <div className="terminal-card__header">
        <StatusDot status={status} />
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
