import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { IPtyDataInspector } from './types'

const LOG_DIR = path.join(app.getPath('home'), '.ai-orchestrator', 'pty-logs')

function toLogFriendly(data: string): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i)
    if (code >= 0x20 && code < 0x7f) {
      result += data[i]
    } else {
      result += `\\x${code.toString(16).padStart(2, '0')}`
    }
  }
  return result
}

function formatTimestamp(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

interface TerminalStream {
  stream: fs.WriteStream
  chunkCount: number
}

export class PtyRawLogger implements IPtyDataInspector {
  private enabled = false
  private streams: Map<string, TerminalStream> = new Map()
  private logDir: string = LOG_DIR
  private totalChunks = 0

  inspect(terminalId: string, data: string): void {
    if (!this.enabled) return

    let entry = this.streams.get(terminalId)
    if (!entry) {
      entry = this.createStream(terminalId)
      this.streams.set(terminalId, entry)
    }

    entry.chunkCount++
    this.totalChunks++
    const now = new Date()
    const byteLen = Buffer.byteLength(data, 'utf8')
    const header = `--- [${formatTimestamp(now)}] [chunk ${entry.chunkCount}, ${byteLen} bytes] ---\n`
    const body = toLogFriendly(data) + '\n\n'
    entry.stream.write(header + body)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled

    if (!enabled) {
      for (const [id, entry] of this.streams) {
        entry.stream.end()
        this.streams.delete(id)
      }
      this.totalChunks = 0
    }
  }

  onTerminalExit(terminalId: string): void {
    const entry = this.streams.get(terminalId)
    if (entry) {
      entry.stream.end()
      this.streams.delete(terminalId)
    }
  }

  getLogPath(): string | null {
    if (!this.enabled) return null
    return this.logDir
  }

  getStats(): { activeStreams: number; totalChunks: number } {
    return {
      activeStreams: this.streams.size,
      totalChunks: this.totalChunks
    }
  }

  private createStream(terminalId: string): TerminalStream {
    fs.mkdirSync(this.logDir, { recursive: true })

    const shortId = terminalId.substring(0, 8)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${shortId}_${timestamp}.log`
    const filePath = path.join(this.logDir, filename)

    const stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' })

    // Write file header
    const header = [
      '=== PTY Raw Log ===',
      `Terminal: ${terminalId}`,
      `Started: ${new Date().toISOString()}`,
      '===',
      '',
      ''
    ].join('\n')
    stream.write(header)

    return { stream, chunkCount: 0 }
  }
}
