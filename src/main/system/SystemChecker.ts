import { execSync } from 'child_process'
import { shell } from 'electron'
import * as pty from 'node-pty'
import { isWin, getDefaultShell, getPlatformChecks } from '../platform'

export interface SystemCheckResult {
  id: string
  label: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn'
  message: string
  fixable?: boolean
}

export class SystemChecker {
  private checks: Array<{
    id: string
    label: string
    run: () => SystemCheckResult
    fix?: () => SystemCheckResult
  }>

  constructor() {
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
          try {
            const cmd = isWin ? 'where claude' : 'which claude'
            const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
            return { id: 'claude-cli', label: 'Claude CLI', status: 'pass', message: `Found: ${result.split('\n')[0]}` }
          } catch {
            return {
              id: 'claude-cli',
              label: 'Claude CLI',
              status: 'fail',
              message: 'Claude CLI not found. Install it from https://docs.anthropic.com/en/docs/claude-code',
              fixable: true
            }
          }
        },
        fix: () => {
          shell.openExternal('https://docs.anthropic.com/en/docs/claude-code')
          return {
            id: 'claude-cli',
            label: 'Claude CLI',
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
