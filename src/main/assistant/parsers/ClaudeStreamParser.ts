import { deltaFromSnapshot } from './common'

export interface ClaudeStreamCallbacks {
  onResponseDelta: (text: string) => void
  onResponseSnapshot: (snapshot: string) => void
  onToolStart: (tool: string) => void
  onToolEnd: () => void
}

export interface ClaudeStreamParser {
  processLine: (line: string) => void
  close: () => void
}

export function createClaudeStreamParser(callbacks: ClaudeStreamCallbacks): ClaudeStreamParser {
  let currentToolName: string | null = null
  let responseAccumulated = ''

  const processLine = (line: string) => {
    try {
      const event = JSON.parse(line) as Record<string, unknown>

      if (event.type === 'stream_event' && event.event && typeof event.event === 'object') {
        const streamEvent = event.event as Record<string, unknown>

        if (streamEvent.type === 'content_block_start' && streamEvent.content_block && typeof streamEvent.content_block === 'object') {
          const block = streamEvent.content_block as Record<string, unknown>
          if (block.type === 'tool_use' && typeof block.name === 'string') {
            currentToolName = block.name
            callbacks.onToolStart(block.name)
          }
        } else if (streamEvent.type === 'content_block_delta' && streamEvent.delta && typeof streamEvent.delta === 'object') {
          const delta = streamEvent.delta as Record<string, unknown>
          if (delta.type === 'text_delta' && typeof delta.text === 'string') {
            responseAccumulated += delta.text
            callbacks.onResponseDelta(delta.text)
          }
        } else if (streamEvent.type === 'content_block_stop') {
          if (currentToolName) {
            callbacks.onToolEnd()
            currentToolName = null
          }
        }
        return
      }

      if (event.type === 'assistant' && event.message && typeof event.message === 'object') {
        const message = event.message as Record<string, unknown>
        if (Array.isArray(message.content)) {
          for (const block of message.content) {
            if (!block || typeof block !== 'object') continue
            const typedBlock = block as Record<string, unknown>
            if (typedBlock.type !== 'text' || typeof typedBlock.text !== 'string') continue
            const delta = deltaFromSnapshot(typedBlock.text, responseAccumulated)
            if (!delta) continue
            responseAccumulated += delta
            callbacks.onResponseSnapshot(typedBlock.text)
          }
        }
      }
    } catch {
      // ignore non-json lines
    }
  }

  const close = () => {
    if (currentToolName) {
      callbacks.onToolEnd()
      currentToolName = null
    }
  }

  return { processLine, close }
}
