import type { ClaudeConfig } from './action-types'

export interface Persona {
  id: string
  label: string
  scope: 'user' | 'project'
  claude: ClaudeConfig
}
