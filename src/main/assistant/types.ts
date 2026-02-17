import type { AIProvider } from '../../shared/ai-provider'

export interface AssistantStreamActivity {
  type: 'tool_start' | 'tool_end'
  tool?: string
}

export interface AskAssistantParams {
  repoPath: string
  bugId: string
  prompt: string
}

export interface AskAssistantResult {
  started: boolean
  error?: string
}

export interface AssistantStreamCallbacks {
  emitDelta: (bugId: string, text: string) => void
  emitDone: (bugId: string, fullText: string | null, error?: string) => void
  emitActivity: (bugId: string, activity: AssistantStreamActivity) => void
}

export interface AssistantOrchestratorOptions extends AssistantStreamCallbacks {
  getProvider: () => AIProvider
  maxConcurrentProcesses?: number
  timeoutMs?: number
  maxBufferSize?: number
}
