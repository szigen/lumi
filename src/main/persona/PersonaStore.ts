import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as yaml from 'js-yaml'
import { app } from 'electron'
import type { Persona } from '../../shared/persona-types'
import type { ClaudeConfig } from '../../shared/action-types'

export class PersonaStore {
  private userDir: string
  private watchers: Map<string, fs.FSWatcher> = new Map()
  private userPersonas: Persona[] = []
  private projectPersonas: Map<string, Persona[]> = new Map()
  private onChange: (() => void) | null = null

  constructor() {
    this.userDir = path.join(os.homedir(), '.ai-orchestrator', 'personas')
    this.ensureDir(this.userDir)
    this.seedDefaults()
    this.userPersonas = this.loadDir(this.userDir, 'user')
    this.watchDir(this.userDir, 'user')
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private seedDefaults(): void {
    const defaultsDir = path.join(app.getAppPath(), 'default-personas')
    if (!fs.existsSync(defaultsDir)) return

    const defaults = fs.readdirSync(defaultsDir).filter(
      (f) => f.endsWith('.yaml') || f.endsWith('.yml')
    )

    // Always overwrite default persona files with latest versions
    for (const file of defaults) {
      fs.copyFileSync(path.join(defaultsDir, file), path.join(this.userDir, file))
    }
  }

  private loadDir(dir: string, scope: 'user' | 'project'): Persona[] {
    if (!fs.existsSync(dir)) return []

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    const personas: Persona[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        const parsed = yaml.load(content) as Record<string, unknown>
        if (parsed && parsed.id && parsed.label && parsed.claude) {
          personas.push({
            id: parsed.id as string,
            label: parsed.label as string,
            scope,
            claude: parsed.claude as ClaudeConfig
          })
        }
      } catch (error) {
        console.error(`Failed to load persona ${file}:`, error)
      }
    }

    return personas
  }

  private watchDir(dir: string, scope: 'user' | 'project', repoPath?: string): void {
    if (this.watchers.has(dir)) return

    try {
      const watcher = fs.watch(dir, () => {
        if (scope === 'user') {
          this.userPersonas = this.loadDir(dir, 'user')
        } else if (repoPath) {
          this.projectPersonas.set(repoPath, this.loadDir(dir, 'project'))
        }
        this.onChange?.()
      })
      this.watchers.set(dir, watcher)
    } catch {
      // Directory might not exist yet for project scope
    }
  }

  setOnChange(callback: () => void): void {
    this.onChange = callback
  }

  loadProjectPersonas(repoPath: string): void {
    const dir = path.join(repoPath, '.ai-orchestrator', 'personas')
    if (fs.existsSync(dir)) {
      this.projectPersonas.set(repoPath, this.loadDir(dir, 'project'))
      this.watchDir(dir, 'project', repoPath)
    } else {
      this.projectPersonas.set(repoPath, [])
    }
  }

  getPersonas(repoPath?: string): Persona[] {
    const user = [...this.userPersonas]
    const project = repoPath ? (this.projectPersonas.get(repoPath) || []) : []

    // Project scope overrides user scope by id
    const projectIds = new Set(project.map((p) => p.id))
    const merged = user.filter((p) => !projectIds.has(p.id))
    merged.push(...project)

    return merged
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }
}
