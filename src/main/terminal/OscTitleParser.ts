const OSC_START = '\x1b]'
const OSC_START_LEN = 2
const OSC_TITLE_COMMANDS = new Set(['0', '2'])
const OSC_NOTIFICATION_COMMAND = '9'
const COMMAND_SEPARATOR = ';'
const BEL = '\x07'
const ST = '\x1b\\'
const MAX_BUFFER_SIZE = 4096

const CLAUDE_IDLE_PREFIX = '\u2733'
const CLAUDE_HINT_RE = /claude code|(?:^|[^a-z0-9_])claude(?:[^a-z0-9_]|$)/i

export type AgentProviderHint = 'claude' | 'codex'

export type OscEventType = 'title' | 'notification'

export interface OscEvent {
  source: OscEventType
  title: string
  isWorking: boolean | null
  providerHint?: AgentProviderHint
}

/** @deprecated Use OscEvent instead */
export type OscTitleEvent = OscEvent

function inferProviderHint(title: string): AgentProviderHint | null {
  if (title.startsWith(CLAUDE_IDLE_PREFIX) || CLAUDE_HINT_RE.test(title)) {
    return 'claude'
  }

  return null
}

function inferWorkingState(title: string, providerHint: AgentProviderHint | null): boolean | null {
  if (title.startsWith(CLAUDE_IDLE_PREFIX)) {
    return false
  }

  if (providerHint === 'claude') {
    return title.trim().length > 0 ? true : null
  }

  return title.trim().length > 0 ? true : null
}

/**
 * Buffers partial OSC sequences across PTY data chunks
 * and invokes callbacks for parsed title (OSC 0/2) and notification (OSC 9) events.
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

  /** Parse OSC sequences from a PTY data chunk */
  parse(id: string, data: string, onEvent: (event: OscEvent) => void): void {
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
        this.storePartial(id, buf.slice(oscStart))
        return
      }

      if (OSC_TITLE_COMMANDS.has(command)) {
        const title = buf.slice(payloadStart, endIdx)
        const providerHint = inferProviderHint(title)
        const event: OscEvent = {
          source: 'title',
          title,
          isWorking: inferWorkingState(title, providerHint)
        }
        if (providerHint) {
          event.providerHint = providerHint
        }
        onEvent(event)
      } else if (command === OSC_NOTIFICATION_COMMAND) {
        // OSC 9 = iTerm2 notification protocol — Codex emits this when a turn completes
        const payload = buf.slice(payloadStart, endIdx)
        onEvent({
          source: 'notification',
          title: payload,
          isWorking: false,
          providerHint: 'codex'
        })
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
