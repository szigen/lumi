import { execSync } from 'child_process'
import { accessSync, constants } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { shell } from 'electron'
import * as pty from 'node-pty'
import { isWin, getDefaultShell, getPlatformChecks } from '../platform'
import type { AIProvider } from '../../shared/ai-provider'

/** Try well-known install paths when `which` fails (e.g. Electron's restricted PATH) */
function findExecutableFallback(name: string): string | null {
  const candidates = [
    join(homedir(), '.local', 'bin', name),
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`
  ]
  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK)
      return p
    } catch {
      continue
    }
  }
  return null
}

export interface SystemCheckResult {
  id: string
  label: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn'
  message: string
  fixable?: boolean
}

export class SystemChecker {
  private getSelectedProvider: () => AIProvider
  private checks: Array<{
    id: string
    label: string
    run: () => SystemCheckResult
    fix?: () => SystemCheckResult
  }>

  constructor(getSelectedProvider: () => AIProvider) {
    this.getSelectedProvider = getSelectedProvider
    this.checks = [
      {
        id: 'shell',
        label: 'Shell',
        run: () => {
          try {
            const shell = getDefaultShell()
            return { id: 'shell', label: 'Shell', status: 'pass', message: `Found: ${shell}` }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            return { id: 'shell', label: 'Shell', status: 'fail', message: msg }
          }
        }
      },
      {
        id: 'node-pty',
        label: 'Terminal Engine (node-pty)',
        run: () => {
          try {
            const testShell = isWin ? 'powershell.exe' : 'echo'
            const testArgs = isWin ? [] : ['test']
            const term = pty.spawn(testShell, testArgs, {
              name: 'xterm-256color',
              cols: 80,
              rows: 24,
              env: process.env
            })
            term.kill()
            return { id: 'node-pty', label: 'Terminal Engine (node-pty)', status: 'pass', message: 'node-pty is working' }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            return {
              id: 'node-pty',
              label: 'Terminal Engine (node-pty)',
              status: 'fail',
              message: `node-pty failed: ${msg}. Try reinstalling with npm install.`
            }
          }
        }
      },
      ...getPlatformChecks(),
      {
        id: 'claude-cli',
        label: 'Claude CLI',
        run: () => {
          const selected = this.getSelectedProvider()
          try {
            const cmd = isWin ? 'where claude' : 'which claude'
            const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
            return { id: 'claude-cli', label: 'Claude CLI', status: 'pass', message: `Found: ${result.split('\n')[0]}` }
          } catch {
            // Fallback: check well-known install paths directly
            if (!isWin) {
              const fallback = findExecutableFallback('claude')
              if (fallback) {
                return { id: 'claude-cli', label: 'Claude CLI', status: 'pass', message: `Found: ${fallback}` }
              }
            }
            if (selected !== 'claude') {
              return {
                id: 'claude-cli',
                label: 'Claude CLI',
                status: 'warn',
                message: 'Claude CLI not found. Install it if you want to switch providers later.'
              }
            }
            return {
              id: 'claude-cli',
              label: 'Claude CLI',
              status: 'fail',
              message: 'Claude CLI not found. Install it from https://code.claude.com/docs/en/setup',
              fixable: true
            }
          }
        },
        fix: () => {
          shell.openExternal('https://code.claude.com/docs/en/setup')
          return {
            id: 'claude-cli',
            label: 'Claude CLI',
            status: 'fail',
            message: 'Opened install page in browser. Re-run checks after installing.'
          }
        }
      },
      {
        id: 'codex-cli',
        label: 'Codex CLI',
        run: () => {
          const selected = this.getSelectedProvider()
          try {
            const cmd = isWin ? 'where codex' : 'which codex'
            const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
            return { id: 'codex-cli', label: 'Codex CLI', status: 'pass', message: `Found: ${result.split('\n')[0]}` }
          } catch {
            // Fallback: check well-known install paths directly
            if (!isWin) {
              const fallback = findExecutableFallback('codex')
              if (fallback) {
                return { id: 'codex-cli', label: 'Codex CLI', status: 'pass', message: `Found: ${fallback}` }
              }
            }
            if (selected !== 'codex') {
              return {
                id: 'codex-cli',
                label: 'Codex CLI',
                status: 'warn',
                message: 'Codex CLI not found. Install it if you want to switch providers later.'
              }
            }
            return {
              id: 'codex-cli',
              label: 'Codex CLI',
              status: 'fail',
              message: 'Codex CLI not found. Install it from https://github.com/openai/codex',
              fixable: true
            }
          }
        },
        fix: () => {
          shell.openExternal('https://github.com/openai/codex')
          return {
            id: 'codex-cli',
            label: 'Codex CLI',
            status: 'fail',
            message: 'Opened install page in browser. Re-run checks after installing.'
          }
        }
      }
    ]
  }

  runAll(): SystemCheckResult[] {
    return this.checks.map((check) => check.run())
  }

  fix(checkId: string): SystemCheckResult {
    const check = this.checks.find((c) => c.id === checkId)
    if (!check) {
      return { id: checkId, label: checkId, status: 'fail', message: `Unknown check: ${checkId}` }
    }
    if (!check.fix) {
      return { id: checkId, label: check.label, status: 'fail', message: 'No fix available for this check' }
    }
    return check.fix()
  }
}
