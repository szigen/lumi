const DEFAULT_MAX_SIZE = 100_000
const NEWLINE_SEARCH_WINDOW = 1024

export class OutputBuffer {
  private buffer = ''
  private readonly maxSize: number
  private readonly searchWindow: number

  constructor(maxSize = DEFAULT_MAX_SIZE, searchWindow = NEWLINE_SEARCH_WINDOW) {
    this.maxSize = maxSize
    this.searchWindow = searchWindow
  }

  append(data: string): void {
    this.buffer += data
    if (this.buffer.length > this.maxSize) {
      this.truncate()
    }
  }

  get(): string {
    return this.buffer
  }

  private truncate(): void {
    let cutIndex = this.buffer.length - this.maxSize
    // Look forward up to searchWindow for the nearest newline to avoid splitting ANSI escape codes
    const searchEnd = Math.min(cutIndex + this.searchWindow, this.buffer.length)
    const newlinePos = this.buffer.indexOf('\n', cutIndex)

    if (newlinePos !== -1 && newlinePos < searchEnd) {
      cutIndex = newlinePos + 1
    }

    this.buffer = this.buffer.slice(cutIndex)
  }
}
