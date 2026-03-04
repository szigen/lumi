import type { Terminal as XTerm } from '@xterm/xterm'
import { TERMINAL_CONSTANTS } from './constants'

export interface WriteChunkedHandle {
  cancel: () => void
}

/** Write large buffer in chunks using requestAnimationFrame to avoid UI freeze */
export function writeChunked(xterm: XTerm, data: string): WriteChunkedHandle {
  const { WRITE_CHUNK_SIZE } = TERMINAL_CONSTANTS

  if (data.length <= WRITE_CHUNK_SIZE) {
    xterm.write(data)
    return { cancel: () => {} }
  }

  const state = { cancelled: false }
  let offset = 0

  function writeNext() {
    if (state.cancelled || offset >= data.length) return
    const chunk = data.slice(offset, offset + WRITE_CHUNK_SIZE)
    xterm.write(chunk)
    offset += WRITE_CHUNK_SIZE
    if (offset < data.length) {
      requestAnimationFrame(writeNext)
    }
  }
  requestAnimationFrame(writeNext)

  return { cancel: () => { state.cancelled = true } }
}
