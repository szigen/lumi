import { create } from 'zustand'
import type { Repository, Commit, Branch } from '../../shared/types'

interface RepoState {
  repos: Repository[]
  commits: Map<string, Map<string, Commit[]>>  // Map<repoPath, Map<branchName, Commit[]>>
  branches: Map<string, Branch[]>

  loadRepos: () => Promise<void>
  loadCommits: (repoPath: string, branch: string) => Promise<void>
  loadAllBranchCommits: (repoPath: string) => Promise<void>
  loadBranches: (repoPath: string) => Promise<void>
  getRepoByName: (name: string) => Repository | undefined
  getCommitsForBranch: (repoPath: string, branchName: string) => Commit[]
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  commits: new Map(),
  branches: new Map(),

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

  getRepoByName: (name) => {
    return get().repos.find((r) => r.name === name)
  },

  getCommitsForBranch: (repoPath, branchName) => {
    const repoCommits = get().commits.get(repoPath)
    return repoCommits?.get(branchName) || []
  }
}))
