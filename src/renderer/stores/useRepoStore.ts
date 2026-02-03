import { create } from 'zustand'
import type { Repository, Commit, Branch } from '../../shared/types'

interface RepoState {
  repos: Repository[]
  commits: Map<string, Commit[]>
  branches: Map<string, Branch[]>

  loadRepos: () => Promise<void>
  loadCommits: (repoPath: string, branch?: string) => Promise<void>
  loadBranches: (repoPath: string) => Promise<void>
  getRepoByName: (name: string) => Repository | undefined
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
        newCommits.set(repoPath, commits)
        return { commits: newCommits }
      })
    } catch (error) {
      console.error('Failed to load commits:', error)
    }
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
  }
}))
