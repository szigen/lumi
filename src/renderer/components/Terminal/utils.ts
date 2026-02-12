import type { Terminal as XTerm } from '@xterm/xterm'
import { TERMINAL_CONSTANTS } from './constants'

/** Write large buffer in chunks using requestAnimationFrame to avoid UI freeze */
export function writeChunked(xterm: XTerm, data: string): void {
  const { WRITE_CHUNK_SIZE } = TERMINAL_CONSTANTS

  if (data.length <= WRITE_CHUNK_SIZE) {
    xterm.write(data)
    return
  }

  let offset = 0
  function writeNext() {
    if (offset >= data.length) return
    const chunk = data.slice(offset, offset + WRITE_CHUNK_SIZE)
    xterm.write(chunk)
    offset += WRITE_CHUNK_SIZE
    if (offset < data.length) {
      requestAnimationFrame(writeNext)
    }
  }
  writeNext()
}
