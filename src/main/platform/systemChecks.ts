import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { isMac, isWin } from './index'
import type { SystemCheckResult } from '../system/SystemChecker'

interface PlatformCheck {
  id: string
  label: string
  run: () => SystemCheckResult
  fix?: () => SystemCheckResult
}

function getSpawnHelperPaths() {
  const nodeModules = path.resolve(__dirname, '..', '..', 'node_modules')
  const prebuildsDir = path.join(nodeModules, 'node-pty', 'prebuilds')
  const darwinDirs = fs.existsSync(prebuildsDir)
    ? fs.readdirSync(prebuildsDir).filter((d) => d.startsWith('darwin-'))
    : []
  return { prebuildsDir, darwinDirs }
}

function macOSSpawnHelperCheck(): PlatformCheck {
  return {
    id: 'spawn-helper',
    label: 'macOS spawn-helper',
    run: (): SystemCheckResult => {
      try {
        const { prebuildsDir, darwinDirs } = getSpawnHelperPaths()
        if (!fs.existsSync(prebuildsDir)) {
          return { id: 'spawn-helper', label: 'macOS spawn-helper', status: 'warn', message: 'Prebuilds directory not found — node-pty may use a compiled build' }
        }

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
            message: 'spawn-helper missing execute permission',
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
        const { prebuildsDir, darwinDirs } = getSpawnHelperPaths()

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
