import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useTerminalStore } from '../../../stores/useTerminalStore'
import { writeChunked } from '../utils'

export type OutputPatch =
  | { kind: 'noop' }
  | { kind: 'append'; chunk: string }
  | { kind: 'replace'; value: string }

export function computeOutputPatch(previous: string, next: string): OutputPatch {
  if (previous === next) {
    return { kind: 'noop' }
  }

  if (previous.length > 0 && next.startsWith(previous)) {
    return { kind: 'append', chunk: next.slice(previous.length) }
  }

  return { kind: 'replace', value: next }
}

export function useTerminalOutputRenderer(
  terminalId: string,
  xtermRef: React.RefObject<XTerm | null>,
  xtermReady: boolean
) {
  const output = useTerminalStore((s) => s.outputs.get(terminalId) || '')
  const renderedOutputRef = useRef('')

  useEffect(() => {
    renderedOutputRef.current = ''
  }, [terminalId])

  useEffect(() => {
    if (!xtermReady || !xtermRef.current) return

    const xterm = xtermRef.current
    const patch = computeOutputPatch(renderedOutputRef.current, output)

    if (patch.kind === 'append') {
      if (patch.chunk.length > 0) {
        xterm.write(patch.chunk)
      }
    } else if (patch.kind === 'replace') {
      xterm.clear()
      if (patch.value.length > 0) {
        writeChunked(xterm, patch.value)
      }
    }

    renderedOutputRef.current = output
  }, [output, xtermReady, xtermRef])
}
