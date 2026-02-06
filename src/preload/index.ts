import { contextBridge, ipcRenderer } from 'electron'
import { createIpcListener, invokeIpc } from './ipc-utils'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { SpawnResult } from '../main/terminal/types'

const api = {
  // Terminal operations
  spawnTerminal: (repoPath: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.TERMINAL_SPAWN, repoPath),
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
  onTerminalBell: (callback: (terminalId: string, repoName: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.TERMINAL_BELL, callback),
  onNotificationClick: (callback: (terminalId: string) => void) =>
    createIpcListener<[string]>(IPC_CHANNELS.NOTIFICATION_CLICK, callback),

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
  getStatus: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.GIT_STATUS, repoPath),
  commitFiles: (repoPath: string, files: string[], message: string) =>
    invokeIpc<{ success: boolean; error?: string }>(IPC_CHANNELS.GIT_COMMIT, repoPath, files, message),

  // Config operations
  getConfig: () => invokeIpc<Record<string, unknown>>(IPC_CHANNELS.CONFIG_GET),
  setConfig: (config: Record<string, unknown>) =>
    invokeIpc<boolean>(IPC_CHANNELS.CONFIG_SET, config),
  getUIState: () =>
    invokeIpc<Record<string, unknown>>(IPC_CHANNELS.UI_STATE_GET),
  setUIState: (state: Record<string, unknown>) =>
    invokeIpc<boolean>(IPC_CHANNELS.UI_STATE_SET, state),

  // Context menu operations
  deleteFile: (repoPath: string, relativePath: string) =>
    invokeIpc<void>(IPC_CHANNELS.CONTEXT_DELETE_FILE, repoPath, relativePath),
  revealInFinder: (repoPath: string, relativePath: string) =>
    invokeIpc<void>(IPC_CHANNELS.CONTEXT_REVEAL_IN_FINDER, repoPath, relativePath),

  // Action operations
  getActions: (repoPath?: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.ACTIONS_LIST, repoPath),
  executeAction: (actionId: string, repoPath: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.ACTIONS_EXECUTE, actionId, repoPath),
  deleteAction: (actionId: string, scope: 'user' | 'project', repoPath?: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.ACTIONS_DELETE, actionId, scope, repoPath),
  loadProjectActions: (repoPath: string) =>
    invokeIpc<void>(IPC_CHANNELS.ACTIONS_LOAD_PROJECT, repoPath),
  createNewAction: (repoPath: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.ACTIONS_CREATE_NEW, repoPath),
  onActionsChanged: (callback: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.ACTIONS_CHANGED, callback),

  // Dialog operations
  openFolderDialog: () => invokeIpc<string | null>(IPC_CHANNELS.DIALOG_OPEN_FOLDER),

  // Window operations
  toggleMaximize: () => invokeIpc<void>(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),

  // App lifecycle
  onConfirmQuit: (callback: (terminalCount: number) => void) =>
    createIpcListener<[number]>(IPC_CHANNELS.APP_CONFIRM_QUIT, callback),
  confirmQuit: () => {
    ipcRenderer.send(IPC_CHANNELS.APP_QUIT_CONFIRMED)
  },

  // Shortcut events from menu
  onShortcut: (callback: (action: string) => void) =>
    createIpcListener<[string]>('shortcut', callback)
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
