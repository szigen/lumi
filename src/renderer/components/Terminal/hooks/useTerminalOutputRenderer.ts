import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useTerminalStore, EMPTY_TERMINAL_OUTPUT } from '../../../stores/useTerminalStore'
import type { TerminalOutput } from '../../../stores/useTerminalStore'
import { writeChunked } from '../utils'

export type OutputPatch =
  | { kind: 'noop' }
  | { kind: 'append'; chunk: string }
  | { kind: 'replace'; value: string }

export interface RenderedOutputCursor {
  totalLength: number
  epoch: number
}

/**
 * Compute what to write to xterm based on absolute stream offsets instead of
 * comparing full strings — the store buffer is capped, so prefix comparisons
 * would break once trimming kicks in, and O(n) scans per chunk caused
 * renderer OOM under heavy output.
 */
export function computeOutputPatch(
  rendered: RenderedOutputCursor,
  output: TerminalOutput
): OutputPatch {
  const delta = output.totalLength - rendered.totalLength

  if (output.epoch === rendered.epoch) {
    if (delta === 0) return { kind: 'noop' }
    if (delta > 0 && delta <= output.text.length) {
      return { kind: 'append', chunk: output.text.slice(output.text.length - delta) }
    }
  }

  return { kind: 'replace', value: output.text }
}

export function useTerminalOutputRenderer(
  terminalId: string,
  xtermRef: React.RefObject<XTerm | null>,
  xtermReady: boolean
) {
  const output = useTerminalStore((s) => s.outputs.get(terminalId)) ?? EMPTY_TERMINAL_OUTPUT
  const renderedRef = useRef<RenderedOutputCursor>({ totalLength: 0, epoch: 0 })

  useEffect(() => {
    renderedRef.current = { totalLength: 0, epoch: 0 }
  }, [terminalId])

  useEffect(() => {
    if (!xtermReady || !xtermRef.current) return

    const xterm = xtermRef.current
    const patch = computeOutputPatch(renderedRef.current, output)

    if (patch.kind === 'append') {
      xterm.write(patch.chunk)
    } else if (patch.kind === 'replace') {
      xterm.clear()
      if (patch.value.length > 0) {
        writeChunked(xterm, patch.value)
      }
    }

    renderedRef.current = { totalLength: output.totalLength, epoch: output.epoch }
  }, [output, xtermReady, xtermRef])
}
