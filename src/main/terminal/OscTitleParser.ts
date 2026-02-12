const OSC_START = '\x1b]0;'
const OSC_START_LEN = 4
const BEL = '\x07'
const ST = '\x1b\\'
const MAX_BUFFER_SIZE = 4096

/**
 * Buffers partial OSC title sequences across PTY data chunks
 * and invokes a callback with the parsed working/idle state.
 */
export class OscTitleParser {
  private buffers: Map<string, string> = new Map()

  /** Parse OSC title sequences from a PTY data chunk */
  parse(id: string, data: string, onTitle: (isWorking: boolean) => void): void {
    let buf = (this.buffers.get(id) || '') + data

    while (true) {
      const oscStart = buf.indexOf(OSC_START)
      if (oscStart === -1) {
        this.buffers.delete(id)
        return
      }

      const afterOsc = oscStart + OSC_START_LEN
      const belIdx = buf.indexOf(BEL, afterOsc)
      const stIdx = buf.indexOf(ST, afterOsc)

      let endIdx = -1
      let endLen = 0
      if (belIdx !== -1 && (stIdx === -1 || belIdx < stIdx)) {
        endIdx = belIdx
        endLen = 1
      } else if (stIdx !== -1) {
        endIdx = stIdx
        endLen = 2
      }

      if (endIdx === -1) {
        // Incomplete sequence — keep from oscStart, guard against unbounded growth
        const partial = buf.slice(oscStart)
        if (partial.length > MAX_BUFFER_SIZE) {
          this.buffers.delete(id)
        } else {
          this.buffers.set(id, partial)
        }
        return
      }

      const title = buf.slice(afterOsc, endIdx)
      onTitle(!title.startsWith('\u2733'))

      buf = buf.slice(endIdx + endLen)
    }
  }

  /** Clean up buffer for a terminal */
  delete(id: string): void {
    this.buffers.delete(id)
  }

  /** Clean up all buffers */
  clear(): void {
    this.buffers.clear()
  }
}
