import { simpleGit, SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import ignore, { Ignore } from 'ignore'
import type { Repository, Commit, Branch, FileTreeNode, FileChange, AdditionalPath, CommitDiffFile } from '../../shared/types'

export class RepoManager {
  private projectsRoot: string
  private additionalPaths: AdditionalPath[] = []
  private watchers: Map<string, fs.FSWatcher> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private onReposChange: (() => void) | null = null
  private onFileTreeChange: ((repoPath: string) => void) | null = null

  constructor(projectsRoot: string, additionalPaths: AdditionalPath[] = []) {
    this.projectsRoot = this.expandPath(projectsRoot)
    this.additionalPaths = additionalPaths
  }

  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(1))
    }
    return p
  }

  private scanDirectory(dirPath: string, source: string, seenPaths: Set<string>): Repository[] {
    if (!dirPath || !fs.existsSync(dirPath)) return []
    const repos: Repository[] = []
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const fullPath = path.join(dirPath, entry.name)
      if (seenPaths.has(fullPath)) continue
      const isGitRepo = fs.existsSync(path.join(fullPath, '.git'))
      repos.push({ name: entry.name, path: fullPath, isGitRepo, source })
      seenPaths.add(fullPath)
    }
    return repos
  }

  async listRepos(): Promise<Repository[]> {
    const seenPaths = new Set<string>()
    const repos = [...this.scanDirectory(this.projectsRoot, 'projectsRoot', seenPaths)]

    for (const ap of this.additionalPaths) {
      const expanded = this.expandPath(ap.path)
      if (ap.type === 'root') {
        repos.push(...this.scanDirectory(expanded, ap.path, seenPaths))
      } else {
        if (seenPaths.has(expanded) || !fs.existsSync(expanded)) continue
        repos.push({
          name: path.basename(expanded),
          path: expanded,
          isGitRepo: fs.existsSync(path.join(expanded, '.git')),
          source: ap.path
        })
        seenPaths.add(expanded)
      }
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
    this.watchAllRoots()
  }

  setAdditionalPaths(paths: AdditionalPath[]): void {
    this.additionalPaths = paths
    this.watchAllRoots()
  }

  setOnReposChange(cb: () => void): void {
    this.onReposChange = cb
  }

  setOnFileTreeChange(cb: (repoPath: string) => void): void {
    this.onFileTreeChange = cb
  }

  watchProjectsRoot(): void {
    this.watchAllRoots()
  }

  private watchAllRoots(): void {
    // Close all existing root watchers (prefixed with __root__)
    for (const [key, watcher] of this.watchers.entries()) {
      if (key.startsWith('__root')) {
        watcher.close()
        this.watchers.delete(key)
      }
    }
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith('__root')) {
        clearTimeout(timer)
        this.debounceTimers.delete(key)
      }
    }

    // Watch projectsRoot
    this.watchSingleRoot('__root__', this.projectsRoot)

    // Watch additional root paths
    for (const ap of this.additionalPaths) {
      if (ap.type === 'root') {
        this.watchSingleRoot(`__root_${ap.id}`, this.expandPath(ap.path))
      }
    }
  }

  private watchSingleRoot(key: string, dirPath: string): void {
    if (!dirPath || !fs.existsSync(dirPath)) return

    try {
      const watcher = fs.watch(dirPath, () => {
        this.debounce(key, () => {
          this.onReposChange?.()
        }, 300)
      })
      watcher.on('error', (err) => {
        console.error(`Root watcher error (${key}):`, err)
      })
      this.watchers.set(key, watcher)
    } catch (error) {
      console.error(`Failed to watch root (${key}):`, error)
    }
  }

  watchRepoFileTree(repoPath: string): void {
    // Close existing watcher for this repo
    this.unwatchRepoFileTree(repoPath)

    const expandedPath = this.expandPath(repoPath)
    if (!fs.existsSync(expandedPath)) return

    try {
      const watcher = fs.watch(expandedPath, { recursive: true }, () => {
        this.debounce(repoPath, () => {
          this.onFileTreeChange?.(repoPath)
        }, 500)
      })
      watcher.on('error', (err) => {
        console.error('Repo file tree watcher error:', err)
      })
      this.watchers.set(repoPath, watcher)
    } catch (error) {
      console.error('Failed to watch repo file tree:', error)
    }
  }

  unwatchRepoFileTree(repoPath: string): void {
    const existing = this.watchers.get(repoPath)
    if (existing) {
      existing.close()
      this.watchers.delete(repoPath)
    }
    const timer = this.debounceTimers.get(repoPath)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(repoPath)
    }
  }

  async readFile(repoPath: string, filePath: string): Promise<string> {
    const expandedPath = this.expandPath(repoPath)
    const absolutePath = path.join(expandedPath, filePath)

    // Security: ensure the file is within the repo directory
    const resolved = path.resolve(absolutePath)
    const repoResolved = path.resolve(expandedPath)
    if (!resolved.startsWith(repoResolved + path.sep) && resolved !== repoResolved) {
      throw new Error('File path is outside repository')
    }

    return fs.readFileSync(resolved, 'utf-8')
  }

  async getFileDiff(repoPath: string, filePath: string): Promise<{ original: string; modified: string }> {
    const expandedPath = this.expandPath(repoPath)
    const git: SimpleGit = simpleGit(expandedPath)

    let original = ''
    try {
      original = await git.show([`HEAD:${filePath}`])
    } catch {
      // File is new (untracked), no HEAD version
    }

    const modified = fs.readFileSync(path.join(expandedPath, filePath), 'utf-8')

    return { original, modified }
  }

  async getCommitDiff(repoPath: string, commitHash: string): Promise<CommitDiffFile[]> {
    const expandedPath = this.expandPath(repoPath)
    const git: SimpleGit = simpleGit(expandedPath)

    const diffTree = await git.raw(['diff-tree', '--no-commit-id', '-r', '--name-status', commitHash])
    const files: CommitDiffFile[] = []

    for (const line of diffTree.trim().split('\n')) {
      if (!line) continue
      const [status, ...pathParts] = line.split('\t')
      const filePath = pathParts.join('\t')

      let original = ''
      let modified = ''

      try {
        if (status !== 'A') {
          original = await git.show([`${commitHash}~1:${filePath}`])
        }
      } catch {
        // Parent commit doesn't have this file
      }

      try {
        if (status !== 'D') {
          modified = await git.show([`${commitHash}:${filePath}`])
        }
      } catch {
        // Commit doesn't have this file (deleted)
      }

      files.push({
        path: filePath,
        status: status === 'M' ? 'modified' : status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'R' ? 'renamed' : status,
        original,
        modified
      })
    }

    return files
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
    this.onReposChange = null
    this.onFileTreeChange = null
  }

  private debounce(key: string, fn: () => void, delay: number): void {
    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key)
      fn()
    }, delay))
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
