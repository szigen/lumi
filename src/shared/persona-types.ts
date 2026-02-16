import type { AIProvider } from './ai-provider'
import type { ClaudeConfig, CodexConfig } from './action-types'

export interface Persona {
  id: string
  label: string
  scope: 'user' | 'project'
  provider?: AIProvider
  claude?: ClaudeConfig
  codex?: CodexConfig
}
