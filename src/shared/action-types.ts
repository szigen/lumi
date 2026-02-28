import type { AIProvider } from './ai-provider'

export interface ClaudeConfig {
  /** Append custom text to Claude's default system prompt */
  appendSystemPrompt?: string
  /** Replace Claude's entire system prompt */
  systemPrompt?: string
  /** Model to use: 'sonnet', 'opus', 'haiku', or full model ID */
  model?: string
  /** Tools allowed without permission prompts (e.g. "Bash(git *)", "Read") */
  allowedTools?: string[]
  /** Tools completely disabled */
  disallowedTools?: string[]
  /** Restrict available tool set (e.g. "Bash,Read,Edit" or "" for none) */
  tools?: string
  /** Permission mode: 'plan', 'bypassPermissions' etc. */
  permissionMode?: string
  /** Max agentic turns (only works with -p print mode) */
  maxTurns?: number
}

export interface CodexConfig {
  model?: string
}

export type ActionStep =
  | { type: 'write'; content: string }
  | { type: 'wait_for'; pattern: string; timeout?: number }
  | { type: 'delay'; ms: number }

export interface Action {
  id: string
  label: string
  description?: string
  icon: string
  scope: 'user' | 'project'
  provider?: AIProvider
  claude?: ClaudeConfig
  codex?: CodexConfig
  steps: ActionStep[]
  modified_at?: string
}
