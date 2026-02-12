export interface SpawnResult {
  id: string
  name: string
  isNew: boolean
}

/** Single source of truth for Claude terminal status */
export type ClaudeStatus = 'idle' | 'working' | 'waiting-unseen' | 'waiting-focused' | 'waiting-seen' | 'error'

export interface Terminal {
  id: string
  name: string
  repoPath: string
  status: ClaudeStatus
  task?: string
  isNew?: boolean
  createdAt: Date
}

/** Serializable terminal info sent from main → renderer via IPC */
export interface TerminalInfo {
  id: string
  name: string
  repoPath: string
  createdAt: string
  task?: string
  status: Terminal['status']
}

export interface Repository {
  name: string
  path: string
  isGitRepo: boolean
  source: string
}

export interface AdditionalPath {
  id: string
  path: string
  type: 'root' | 'repo'
  label?: string
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
  additionalPaths: AdditionalPath[]
  maxTerminals: number
  theme: 'dark' | 'light'
  terminalFontSize: number
}

export interface UIState {
  openTabs: string[]
  activeTab: string | null
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  gridColumns: number | 'auto'
  activeView: 'terminals' | 'bugs'
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

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
}

export interface FileChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
}
