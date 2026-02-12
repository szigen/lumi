import { execSync } from 'child_process'
import { shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as pty from 'node-pty'

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
    const isMac = process.platform === 'darwin'
    const isWin = process.platform === 'win32'

    this.checks = [
      {
        id: 'shell',
        label: 'Shell',
        run: () => {
          try {
            const cmd = isWin ? 'where powershell.exe' : 'which zsh || which bash'
            const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
            return { id: 'shell', label: 'Shell', status: 'pass', message: `Found: ${result.split('\n')[0]}` }
          } catch {
            return {
              id: 'shell',
              label: 'Shell',
              status: 'fail',
              message: isWin
                ? 'PowerShell not found. Ensure it is installed and in PATH.'
                : 'No shell found. Install zsh or bash.'
            }
          }
        }
      },
      {
        id: 'node-pty',
        label: 'Terminal Engine (node-pty)',
        run: () => {
          try {
            const term = pty.spawn(isWin ? 'powershell.exe' : 'echo', isWin ? [] : ['test'], {
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
      ...(isMac
        ? [
            {
              id: 'spawn-helper',
              label: 'macOS spawn-helper',
              run: (): SystemCheckResult => {
                try {
                  const nodeModules = path.resolve(__dirname, '..', '..', 'node_modules')
                  const prebuildsDir = path.join(nodeModules, 'node-pty', 'prebuilds')
                  if (!fs.existsSync(prebuildsDir)) {
                    return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'warn', message: 'Prebuilds directory not found — node-pty may use a compiled build' }
                  }

                  const darwinDirs = fs.readdirSync(prebuildsDir).filter((d) => d.startsWith('darwin-'))
                  const helpers: string[] = []
                  for (const dir of darwinDirs) {
                    const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
                    if (fs.existsSync(helperPath)) {
                      helpers.push(helperPath)
                    }
                  }

                  if (helpers.length === 0) {
                    return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'warn', message: 'spawn-helper not found in prebuilds' }
                  }

                  const nonExecutable = helpers.filter((h) => {
                    try {
                      fs.accessSync(h, fs.constants.X_OK)
                      return false
                    } catch {
                      return true
                    }
                  })

                  if (nonExecutable.length > 0) {
                    return {
                      id: 'spawn-helper',
                      label: 'macOS spawn-helper',
                      status: 'fail',
                      message: `spawn-helper missing execute permission`,
                      fixable: true
                    }
                  }

                  return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'pass', message: 'spawn-helper is executable' }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err)
                  return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'warn', message: msg }
                }
              },
              fix: (): SystemCheckResult => {
                try {
                  const nodeModules = path.resolve(__dirname, '..', '..', 'node_modules')
                  const prebuildsDir = path.join(nodeModules, 'node-pty', 'prebuilds')
                  const darwinDirs = fs.readdirSync(prebuildsDir).filter((d) => d.startsWith('darwin-'))

                  for (const dir of darwinDirs) {
                    const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
                    if (fs.existsSync(helperPath)) {
                      fs.chmodSync(helperPath, 0o755)
                    }
                  }

                  return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'pass', message: 'Fixed: spawn-helper is now executable' }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err)
                  return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'fail', message: `Fix failed: ${msg}` }
                }
              }
            }
          ]
        : []),
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
