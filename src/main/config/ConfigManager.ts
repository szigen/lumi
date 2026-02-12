import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Config, UIState, WorkLog } from '../../shared/types'
import { DEFAULT_CONFIG, DEFAULT_UI_STATE } from '../../shared/constants'

export class ConfigManager {
  private configDir: string
  private configPath: string
  private uiStatePath: string
  private workLogsDir: string
  private codenamesPath: string

  constructor() {
    this.configDir = path.join(os.homedir(), '.ai-orchestrator')
    this.configPath = path.join(this.configDir, 'config.json')
    this.uiStatePath = path.join(this.configDir, 'ui-state.json')
    this.workLogsDir = path.join(this.configDir, 'work-logs')
    this.codenamesPath = path.join(this.configDir, 'discovered-codenames.json')
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true })
    }
    if (!fs.existsSync(this.workLogsDir)) {
      fs.mkdirSync(this.workLogsDir, { recursive: true })
    }
  }

  getConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        const parsed = JSON.parse(data)
        // Migration: ensure additionalPaths exists
        if (!Array.isArray(parsed.additionalPaths)) {
          parsed.additionalPaths = []
        }
        return { ...DEFAULT_CONFIG, ...parsed }
      }
    } catch (error) {
      console.error('Failed to read config:', error)
    }
    return { ...DEFAULT_CONFIG }
  }

  isFirstRun(): boolean {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        const config = JSON.parse(data)
        return !config.projectsRoot
      }
    } catch {
      // If config can't be read, treat as first run
    }
    return true
  }

  setConfig(config: Partial<Config>): void {
    const current = this.getConfig()
    const updated = { ...current, ...config }
    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2))
  }

  getUIState(): UIState {
    try {
      if (fs.existsSync(this.uiStatePath)) {
        const data = fs.readFileSync(this.uiStatePath, 'utf-8')
        return { ...DEFAULT_UI_STATE, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('Failed to read UI state:', error)
    }
    return DEFAULT_UI_STATE
  }

  setUIState(state: Partial<UIState>): void {
    const current = this.getUIState()
    const updated = { ...current, ...state }
    fs.writeFileSync(this.uiStatePath, JSON.stringify(updated, null, 2))
  }

  saveWorkLog(log: WorkLog): void {
    const date = new Date().toISOString().split('T')[0]
    const dayDir = path.join(this.workLogsDir, date)

    if (!fs.existsSync(dayDir)) {
      fs.mkdirSync(dayDir, { recursive: true })
    }

    const filename = `${log.repo}_${log.id}.json`
    const filepath = path.join(dayDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(log, null, 2))
  }

  getWorkLogs(date?: string): WorkLog[] {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const dayDir = path.join(this.workLogsDir, targetDate)

    if (!fs.existsSync(dayDir)) {
      return []
    }

    const files = fs.readdirSync(dayDir).filter((f) => f.endsWith('.json'))
    const logs: WorkLog[] = []

    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(dayDir, file), 'utf-8')
        logs.push(JSON.parse(data))
      } catch (error) {
        console.error(`Failed to read work log ${file}:`, error)
      }
    }

    return logs
  }

  getDiscoveredCodenames(): string[] {
    try {
      if (fs.existsSync(this.codenamesPath)) {
        const data = fs.readFileSync(this.codenamesPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to read discovered codenames:', error)
    }
    return []
  }

  addDiscoveredCodename(name: string): boolean {
    const codenames = this.getDiscoveredCodenames()
    if (codenames.includes(name)) {
      return false
    }
    codenames.push(name)
    fs.writeFileSync(this.codenamesPath, JSON.stringify(codenames))
    return true
  }
}
