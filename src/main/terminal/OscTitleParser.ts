const OSC_START = '\x1b]'
const OSC_START_LEN = 2
const OSC_TITLE_COMMANDS = new Set(['0', '2'])
const COMMAND_SEPARATOR = ';'
const BEL = '\x07'
const ST = '\x1b\\'
const MAX_BUFFER_SIZE = 4096

const CLAUDE_IDLE_PREFIX = '\u2733'
const CLAUDE_HINT_RE = /claude code|(?:^|[^a-z0-9_])claude(?:[^a-z0-9_]|$)/i
const CODEX_HINT_RE = /openai codex|(?:^|[^a-z0-9_])(all[_-]?idle|tool[_-]?use|input[_-]?required)(?:[^a-z0-9_]|$)/i
const CODEX_IDLE_RE = /(?:^|[^a-z0-9_])(all[_-]?idle|idle_state)(?:[^a-z0-9_]|$)/i
const CODEX_WORKING_RE = /(?:^|[^a-z0-9_])(working|tool[_-]?use|input[_-]?required|in[_-]?progress)(?:[^a-z0-9_]|$)/i

export type AgentProviderHint = 'claude' | 'codex'

export interface OscTitleEvent {
  source: 'title'
  title: string
  isWorking: boolean | null
  providerHint?: AgentProviderHint
}

function inferProviderHint(title: string): AgentProviderHint | null {
  if (title.startsWith(CLAUDE_IDLE_PREFIX) || CLAUDE_HINT_RE.test(title)) {
    return 'claude'
  }

  if (CODEX_HINT_RE.test(title)) {
    return 'codex'
  }

  return null
}

function inferWorkingState(title: string, providerHint: AgentProviderHint | null): boolean | null {
  if (title.startsWith(CLAUDE_IDLE_PREFIX)) {
    return false
  }

  const lowered = title.toLowerCase()
  if (providerHint === 'codex' || lowered.includes('codex')) {
    if (CODEX_IDLE_RE.test(lowered)) {
      return false
    }
    if (CODEX_WORKING_RE.test(lowered)) {
      return true
    }
    return null
  }

  if (providerHint === 'claude') {
    return title.trim().length > 0 ? true : null
  }

  if (CODEX_IDLE_RE.test(lowered)) {
    return false
  }

  if (CODEX_WORKING_RE.test(lowered)) {
    return true
  }

  return title.trim().length > 0 ? true : null
}

/**
 * Buffers partial OSC title sequences across PTY data chunks
 * and invokes a callback with the parsed working/idle state.
 */
export class OscTitleParser {
  private buffers: Map<string, string> = new Map()

  private storePartial(id: string, partial: string): void {
    if (partial.length > MAX_BUFFER_SIZE) {
      this.buffers.delete(id)
      return
    }
    this.buffers.set(id, partial)
  }

  /** Parse OSC title sequences from a PTY data chunk */
  parse(id: string, data: string, onTitle: (event: OscTitleEvent) => void): void {
    let buf = (this.buffers.get(id) || '') + data

    while (true) {
      const oscStart = buf.indexOf(OSC_START)
      if (oscStart === -1) {
        this.buffers.delete(id)
        return
      }

      const afterOsc = oscStart + OSC_START_LEN
      const commandEnd = buf.indexOf(COMMAND_SEPARATOR, afterOsc)
      if (commandEnd === -1) {
        this.storePartial(id, buf.slice(oscStart))
        return
      }

      const command = buf.slice(afterOsc, commandEnd)
      const payloadStart = commandEnd + 1
      const belIdx = buf.indexOf(BEL, payloadStart)
      const stIdx = buf.indexOf(ST, payloadStart)

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
        this.storePartial(id, buf.slice(oscStart))
        return
      }

      if (OSC_TITLE_COMMANDS.has(command)) {
        const title = buf.slice(payloadStart, endIdx)
        const providerHint = inferProviderHint(title)
        const event: OscTitleEvent = {
          source: 'title',
          title,
          isWorking: inferWorkingState(title, providerHint)
        }
        if (providerHint) {
          event.providerHint = providerHint
        }
        onTitle(event)
      }

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
