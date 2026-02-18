import { execSync } from 'child_process'
import { isWin } from './index'

const SHELL_CHAINS: Record<string, string[]> = {
  darwin: ['zsh', 'bash', 'sh'],
  win32: ['powershell.exe', 'cmd.exe'],
  linux: ['bash', 'zsh', 'sh']
}

function whichCommand(shell: string): string {
  return isWin ? `where ${shell}` : `which ${shell}`
}

function findShell(candidates: string[]): string | null {
  for (const shell of candidates) {
    try {
      execSync(whichCommand(shell), { encoding: 'utf-8', timeout: 5000 })
      return shell
    } catch {
      continue
    }
  }
  return null
}

let cachedShell: string | null = null

export function getDefaultShell(): string {
  if (cachedShell) return cachedShell

  const candidates = SHELL_CHAINS[process.platform] || SHELL_CHAINS.linux
  const shell = findShell(candidates)

  if (!shell) {
    throw new Error(
      `No shell found. Tried: ${candidates.join(', ')}. ` +
      (isWin ? 'Ensure PowerShell is installed and in PATH.' : 'Install bash or zsh.')
    )
  }

  cachedShell = shell
  return shell
}

export function getShellArgs(): string[] {
  // Login shell flag ensures user's profile is loaded (full PATH, aliases, etc.)
  return isWin ? [] : ['-l']
}
