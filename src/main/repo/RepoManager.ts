import { simpleGit, SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import ignore, { Ignore } from 'ignore'
import type { Repository, Commit, Branch, FileTreeNode, FileChange } from '../../shared/types'

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
      // Default branch'i bul (main veya master)
      const branches = await git.branchLocal()
      const defaultBranch = branches.all.includes('main')
        ? 'main'
        : branches.all.includes('master')
          ? 'master'
          : null

      const options: string[] = ['--max-count=50']

      if (branch && defaultBranch && branch !== defaultBranch) {
        // Branch-specific: main'de olmayan commit'ler
        options.push(`${defaultBranch}..${branch}`)
      } else if (branch) {
        // Main/master veya default branch yoksa: tüm commit'ler
        options.push(branch)
      }

      const log = await git.log(options)

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

  async getStatus(repoPath: string): Promise<FileChange[]> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      const status = await git.status()
      const changes: FileChange[] = []

      for (const file of status.modified) {
        changes.push({ path: file, status: 'modified' })
      }
      for (const file of status.not_added) {
        changes.push({ path: file, status: 'untracked' })
      }
      for (const file of status.deleted) {
        changes.push({ path: file, status: 'deleted' })
      }
      for (const file of status.created) {
        changes.push({ path: file, status: 'added' })
      }
      for (const file of status.renamed.map(r => r.to)) {
        changes.push({ path: file, status: 'renamed' })
      }

      return changes
    } catch (error) {
      console.error('Failed to get status:', error)
      return []
    }
  }

  async commit(repoPath: string, files: string[], message: string): Promise<{ success: boolean; error?: string }> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      await git.add(files)
      await git.commit(message)
      return { success: true }
    } catch (error) {
      console.error('Failed to commit:', error)
      return { success: false, error: String(error) }
    }
  }

  setProjectsRoot(root: string): void {
    this.projectsRoot = this.expandPath(root)
  }

  async getFileTree(repoPath: string): Promise<FileTreeNode[]> {
    const expandedPath = this.expandPath(repoPath)
    const ig = this.createIgnoreFilter(expandedPath)

    const buildTree = (dir: string, relativePath: string = ''): FileTreeNode[] => {
      const nodes: FileTreeNode[] = []

      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return nodes
      }

      // Sort: folders first, then files, alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      for (const entry of entries) {
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
        const fullPath = path.join(dir, entry.name)

        // Check against ignore patterns
        const checkPath = entry.isDirectory() ? `${entryRelativePath}/` : entryRelativePath
        if (ig.ignores(checkPath)) continue

        if (entry.isDirectory()) {
          const children = buildTree(fullPath, entryRelativePath)
          nodes.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'folder',
            children
          })
        } else {
          nodes.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'file'
          })
        }
      }

      return nodes
    }

    return buildTree(expandedPath)
  }

  private createIgnoreFilter(repoPath: string): Ignore {
    const ig = ignore()

    // Default excludes
    ig.add([
      '.git',
      'node_modules',
      'dist',
      'build',
      '.DS_Store',
      '*.log',
      '.env',
      '.env.*',
      'coverage',
      '.next',
      '.nuxt',
      '.cache',
      '__pycache__',
      '.pytest_cache',
      'venv',
      '.venv',
    ])

    // Read .gitignore if exists
    const gitignorePath = path.join(repoPath, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
        ig.add(gitignoreContent)
      } catch {
        // Ignore read errors
      }
    }

    return ig
  }
}
