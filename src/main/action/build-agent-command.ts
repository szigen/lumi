import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Action, ClaudeConfig, CodexConfig } from '../../shared/action-types'
import type { AIProvider } from '../../shared/ai-provider'
import { getProviderBinary } from '../../shared/ai-provider'

const TEMP_DIR = path.join(os.tmpdir(), 'pulpo')

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
}

/**
 * Takes a raw write step content (e.g. `claude "do something"\r`)
 * and injects CLI flags from ClaudeConfig before the prompt argument.
 *
 * If the content does not start with `claude `, it is returned as-is
 * (shell commands like `git pull\r` are unaffected).
 */
export function buildClaudeCommand(content: string, config: ClaudeConfig): string {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('claude ')) {
    return content
  }

  const flags: string[] = []

  if (config.systemPrompt) {
    ensureTempDir()
    const spFile = path.join(TEMP_DIR, `system-prompt-${Date.now()}.txt`)
    fs.writeFileSync(spFile, config.systemPrompt, 'utf-8')
    flags.push(`--system-prompt-file '${spFile}'`)
  }

  if (config.appendSystemPrompt) {
    ensureTempDir()
    const aspFile = path.join(TEMP_DIR, `append-system-prompt-${Date.now()}.txt`)
    fs.writeFileSync(aspFile, config.appendSystemPrompt, 'utf-8')
    flags.push(`--append-system-prompt-file '${aspFile}'`)
  }

  if (config.model) {
    flags.push(`--model ${config.model}`)
  }

  if (config.allowedTools?.length) {
    const tools = config.allowedTools.map((t) => `"${t}"`).join(' ')
    flags.push(`--allowedTools ${tools}`)
  }

  if (config.disallowedTools?.length) {
    const tools = config.disallowedTools.map((t) => `"${t}"`).join(' ')
    flags.push(`--disallowedTools ${tools}`)
  }

  if (config.tools !== undefined) {
    flags.push(`--tools "${config.tools}"`)
  }

  if (config.permissionMode) {
    flags.push(`--permission-mode ${config.permissionMode}`)
  }

  if (config.maxTurns) {
    flags.push(`--max-turns ${config.maxTurns}`)
  }

  if (flags.length === 0) {
    return content
  }

  const flagStr = flags.join(' ')
  return content.replace(/^(\s*)claude /, `$1claude ${flagStr} -- `)
}

function buildCodexCommand(content: string, config?: CodexConfig): string {
  const trimmed = content.trimStart()
  if (!/^(codex)(\s|\r|$)/.test(trimmed)) {
    return content
  }
  if (!config?.model) {
    return content
  }
  if (/\s--model(\s|=)/.test(trimmed)) {
    return content
  }
  return content.replace(/^(\s*)codex(?=\s|\r|$)/, `$1codex --model ${config.model}`)
}

export function remapProviderCommand(content: string, provider: AIProvider): string {
  const binary = getProviderBinary(provider)
  return content.replace(/^(\s*)claude\b/, `$1${binary}`)
}

export function buildAgentCommand(content: string, action: Pick<Action, 'provider' | 'claude' | 'codex'>): string {
  const provider = action.provider ?? 'claude'
  const remapped = remapProviderCommand(content, provider)

  if (provider === 'claude') {
    return action.claude ? buildClaudeCommand(remapped, action.claude) : remapped
  }

  return buildCodexCommand(remapped, action.codex)
}
