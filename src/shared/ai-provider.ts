export type AIProvider = 'claude' | 'codex'

export const DEFAULT_AI_PROVIDER: AIProvider = 'claude'

export function getProviderLabel(provider: AIProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude'
}

export function getProviderLaunchCommand(provider: AIProvider): string {
  return provider === 'codex' ? 'codex\r' : 'claude\r'
}

export function getProviderBinary(provider: AIProvider): string {
  return provider === 'codex' ? 'codex' : 'claude'
}

export function isAIProvider(value: unknown): value is AIProvider {
  return value === 'claude' || value === 'codex'
}
