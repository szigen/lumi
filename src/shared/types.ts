export interface Terminal {
  id: string
  repoPath: string
  status: 'idle' | 'running' | 'completed' | 'error'
  task?: string
  createdAt: Date
}

export interface Repository {
  name: string
  path: string
  isGitRepo: boolean
}

export interface Commit {
  hash: string
  shortHash: string
  message: string
  author: string
  date: Date
}

export interface Branch {
  name: string
  isCurrent: boolean
}

export interface Config {
  projectsRoot: string
  maxTerminals: number
  theme: 'dark' | 'light'
}

export interface UIState {
  openTabs: string[]
  activeTab: string | null
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
}

export interface WorkLog {
  id: string
  repo: string
  task: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'error'
  output: string
}
