import * as path from 'path'
import * as os from 'os'
import { isWin } from './index'

/**
 * Returns the config directory for user data.
 * - macOS/Linux: ~/.ai-orchestrator
 * - Windows: %APPDATA%/ai-orchestrator
 */
export function getConfigDir(): string {
  if (isWin) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'ai-orchestrator')
  }
  return path.join(os.homedir(), '.ai-orchestrator')
}
