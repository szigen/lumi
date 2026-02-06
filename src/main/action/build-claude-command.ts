import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { ClaudeConfig } from '../../shared/action-types'

const TEMP_DIR = path.join(os.tmpdir(), 'ai-orchestrator')

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
