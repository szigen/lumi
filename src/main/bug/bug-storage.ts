import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash } from 'crypto'
import type { Bug, Fix } from '../../shared/bug-types'
import { v4 as uuidv4 } from 'uuid'

export class BugStorage {
  private baseDir: string

  constructor() {
    this.baseDir = path.join(os.homedir(), '.ai-orchestrator', 'bugs')
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  private hashPath(repoPath: string): string {
    return createHash('sha256').update(repoPath).digest('hex').slice(0, 16)
  }

  private bugsFile(repoPath: string): string {
    const dir = path.join(this.baseDir, this.hashPath(repoPath))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return path.join(dir, 'bugs.json')
  }

  list(repoPath: string): Bug[] {
    const file = this.bugsFile(repoPath)
    if (!fs.existsSync(file)) return []
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      return []
    }
  }

  private save(repoPath: string, bugs: Bug[]): void {
    fs.writeFileSync(this.bugsFile(repoPath), JSON.stringify(bugs, null, 2))
  }

  create(repoPath: string, title: string, description: string): Bug {
    const bugs = this.list(repoPath)
    const bug: Bug = {
      id: uuidv4(),
      title,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      fixes: []
    }
    bugs.push(bug)
    this.save(repoPath, bugs)
    return bug
  }

  update(repoPath: string, bugId: string, updates: Partial<Pick<Bug, 'title' | 'description' | 'status'>>): Bug | null {
    const bugs = this.list(repoPath)
    const idx = bugs.findIndex(b => b.id === bugId)
    if (idx === -1) return null
    Object.assign(bugs[idx], updates)
    if (updates.status === 'resolved') {
      bugs[idx].resolvedAt = new Date().toISOString()
    }
    this.save(repoPath, bugs)
    return bugs[idx]
  }

  delete(repoPath: string, bugId: string): boolean {
    const bugs = this.list(repoPath)
    const filtered = bugs.filter(b => b.id !== bugId)
    if (filtered.length === bugs.length) return false
    this.save(repoPath, filtered)
    return true
  }

  addFix(repoPath: string, bugId: string, fix: Omit<Fix, 'id'>): Fix | null {
    const bugs = this.list(repoPath)
    const bug = bugs.find(b => b.id === bugId)
    if (!bug) return null
    const newFix: Fix = { ...fix, id: uuidv4() }
    bug.fixes.push(newFix)
    this.save(repoPath, bugs)
    return newFix
  }

  updateFix(repoPath: string, bugId: string, fixId: string, updates: Partial<Pick<Fix, 'status' | 'failedNote' | 'appliedAt'>>): Fix | null {
    const bugs = this.list(repoPath)
    const bug = bugs.find(b => b.id === bugId)
    if (!bug) return null
    const fix = bug.fixes.find(f => f.id === fixId)
    if (!fix) return null
    Object.assign(fix, updates)
    this.save(repoPath, bugs)
    return fix
  }
}
