export const OUTPUT_TRIM_DEFAULTS = {
  MAX_SIZE: 500_000,
  NEWLINE_SEARCH_WINDOW: 2048
} as const

/**
 * Trim the head of an output stream so at most `maxSize` chars remain.
 * Looks forward up to `searchWindow` for the nearest newline to avoid
 * splitting ANSI escape sequences mid-stream.
 */
export function trimOutputTail(
  text: string,
  maxSize: number = OUTPUT_TRIM_DEFAULTS.MAX_SIZE,
  searchWindow: number = OUTPUT_TRIM_DEFAULTS.NEWLINE_SEARCH_WINDOW
): string {
  if (text.length <= maxSize) return text

  let cutIndex = text.length - maxSize
  const searchEnd = Math.min(cutIndex + searchWindow, text.length)
  const newlinePos = text.indexOf('\n', cutIndex)

  if (newlinePos !== -1 && newlinePos < searchEnd) {
    cutIndex = newlinePos + 1
  }

  return text.slice(cutIndex)
}
