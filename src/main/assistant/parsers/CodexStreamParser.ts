import { normalizeCodexToolName } from './common'

export interface CodexStreamCallbacks {
  onPreviewDelta: (text: string) => void
  onResponseSnapshot: (snapshot: string) => void
  onToolStart: (tool: string) => void
  onToolEnd: () => void
  onError: (message: string) => void
  onAgentMessage: (message: string) => void
}

export interface CodexStreamParser {
  processLine: (line: string) => void
  close: () => void
}

export function createCodexStreamParser(callbacks: CodexStreamCallbacks): CodexStreamParser {
  let currentToolName: string | null = null

  const maybeEmitToolActivity = (event: Record<string, unknown>) => {
    const eventType = typeof event.type === 'string' ? event.type : ''
    const rawTool = event.tool || event.name
    const tool = normalizeCodexToolName(rawTool)
    if (!eventType.includes('tool')) return
    if (eventType.includes('start') && tool) {
      currentToolName = tool
      callbacks.onToolStart(tool)
      return
    }
    if ((eventType.includes('end') || eventType.includes('stop')) && currentToolName) {
      callbacks.onToolEnd()
      currentToolName = null
    }
  }

  const processLine = (line: string) => {
    try {
      const event = JSON.parse(line) as Record<string, unknown>
      maybeEmitToolActivity(event)

      const eventType = typeof event.type === 'string' ? event.type : ''

      if (eventType === 'error') {
        if (typeof event.message === 'string' && !/^Reconnecting\.\.\./i.test(event.message)) {
          callbacks.onError(event.message)
        }
        return
      }

      if (eventType === 'turn.failed') {
        if (event.error && typeof event.error === 'object') {
          const turnError = event.error as Record<string, unknown>
          if (typeof turnError.message === 'string') {
            callbacks.onError(turnError.message)
          }
        }
        return
      }

      const item = event.item && typeof event.item === 'object'
        ? event.item as Record<string, unknown>
        : null

      if (item && (eventType === 'item.started' || eventType === 'item.completed')) {
        const itemType = typeof item.type === 'string' ? item.type : ''
        const itemTool = normalizeCodexToolName(item.tool || item.name || itemType)

        if (eventType === 'item.started') {
          if (itemTool && itemType !== 'agent_message' && itemType !== 'reasoning') {
            currentToolName = itemTool
            callbacks.onToolStart(itemTool)
          }
          return
        }

        if (itemType === 'reasoning') {
          if (typeof item.text === 'string' && item.text.length > 0) {
            callbacks.onPreviewDelta(item.text.endsWith('\n') ? item.text : `${item.text}\n`)
          }
          return
        }

        if (itemType === 'agent_message') {
          if (typeof item.text === 'string' && item.text.length > 0) {
            callbacks.onAgentMessage(item.text)
            callbacks.onResponseSnapshot(item.text)
          }
          return
        }

        if (currentToolName) {
          callbacks.onToolEnd()
          currentToolName = null
        } else if (itemTool) {
          callbacks.onToolStart(itemTool)
          callbacks.onToolEnd()
        }
        return
      }

      const textCandidates: string[] = []
      const pushText = (value: unknown) => {
        if (typeof value === 'string' && value.length > 0) {
          textCandidates.push(value)
        }
      }

      pushText(event.text)
      pushText(event.delta)
      if (typeof event.message === 'string') pushText(event.message)

      if (event.message && typeof event.message === 'object') {
        const msg = event.message as Record<string, unknown>
        pushText(msg.text)
        pushText(msg.delta)
        if (Array.isArray(msg.content)) {
          for (const chunk of msg.content) {
            if (chunk && typeof chunk === 'object') {
              const content = chunk as Record<string, unknown>
              pushText(content.text)
              pushText(content.delta)
            } else if (typeof chunk === 'string') {
              pushText(chunk)
            }
          }
        }
      }

      for (const candidate of textCandidates) {
        callbacks.onResponseSnapshot(candidate)
      }
    } catch {
      // Codex can print warnings in plain text; ignore unknown lines
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
