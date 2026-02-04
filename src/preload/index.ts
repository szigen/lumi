import { contextBridge } from 'electron'
import { createIpcListener, invokeIpc } from './ipc-utils'
import { IPC_CHANNELS } from '../shared/ipc-channels'

const api = {
  // Terminal operations
  spawnTerminal: (repoPath: string) =>
    invokeIpc<string | null>(IPC_CHANNELS.TERMINAL_SPAWN, repoPath),
  writeTerminal: (terminalId: string, data: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_WRITE, terminalId, data),
  killTerminal: (terminalId: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_KILL, terminalId),
  resizeTerminal: (terminalId: string, cols: number, rows: number) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_RESIZE, terminalId, cols, rows),

  // Terminal event listeners with auto-cleanup
  onTerminalOutput: (callback: (terminalId: string, data: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.TERMINAL_OUTPUT, callback),
  onTerminalExit: (callback: (terminalId: string, code: number) => void) =>
    createIpcListener<[string, number]>(IPC_CHANNELS.TERMINAL_EXIT, callback),

  // Repository operations
  getRepos: () => invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_LIST),
  getRepoFiles: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_FILES, repoPath),
  getFileTree: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_FILE_TREE, repoPath),

  // Git operations
  getCommits: (repoPath: string, branch?: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.GIT_COMMITS, repoPath, branch),
  getBranches: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.GIT_BRANCHES, repoPath),

  // Config operations
  getConfig: () => invokeIpc<Record<string, unknown>>(IPC_CHANNELS.CONFIG_GET),
  setConfig: (config: Record<string, unknown>) =>
    invokeIpc<boolean>(IPC_CHANNELS.CONFIG_SET, config),
  getUIState: () =>
    invokeIpc<Record<string, unknown>>(IPC_CHANNELS.UI_STATE_GET),
  setUIState: (state: Record<string, unknown>) =>
    invokeIpc<boolean>(IPC_CHANNELS.UI_STATE_SET, state),

  // Window operations
  toggleMaximize: () => invokeIpc<void>(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),

  // Shortcut events from menu
  onShortcut: (callback: (action: string) => void) =>
    createIpcListener<[string]>('shortcut', callback)
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
