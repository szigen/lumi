import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'
import { isMac, isWin } from './index'
import type { SystemCheckResult } from '../system/SystemChecker'

interface PlatformCheck {
  id: string
  label: string
  run: () => SystemCheckResult
  fix?: () => SystemCheckResult
}

function getSpawnHelperPaths() {
  const appPath = app.getAppPath()
  const prebuildsDir = path.join(appPath, 'node_modules', 'node-pty', 'prebuilds')
  const darwinDirs = fs.existsSync(prebuildsDir)
    ? fs.readdirSync(prebuildsDir).filter((d) => d.startsWith('darwin-'))
    : []
  return { prebuildsDir, darwinDirs }
}

export function autoFixSpawnHelper(): void {
  if (!isMac) return
  try {
    const { prebuildsDir, darwinDirs } = getSpawnHelperPaths()
    for (const dir of darwinDirs) {
      const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
      if (fs.existsSync(helperPath)) {
        try {
          fs.accessSync(helperPath, fs.constants.X_OK)
        } catch {
          fs.chmodSync(helperPath, 0o755)
        }
      }
    }
  } catch (err) {
    console.warn('Auto-fix spawn-helper failed:', err)
  }
}

function macOSSpawnHelperCheck(): PlatformCheck {
  return {
    id: 'spawn-helper',
    label: 'Terminal Permissions',
    run: (): SystemCheckResult => {
      try {
        const { prebuildsDir, darwinDirs } = getSpawnHelperPaths()
        if (!fs.existsSync(prebuildsDir)) {
          return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: 'Terminal prebuild not found — may not affect operation' }
        }

        const helpers: string[] = []
        for (const dir of darwinDirs) {
          const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
          if (fs.existsSync(helperPath)) {
            helpers.push(helperPath)
          }
        }

        if (helpers.length === 0) {
          return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: 'Terminal helper not found — may not affect operation' }
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
            label: 'Terminal Permissions',
            status: 'fail',
            message: 'Terminal needs a quick permission fix to work',
            fixable: true
          }
        }

        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'pass', message: 'Terminal is ready' }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: msg }
      }
    },
    fix: (): SystemCheckResult => {
      try {
        const { prebuildsDir, darwinDirs } = getSpawnHelperPaths()

        for (const dir of darwinDirs) {
          const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
          if (fs.existsSync(helperPath)) {
            fs.chmodSync(helperPath, 0o755)
          }
        }

        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'pass', message: 'Fixed! Terminal is ready' }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'fail', message: `Could not fix automatically: ${msg}` }
      }
    }
  }
}

function windowsConPTYCheck(): PlatformCheck {
  return {
    id: 'conpty',
    label: 'Windows ConPTY',
    run: (): SystemCheckResult => {
      try {
        const version = os.release() // e.g., "10.0.17763"
        const parts = version.split('.')
        const build = parseInt(parts[2] || '0', 10)

        if (build < 17763) {
          return {
            id: 'conpty',
            label: 'Windows ConPTY',
            status: 'fail',
            message: `Windows build ${build} detected. ConPTY requires Windows 10 1809+ (build 17763+).`
          }
        }

        return {
          id: 'conpty',
          label: 'Windows ConPTY',
          status: 'pass',
          message: `Windows build ${build} — ConPTY supported`
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { id: 'conpty', label: 'Windows ConPTY', status: 'warn', message: msg }
      }
    }
  }
}

export function getPlatformChecks(): PlatformCheck[] {
  const checks: PlatformCheck[] = []

  if (isMac) {
    checks.push(macOSSpawnHelperCheck())
  }

  if (isWin) {
    checks.push(windowsConPTYCheck())
  }

  return checks
}
