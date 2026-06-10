import { trimOutputTail, OUTPUT_TRIM_DEFAULTS } from '../../shared/output-trim'

export class OutputBuffer {
  private buffer = ''
  private readonly maxSize: number
  private readonly searchWindow: number

  constructor(
    maxSize = OUTPUT_TRIM_DEFAULTS.MAX_SIZE,
    searchWindow = OUTPUT_TRIM_DEFAULTS.NEWLINE_SEARCH_WINDOW
  ) {
    this.maxSize = maxSize
    this.searchWindow = searchWindow
  }

  append(data: string): void {
    this.buffer = trimOutputTail(this.buffer + data, this.maxSize, this.searchWindow)
  }

  get(): string {
    return this.buffer
  }
}
