import * as fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import type { Bug, Fix } from '../../shared/bug-types'
import { v4 as uuidv4 } from 'uuid'
import { getConfigDir } from '../platform'

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export class BugStorage {
  private baseDir: string
  private locks = new Map<string, Promise<void>>()

  constructor() {
    this.baseDir = path.join(getConfigDir(), 'bugs')
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true })
    }
  }

  private hashPath(repoPath: string): string {
    return createHash('sha256').update(repoPath).digest('hex').slice(0, 16)
  }

  private bugsFile(repoPath: string): string {
    const dir = path.join(this.baseDir, this.hashPath(repoPath))
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return path.join(dir, 'bugs.json')
  }

  private async withLock<T>(repoPath: string, fn: () => Promise<T>): Promise<T> {
    const key = this.hashPath(repoPath)
    const prev = this.locks.get(key) ?? Promise.resolve()
    let resolve: () => void
    const next = new Promise<void>((r) => { resolve = r })
    this.locks.set(key, next)
    try {
      await prev
      return await fn()
    } finally {
      resolve!()
      if (this.locks.get(key) === next) {
        this.locks.delete(key)
      }
    }
  }

  private async readBugs(repoPath: string): Promise<Bug[]> {
    const file = this.bugsFile(repoPath)
    try {
      const data = await fs.readFile(file, 'utf-8')
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) {
        console.error('[BugStorage] Corrupted bugs file (not an array), resetting:', file)
        return []
      }
      return parsed
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      console.error('[BugStorage] Failed to read bugs file:', file, err)
      return []
    }
  }

  private async saveBugs(repoPath: string, bugs: Bug[]): Promise<void> {
    await fs.writeFile(this.bugsFile(repoPath), JSON.stringify(bugs, null, 2))
  }

  private validateTitle(title: string): string {
    const trimmed = (title ?? '').trim()
    if (!trimmed) throw new Error('Bug title is required')
    if (trimmed.length > MAX_TITLE_LENGTH) throw new Error(`Title exceeds ${MAX_TITLE_LENGTH} characters`)
    return trimmed
  }

  private validateDescription(description: string): string {
    const trimmed = (description ?? '').trim()
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) throw new Error(`Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`)
    return trimmed
  }

  async list(repoPath: string): Promise<Bug[]> {
    return this.readBugs(repoPath)
  }

  async create(repoPath: string, title: string, description: string): Promise<Bug> {
    const validTitle = this.validateTitle(title)
    const validDesc = this.validateDescription(description)
    return this.withLock(repoPath, async () => {
      const bugs = await this.readBugs(repoPath)
      const bug: Bug = {
        id: uuidv4(),
        title: validTitle,
        description: validDesc,
        status: 'open',
        createdAt: new Date().toISOString(),
        fixes: []
      }
      bugs.push(bug)
      await this.saveBugs(repoPath, bugs)
      return bug
    })
  }

  async update(repoPath: string, bugId: string, updates: Partial<Pick<Bug, 'title' | 'description' | 'status'>>): Promise<Bug | null> {
    return this.withLock(repoPath, async () => {
      const bugs = await this.readBugs(repoPath)
      const idx = bugs.findIndex(b => b.id === bugId)
      if (idx === -1) return null
      if (updates.title !== undefined) updates.title = this.validateTitle(updates.title)
      if (updates.description !== undefined) updates.description = this.validateDescription(updates.description)
      Object.assign(bugs[idx], updates)
      if (updates.status === 'resolved') {
        bugs[idx].resolvedAt = new Date().toISOString()
      }
      await this.saveBugs(repoPath, bugs)
      return bugs[idx]
    })
  }

  async delete(repoPath: string, bugId: string): Promise<boolean> {
    return this.withLock(repoPath, async () => {
      const bugs = await this.readBugs(repoPath)
      const filtered = bugs.filter(b => b.id !== bugId)
      if (filtered.length === bugs.length) return false
      await this.saveBugs(repoPath, filtered)
      return true
    })
  }

  async addFix(repoPath: string, bugId: string, fix: Omit<Fix, 'id'>): Promise<Fix | null> {
    return this.withLock(repoPath, async () => {
      const bugs = await this.readBugs(repoPath)
      const bug = bugs.find(b => b.id === bugId)
      if (!bug) return null
      const newFix: Fix = { ...fix, id: uuidv4() }
      bug.fixes.push(newFix)
      await this.saveBugs(repoPath, bugs)
      return newFix
    })
  }

  async updateFix(repoPath: string, bugId: string, fixId: string, updates: Partial<Pick<Fix, 'status' | 'failedNote' | 'appliedAt'>>): Promise<Fix | null> {
    return this.withLock(repoPath, async () => {
      const bugs = await this.readBugs(repoPath)
      const bug = bugs.find(b => b.id === bugId)
      if (!bug) return null
      const fix = bug.fixes.find(f => f.id === fixId)
      if (!fix) return null
      Object.assign(fix, updates)
      await this.saveBugs(repoPath, bugs)
      return fix
    })
  }
}
