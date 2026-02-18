import { execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

/** Well-known CLI install directories that may be missing from Electron's restricted PATH */
const KNOWN_PATH_DIRS = [
  join(homedir(), '.local', 'bin'),
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  join(homedir(), '.nvm', 'current', 'bin'),
  join(homedir(), '.volta', 'bin')
]

/**
 * Resolve the user's real PATH by spawning a login shell.
 * Electron launched from Dock/Finder inherits a minimal PATH
 * (`/usr/bin:/bin:/usr/sbin:/sbin`), so we ask the user's shell
 * for the fully-resolved value.
 */
function resolveLoginShellPath(): string | null {
  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const result = execSync(`${shell} -ilc 'echo -n "$PATH"'`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return result.trim() || null
  } catch {
    return null
  }
}

/**
 * Enrich `process.env.PATH` so that CLI tools installed in user-space
 * directories (e.g. `~/.local/bin/claude`) are discoverable by
 * `which`, `execSync`, and `spawn` throughout the app lifetime.
 *
 * Call once at startup, before any SystemChecker or PTY spawn.
 */
export function fixProcessPath(): void {
  if (process.platform === 'win32') return

  const currentPath = process.env.PATH || ''
  const parts = new Set(currentPath.split(':'))

  // Try to get the full PATH from a login shell
  const loginPath = resolveLoginShellPath()
  if (loginPath) {
    for (const dir of loginPath.split(':')) {
      if (dir) parts.add(dir)
    }
  }

  // Always ensure well-known directories are present as fallback
  for (const dir of KNOWN_PATH_DIRS) {
    if (existsSync(dir) && !parts.has(dir)) {
      parts.add(dir)
    }
  }

  process.env.PATH = [...parts].join(':')
}
