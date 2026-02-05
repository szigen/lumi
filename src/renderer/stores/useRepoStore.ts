import { create } from 'zustand'
import type { Repository, Commit, Branch, FileChange } from '../../shared/types'

interface RepoState {
  repos: Repository[]
  commits: Map<string, Map<string, Commit[]>>
  branches: Map<string, Branch[]>
  changes: Map<string, FileChange[]>
  selectedFiles: Map<string, Set<string>>

  loadRepos: () => Promise<void>
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
