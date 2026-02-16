import { contextBridge, ipcRenderer } from 'electron'
import { createIpcListener, invokeIpc } from './ipc-utils'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { SpawnResult } from '../main/terminal/types'
import type { TerminalSnapshot } from '../shared/types'

const api = {
  // Platform info
  platform: process.platform,

  // Terminal operations
  spawnTerminal: (repoPath: string, task?: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.TERMINAL_SPAWN, repoPath, task),
  writeTerminal: (terminalId: string, data: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_WRITE, terminalId, data),
  killTerminal: (terminalId: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_KILL, terminalId),
  resizeTerminal: (terminalId: string, cols: number, rows: number) =>
    invokeIpc<boolean>(IPC_CHANNELS.TERMINAL_RESIZE, terminalId, cols, rows),
  getTerminalSnapshots: () =>
    invokeIpc<TerminalSnapshot[]>(IPC_CHANNELS.TERMINAL_SNAPSHOT),
  getTerminalStatus: (terminalId: string) =>
    invokeIpc<string | null>(IPC_CHANNELS.TERMINAL_GET_STATUS, terminalId),

  // Terminal event listeners with auto-cleanup
  onTerminalOutput: (callback: (terminalId: string, data: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.TERMINAL_OUTPUT, callback),
  onTerminalExit: (callback: (terminalId: string, code: number) => void) =>
    createIpcListener<[string, number]>(IPC_CHANNELS.TERMINAL_EXIT, callback),
  onTerminalBell: (callback: (terminalId: string, repoName: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.TERMINAL_BELL, callback),
  onNotificationClick: (callback: (terminalId: string) => void) =>
    createIpcListener<[string]>(IPC_CHANNELS.NOTIFICATION_CLICK, callback),
  onTerminalSync: (callback: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.TERMINAL_SYNC, callback),
  onTerminalStatus: (callback: (terminalId: string, status: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.TERMINAL_STATUS, callback),
  focusTerminal: (terminalId: string | null) =>
    invokeIpc<void>(IPC_CHANNELS.TERMINAL_FOCUS, terminalId),

  // Repository operations
  getRepos: () => invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_LIST),
  getRepoFiles: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_FILES, repoPath),
  getFileTree: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.REPOS_FILE_TREE, repoPath),
  onReposChanged: (cb: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.REPOS_CHANGED, cb),
  onFileTreeChanged: (cb: (repoPath: string) => void) =>
    createIpcListener<[string]>(IPC_CHANNELS.FILE_TREE_CHANGED, cb),
  watchFileTree: (repoPath: string) =>
    invokeIpc<void>(IPC_CHANNELS.REPOS_WATCH_FILE_TREE, repoPath),
  unwatchFileTree: (repoPath: string) =>
    invokeIpc<void>(IPC_CHANNELS.REPOS_UNWATCH_FILE_TREE, repoPath),

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
  isFirstRun: () => invokeIpc<boolean>(IPC_CHANNELS.CONFIG_IS_FIRST_RUN),
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
  revealInFileManager: (repoPath: string, relativePath: string) =>
    invokeIpc<void>(IPC_CHANNELS.CONTEXT_REVEAL_IN_FILE_MANAGER, repoPath, relativePath),

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
  getActionHistory: (actionId: string) =>
    invokeIpc<string[]>(IPC_CHANNELS.ACTIONS_HISTORY, actionId),
  restoreAction: (actionId: string, timestamp: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.ACTIONS_RESTORE, actionId, timestamp),
  getDefaultActionIds: () =>
    invokeIpc<string[]>(IPC_CHANNELS.ACTIONS_DEFAULT_IDS),
  onActionsChanged: (callback: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.ACTIONS_CHANGED, callback),

  // Persona operations
  getPersonas: (repoPath?: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.PERSONAS_LIST, repoPath),
  spawnPersona: (personaId: string, repoPath: string) =>
    invokeIpc<SpawnResult | null>(IPC_CHANNELS.PERSONAS_SPAWN, personaId, repoPath),
  loadProjectPersonas: (repoPath: string) =>
    invokeIpc<void>(IPC_CHANNELS.PERSONAS_LOAD_PROJECT, repoPath),
  onPersonasChanged: (callback: () => void) =>
    createIpcListener<[]>(IPC_CHANNELS.PERSONAS_CHANGED, callback),

  // Collection operations
  getCollection: () =>
    invokeIpc<{ discovered: number; total: number }>(IPC_CHANNELS.COLLECTION_GET),

  // Bug operations
  listBugs: (repoPath: string) =>
    invokeIpc<unknown[]>(IPC_CHANNELS.BUGS_LIST, repoPath),
  createBug: (repoPath: string, title: string, description: string) =>
    invokeIpc<unknown>(IPC_CHANNELS.BUGS_CREATE, repoPath, title, description),
  updateBug: (repoPath: string, bugId: string, updates: Record<string, unknown>) =>
    invokeIpc<unknown>(IPC_CHANNELS.BUGS_UPDATE, repoPath, bugId, updates),
  deleteBug: (repoPath: string, bugId: string) =>
    invokeIpc<boolean>(IPC_CHANNELS.BUGS_DELETE, repoPath, bugId),
  addFix: (repoPath: string, bugId: string, fix: Record<string, unknown>) =>
    invokeIpc<unknown>(IPC_CHANNELS.BUGS_ADD_FIX, repoPath, bugId, fix),
  updateFix: (repoPath: string, bugId: string, fixId: string, updates: Record<string, unknown>) =>
    invokeIpc<unknown>(IPC_CHANNELS.BUGS_UPDATE_FIX, repoPath, bugId, fixId, updates),
  askBugAssistant: (repoPath: string, bugId: string, prompt: string) =>
    invokeIpc<{ started: boolean }>(IPC_CHANNELS.BUGS_ASK_ASSISTANT, repoPath, bugId, prompt),
  onBugAssistantStreamDelta: (cb: (bugId: string, text: string) => void) =>
    createIpcListener<[string, string]>(IPC_CHANNELS.BUGS_ASSISTANT_STREAM_DELTA, cb),
  onBugAssistantStreamDone: (cb: (bugId: string, fullText: string | null, error?: string) => void) =>
    createIpcListener<[string, string | null, string | undefined]>(IPC_CHANNELS.BUGS_ASSISTANT_STREAM_DONE, cb),
  onBugAssistantStreamActivity: (cb: (bugId: string, activity: { type: string; tool?: string }) => void) =>
    createIpcListener<[string, { type: string; tool?: string }]>(IPC_CHANNELS.BUGS_ASSISTANT_STREAM_ACTIVITY, cb),
  applyFix: (repoPath: string, prompt: string) =>
    invokeIpc<{ id: string; name: string; isNew: boolean } | null>(IPC_CHANNELS.BUGS_APPLY_FIX, repoPath, prompt),

  // System check operations
  runSystemChecks: () =>
    invokeIpc<Array<{ id: string; label: string; status: string; message: string; fixable?: boolean }>>(IPC_CHANNELS.SYSTEM_CHECK_RUN),
  fixSystemCheck: (checkId: string) =>
    invokeIpc<{ id: string; label: string; status: string; message: string; fixable?: boolean }>(IPC_CHANNELS.SYSTEM_CHECK_FIX, checkId),

  // Dialog operations
  openFolderDialog: () => invokeIpc<string | null>(IPC_CHANNELS.DIALOG_OPEN_FOLDER),

  // Window operations
  toggleMaximize: () => invokeIpc<void>(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
  minimizeWindow: () => invokeIpc<void>(IPC_CHANNELS.WINDOW_MINIMIZE),
  closeWindow: () => invokeIpc<void>(IPC_CHANNELS.WINDOW_CLOSE),
  setTrafficLightVisibility: (visible: boolean) =>
    invokeIpc<void>(IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY, visible),

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
