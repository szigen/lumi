import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { app } from 'electron'
import type { Action } from '../../shared/action-types'
import { getConfigDir } from '../platform'

const MAX_HISTORY = 20

export class ActionStore {
  private userDir: string
  private historyDir: string
  private watchers: Map<string, fs.FSWatcher> = new Map()
  private userActions: Action[] = []
  private projectActions: Map<string, Action[]> = new Map()
  private onChange: (() => void) | null = null
  private defaultIds: Set<string> = new Set()

  constructor() {
    this.userDir = path.join(getConfigDir(), 'actions')
    this.historyDir = path.join(this.userDir, '.history')
    this.ensureDir(this.userDir)
    this.ensureDir(this.historyDir)
    this.seedDefaults()
    this.userActions = this.loadDir(this.userDir, 'user')
    this.watchDir(this.userDir, 'user')
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private seedDefaults(): void {
    const defaultsDir = path.join(app.getAppPath(), 'default-actions')
    if (!fs.existsSync(defaultsDir)) return

    const defaults = fs.readdirSync(defaultsDir).filter(
      (f) => f.endsWith('.yaml') || f.endsWith('.yml')
    )
    const defaultNames = new Set(defaults)

    // Always overwrite default action files with latest versions
    for (const file of defaults) {
      fs.copyFileSync(path.join(defaultsDir, file), path.join(this.userDir, file))
      // Track default action IDs
      try {
        const content = fs.readFileSync(path.join(defaultsDir, file), 'utf-8')
        const parsed = yaml.load(content) as Record<string, unknown>
        if (parsed?.id) this.defaultIds.add(parsed.id as string)
      } catch { /* skip */ }
    }

    // Remove deprecated defaults that no longer ship
    const deprecated = ['new-terminal.yaml', 'create-action.yaml', 'git-pull.yaml', 'install-deps.yaml', 'install-plugins.yaml']
    for (const file of deprecated) {
      if (!defaultNames.has(file)) {
        const filePath = path.join(this.userDir, file)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }
  }

  private loadDir(dir: string, scope: 'user' | 'project'): Action[] {
    if (!fs.existsSync(dir)) return []

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    const actions: Action[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        const parsed = yaml.load(content) as Record<string, unknown>
        if (parsed && parsed.id && parsed.label && parsed.steps) {
          actions.push({
            id: parsed.id as string,
            label: parsed.label as string,
            icon: (parsed.icon as string) || 'Zap',
            scope,
            claude: parsed.claude as Action['claude'],
            steps: parsed.steps as Action['steps']
          })
        }
      } catch (error) {
        console.error(`Failed to load action ${file}:`, error)
      }
    }

    return actions
  }

  private watchDir(dir: string, scope: 'user' | 'project', repoPath?: string): void {
    if (this.watchers.has(dir)) return

    try {
      const watcher = fs.watch(dir, (_event, filename) => {
        // Backup user-scope YAML files before reloading
        if (scope === 'user' && filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
          const filePath = path.join(dir, filename)
          if (fs.existsSync(filePath)) {
            this.backupAction(filePath)
          }
        }

        if (scope === 'user') {
          this.userActions = this.loadDir(dir, 'user')
        } else if (repoPath) {
          this.projectActions.set(repoPath, this.loadDir(dir, 'project'))
        }
        this.onChange?.()
      })
      this.watchers.set(dir, watcher)
    } catch {
      // Directory might not exist yet for project scope
    }
  }

  private backupAction(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = yaml.load(content) as Record<string, unknown>
      if (!parsed?.id) return

      const actionId = parsed.id as string
      const actionHistoryDir = path.join(this.historyDir, actionId)
      this.ensureDir(actionHistoryDir)

      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '')
      fs.copyFileSync(filePath, path.join(actionHistoryDir, `${timestamp}.yaml`))

      // Prune old backups beyond MAX_HISTORY
      const backups = fs.readdirSync(actionHistoryDir)
        .filter((f) => f.endsWith('.yaml'))
        .sort()
      if (backups.length > MAX_HISTORY) {
        const toDelete = backups.slice(0, backups.length - MAX_HISTORY)
        for (const file of toDelete) {
          fs.unlinkSync(path.join(actionHistoryDir, file))
        }
      }
    } catch {
      // Best-effort backup
    }
  }

  setOnChange(callback: () => void): void {
    this.onChange = callback
  }

  loadProjectActions(repoPath: string): void {
    const dir = path.join(repoPath, '.ai-orchestrator', 'actions')
    if (fs.existsSync(dir)) {
      this.projectActions.set(repoPath, this.loadDir(dir, 'project'))
      this.watchDir(dir, 'project', repoPath)
    } else {
      this.projectActions.set(repoPath, [])
    }
  }

  getActions(repoPath?: string): Action[] {
    const user = [...this.userActions]
    const project = repoPath ? (this.projectActions.get(repoPath) || []) : []

    // Project scope overrides user scope by id
    const projectIds = new Set(project.map((a) => a.id))
    const merged = user.filter((a) => !projectIds.has(a.id))
    merged.push(...project)

    return merged
  }

  deleteAction(actionId: string, scope: 'user' | 'project', repoPath?: string): boolean {
    const dir = scope === 'user' ? this.userDir : path.join(repoPath!, '.ai-orchestrator', 'actions')
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      : []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        const parsed = yaml.load(content) as Record<string, unknown>
        if (parsed?.id === actionId) {
          fs.unlinkSync(path.join(dir, file))
          return true
        }
      } catch {
        // skip
      }
    }
    return false
  }

  getUserDir(): string {
    return this.userDir
  }

  getProjectDir(repoPath: string): string {
    return path.join(repoPath, '.ai-orchestrator', 'actions')
  }

  getDefaultIds(): string[] {
    return [...this.defaultIds]
  }

  getActionHistory(actionId: string): string[] {
    const dir = path.join(this.historyDir, actionId)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .reverse()
  }

  restoreAction(actionId: string, timestamp: string): boolean {
    const backupFile = path.join(this.historyDir, actionId, timestamp)
    if (!fs.existsSync(backupFile)) return false

    // Find the active file for this action
    const files = fs.readdirSync(this.userDir).filter(
      (f) => f.endsWith('.yaml') || f.endsWith('.yml')
    )
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.userDir, file), 'utf-8')
        const parsed = yaml.load(content) as Record<string, unknown>
        if (parsed?.id === actionId) {
          fs.copyFileSync(backupFile, path.join(this.userDir, file))
          return true
        }
      } catch { /* skip */ }
    }

    // If no active file found, restore as <actionId>.yaml
    fs.copyFileSync(backupFile, path.join(this.userDir, `${actionId}.yaml`))
    return true
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }
}
