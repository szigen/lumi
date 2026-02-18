import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { isWin } from './index'

/**
 * Returns the config directory for user data.
 * - macOS/Linux: ~/.lumi
 * - Windows: %APPDATA%/lumi
 *
 * Migration: falls back to legacy ~/.pulpo (or %APPDATA%/pulpo)
 * if the new directory doesn't exist yet but the old one does.
 *
 * Migration: falls back to legacy ~/.ai-orchestrator (or %APPDATA%/ai-orchestrator)
 * if the new directory doesn't exist yet but the old one does.
 */
export function getConfigDir(): string {
  if (isWin) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const newDir = path.join(appData, 'lumi')
    const pulpoDir = path.join(appData, 'pulpo')
    if (!fs.existsSync(newDir) && fs.existsSync(pulpoDir)) {
      return pulpoDir
    }
    const legacyDir = path.join(appData, 'ai-orchestrator')
    if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
      return legacyDir
    }
    return newDir
  }

  const newDir = path.join(os.homedir(), '.lumi')
  const pulpoDir = path.join(os.homedir(), '.pulpo')
  if (!fs.existsSync(newDir) && fs.existsSync(pulpoDir)) {
    return pulpoDir
  }
  const legacyDir = path.join(os.homedir(), '.ai-orchestrator')
  if (!fs.existsSync(newDir) && fs.existsSync(legacyDir)) {
    return legacyDir
  }
  return newDir
}
