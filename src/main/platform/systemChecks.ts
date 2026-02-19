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
}

function getNodePtyDirCandidates(): string[] {
  const appPath = app.getAppPath()
  const candidates = new Set<string>([
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-pty'),
    path.join(appPath, 'node_modules', 'node-pty'),
    path.join(process.cwd(), 'node_modules', 'node-pty')
  ])

  if (appPath.endsWith('.asar')) {
    candidates.add(path.join(path.dirname(appPath), 'app.asar.unpacked', 'node_modules', 'node-pty'))
  }

  return [...candidates]
}

function resolveNodePtyDir(): string | null {
  for (const dir of getNodePtyDirCandidates()) {
    if (fs.existsSync(dir)) {
      return dir
    }
  }
  return null
}

function getSpawnHelperPaths() {
  const nodePtyDir = resolveNodePtyDir()
  if (!nodePtyDir) {
    return { nodePtyDir: null, helperPaths: [] as string[] }
  }

  const helperPaths = new Set<string>()
  const prebuildsDir = path.join(nodePtyDir, 'prebuilds')
  const darwinDirs = fs.existsSync(prebuildsDir)
    ? fs.readdirSync(prebuildsDir).filter((d) => d.startsWith('darwin-'))
    : []

  for (const dir of darwinDirs) {
    const helperPath = path.join(prebuildsDir, dir, 'spawn-helper')
    if (fs.existsSync(helperPath)) {
      helperPaths.add(helperPath)
    }
  }

  const releaseHelperPath = path.join(nodePtyDir, 'build', 'Release', 'spawn-helper')
  if (fs.existsSync(releaseHelperPath)) {
    helperPaths.add(releaseHelperPath)
  }

  return { nodePtyDir, helperPaths: [...helperPaths] }
}

function getNonExecutableHelpers(helperPaths: string[]): string[] {
  return helperPaths.filter((helperPath) => {
    try {
      fs.accessSync(helperPath, fs.constants.X_OK)
      return false
    } catch {
      return true
    }
  })
}

function macOSSpawnHelperCheck(): PlatformCheck {
  return {
    id: 'spawn-helper',
    label: 'Terminal Permissions',
    run: (): SystemCheckResult => {
      try {
        const { nodePtyDir, helperPaths } = getSpawnHelperPaths()
        if (!nodePtyDir) {
          return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: 'node-pty install not found — may not affect operation' }
        }

        if (helperPaths.length === 0) {
          return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: 'Terminal helper not found — may not affect operation' }
        }

        const nonExecutable = getNonExecutableHelpers(helperPaths)

        if (nonExecutable.length > 0) {
          return {
            id: 'spawn-helper',
            label: 'Terminal Permissions',
            status: 'warn',
            message: 'Terminal helper is not executable. Reinstall Lumi or fix file permissions manually.'
          }
        }

        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'pass', message: 'Terminal is ready' }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { id: 'spawn-helper', label: 'Terminal Permissions', status: 'warn', message: msg }
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
