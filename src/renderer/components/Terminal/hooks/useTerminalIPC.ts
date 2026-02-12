import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useTerminalStore } from '../../../stores/useTerminalStore'
import { writeChunked } from '../utils'

export function useTerminalIPC(
  terminalId: string,
  xtermRef: React.RefObject<XTerm | null>
) {
  const { updateTerminal } = useTerminalStore()

  // Handle real-time output and exit events
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
  }, [terminalId, updateTerminal, xtermRef])

  // Handle buffer restoration from sync
  const lastOutputLengthRef = useRef(0)
  const output = useTerminalStore((s) => s.outputs.get(terminalId) || '')

  useEffect(() => {
    if (!xtermRef.current) return

    const currentLength = output.length
    const lastLength = lastOutputLengthRef.current

    if (currentLength > lastLength && lastLength === 0 && currentLength > 0) {
      xtermRef.current.clear()
      writeChunked(xtermRef.current, output)
    }

    lastOutputLengthRef.current = currentLength
  }, [output, xtermRef])
}
