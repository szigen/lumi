import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { isWin } from './index'

/**
 * Returns the config directory for user data.
 * - macOS/Linux: ~/.pulpo
 * - Windows: %APPDATA%/pulpo
 *
 * Migration: falls back to legacy ~/.ai-orchestrator (or %APPDATA%/ai-orchestrator)
 * if the new directory doesn't exist yet but the old one does.
 */
export function getConfigDir(): string {
  if (isWin) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const newDir = path.join(appData, 'pulpo')
    const legacyDir = path.join(appData, 'ai-orchestrator')
    if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
      return legacyDir
    }
    return newDir
  }

  const newDir = path.join(os.homedir(), '.pulpo')
  const legacyDir = path.join(os.homedir(), '.ai-orchestrator')
  if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
    return legacyDir
  }
  return newDir
}
