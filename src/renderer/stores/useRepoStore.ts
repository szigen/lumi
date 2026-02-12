import { create } from 'zustand'
import type { Repository, Commit, Branch, FileChange, AdditionalPath, Config } from '../../shared/types'

export interface PathGroupInfo {
  path: string
  type: 'root' | 'repo'
  label?: string
}

export interface RepoGroup {
  key: string
  label: string
  repos: Repository[]
}

export function groupReposBySource(repos: Repository[], additionalPaths: PathGroupInfo[]): RepoGroup[] {
  const groupMap = new Map<string, Repository[]>()

  for (const repo of repos) {
    const key = repo.source
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(repo)
  }

  const groups: RepoGroup[] = []

  // projectsRoot first
  const rootRepos = groupMap.get('projectsRoot')
  if (rootRepos && rootRepos.length > 0) {
    groups.push({ key: 'projectsRoot', label: 'Projects Root', repos: rootRepos })
  }

  // Additional root paths in order
  const standaloneRepos: Repository[] = []
  for (const ap of additionalPaths) {
    if (ap.type === 'root') {
      const apRepos = groupMap.get(ap.path)
      if (apRepos && apRepos.length > 0) {
        const label = ap.label || ap.path.split('/').pop() || ap.path
        groups.push({ key: ap.path, label, repos: apRepos })
      } else {
        const label = ap.label || ap.path.split('/').pop() || ap.path
        groups.push({ key: ap.path, label, repos: [] })
      }
    } else {
      // Collect standalone repos
      const apRepos = groupMap.get(ap.path)
      if (apRepos) standaloneRepos.push(...apRepos)
    }
  }

  // Standalone repos group
  if (standaloneRepos.length > 0) {
    groups.push({ key: '__standalone__', label: 'Standalone Repos', repos: standaloneRepos })
  }

  return groups
}

interface RepoState {
  repos: Repository[]
  additionalPaths: AdditionalPath[]
  commits: Map<string, Map<string, Commit[]>>
  branches: Map<string, Branch[]>
  changes: Map<string, FileChange[]>
  selectedFiles: Map<string, Set<string>>

  loadRepos: () => Promise<void>
  loadAdditionalPaths: () => Promise<void>
  loadCommits: (repoPath: string, branch: string) => Promise<void>
  loadAllBranchCommits: (repoPath: string) => Promise<void>
  loadBranches: (repoPath: string) => Promise<void>
  loadChanges: (repoPath: string) => Promise<void>
  toggleFile: (repoPath: string, filePath: string) => void
  selectAll: (repoPath: string) => void
  deselectAll: (repoPath: string) => void
  commitChanges: (repoPath: string, message: string) => Promise<{ success: boolean; error?: string }>
  getRepoByName: (name: string) => Repository | undefined
  getCommitsForBranch: (repoPath: string, branchName: string) => Commit[]
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  additionalPaths: [],
  commits: new Map(),
  branches: new Map(),
  changes: new Map(),
  selectedFiles: new Map(),

  loadRepos: async () => {
    try {
      const repos = await window.api.getRepos()
      set({ repos })
    } catch (error) {
      console.error('Failed to load repos:', error)
    }
  },

  loadAdditionalPaths: async () => {
    try {
      const config = await window.api.getConfig() as Config
      set({ additionalPaths: config.additionalPaths || [] })
    } catch (error) {
      console.error('Failed to load additional paths:', error)
    }
  },

  loadCommits: async (repoPath, branch) => {
    try {
      const commits = await window.api.getCommits(repoPath, branch)
      set((state) => {
        const newCommits = new Map(state.commits)
        const repoCommits = newCommits.get(repoPath) || new Map()
        repoCommits.set(branch, commits)
        newCommits.set(repoPath, repoCommits)
        return { commits: newCommits }
      })
    } catch (error) {
      console.error('Failed to load commits:', error)
    }
  },

  loadAllBranchCommits: async (repoPath) => {
    const branches = get().branches.get(repoPath) || []
    await Promise.all(
      branches.map(b => get().loadCommits(repoPath, b.name))
    )
  },

  loadBranches: async (repoPath) => {
    try {
      const branches = await window.api.getBranches(repoPath)
      set((state) => {
        const newBranches = new Map(state.branches)
        newBranches.set(repoPath, branches)
        return { branches: newBranches }
      })
    } catch (error) {
      console.error('Failed to load branches:', error)
    }
  },

  loadChanges: async (repoPath) => {
    try {
      const changes = await window.api.getStatus(repoPath) as FileChange[]
      set((state) => {
        const newChanges = new Map(state.changes)
        newChanges.set(repoPath, changes)
        const newSelected = new Map(state.selectedFiles)
        newSelected.set(repoPath, new Set(changes.map(c => c.path)))
        return { changes: newChanges, selectedFiles: newSelected }
      })
    } catch (error) {
      console.error('Failed to load changes:', error)
    }
  },

  toggleFile: (repoPath, filePath) => {
    set((state) => {
      const newSelected = new Map(state.selectedFiles)
      const repoSelected = new Set(newSelected.get(repoPath) || [])
      if (repoSelected.has(filePath)) {
        repoSelected.delete(filePath)
      } else {
        repoSelected.add(filePath)
      }
      newSelected.set(repoPath, repoSelected)
      return { selectedFiles: newSelected }
    })
  },

  selectAll: (repoPath) => {
    set((state) => {
      const changes = state.changes.get(repoPath) || []
      const newSelected = new Map(state.selectedFiles)
      newSelected.set(repoPath, new Set(changes.map(c => c.path)))
      return { selectedFiles: newSelected }
    })
  },

  deselectAll: (repoPath) => {
    set((state) => {
      const newSelected = new Map(state.selectedFiles)
      newSelected.set(repoPath, new Set())
      return { selectedFiles: newSelected }
    })
  },

  commitChanges: async (repoPath, message) => {
    const selected = get().selectedFiles.get(repoPath)
    if (!selected || selected.size === 0) {
      return { success: false, error: 'No files selected' }
    }

    const result = await window.api.commitFiles(repoPath, Array.from(selected), message) as { success: boolean; error?: string }

    if (result.success) {
      await get().loadChanges(repoPath)
      await get().loadAllBranchCommits(repoPath)
    }

    return result
  },

  getRepoByName: (name) => {
    return get().repos.find((r) => r.name === name)
  },

  getCommitsForBranch: (repoPath, branchName) => {
    const repoCommits = get().commits.get(repoPath)
    return repoCommits?.get(branchName) || []
  }
}))
