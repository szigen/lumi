import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { isWin } from './index'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Returns the config directory for user data.
 * - macOS/Linux: ~/.lumi (dev: ~/.lumi-dev)
 * - Windows: %APPDATA%/lumi (dev: %APPDATA%/lumi-dev)
 *
 * Legacy migration (.pulpo, .ai-orchestrator) only runs in production
 * to avoid polluting the dev directory with stale data.
 */
export function getConfigDir(): string {
  const suffix = isDev ? '-dev' : ''

  if (isWin) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const newDir = path.join(appData, `lumi${suffix}`)

    if (!isDev) {
      const pulpoDir = path.join(appData, 'pulpo')
      if (!fs.existsSync(newDir) && fs.existsSync(pulpoDir)) {
        return pulpoDir
      }
      const legacyDir = path.join(appData, 'ai-orchestrator')
      if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
        return legacyDir
      }
    }

    return newDir
  }

  const newDir = path.join(os.homedir(), `.lumi${suffix}`)

  if (!isDev) {
    const pulpoDir = path.join(os.homedir(), '.pulpo')
    if (!fs.existsSync(newDir) && fs.existsSync(pulpoDir)) {
      return pulpoDir
    }
    const legacyDir = path.join(os.homedir(), '.ai-orchestrator')
    if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
      return legacyDir
    }
  }

  return newDir
}

/**
 * Returns the temp directory for ephemeral files (system prompts, etc.).
 * - Production: os.tmpdir()/lumi
 * - Development: os.tmpdir()/lumi-dev
 */
export function getTempDir(): string {
  const suffix = isDev ? '-dev' : ''
  return path.join(os.tmpdir(), `lumi${suffix}`)
}
