import { simpleGit, SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Repository, Commit, Branch } from '../../shared/types'

export class RepoManager {
  private projectsRoot: string

  constructor(projectsRoot: string) {
    this.projectsRoot = this.expandPath(projectsRoot)
  }

  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(1))
    }
    return p
  }

  async listRepos(): Promise<Repository[]> {
    const repos: Repository[] = []

    if (!fs.existsSync(this.projectsRoot)) {
      console.warn(`Projects root does not exist: ${this.projectsRoot}`)
      return repos
    }

    const entries = fs.readdirSync(this.projectsRoot, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(this.projectsRoot, entry.name)
      const gitPath = path.join(fullPath, '.git')
      const isGitRepo = fs.existsSync(gitPath)

      repos.push({
        name: entry.name,
        path: fullPath,
        isGitRepo
      })
    }

    return repos
  }

  async getFiles(repoPath: string): Promise<string[]> {
    const files: string[] = []
    const expandedPath = this.expandPath(repoPath)

    const readDir = (dir: string, prefix: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        if (entry.name === 'node_modules') continue

        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          files.push(relativePath + '/')
          readDir(path.join(dir, entry.name), relativePath)
        } else {
          files.push(relativePath)
        }
      }
    }

    readDir(expandedPath)
    return files.slice(0, 100) // Limit for performance
  }

  async getCommits(repoPath: string, branch?: string): Promise<Commit[]> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      const log = await git.log({
        maxCount: 50,
        ...(branch && { from: branch })
      })

      return log.all.map((commit) => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date)
      }))
    } catch (error) {
      console.error('Failed to get commits:', error)
      return []
    }
  }

  async getBranches(repoPath: string): Promise<Branch[]> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      const summary = await git.branchLocal()

      return summary.all.map((name) => ({
        name,
        isCurrent: name === summary.current
      }))
    } catch (error) {
      console.error('Failed to get branches:', error)
      return []
    }
  }

  setProjectsRoot(root: string): void {
    this.projectsRoot = this.expandPath(root)
  }
}
