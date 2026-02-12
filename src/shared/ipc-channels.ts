/**
 * IPC Channel Constants
 * Centralized channel names for type-safe IPC communication
 */
export const IPC_CHANNELS = {
  // Terminal operations
  TERMINAL_SPAWN: 'terminal:spawn',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_EXIT: 'terminal:exit',
  TERMINAL_LIST: 'terminal:list',
  TERMINAL_BUFFER: 'terminal:buffer',
  TERMINAL_SYNC: 'terminal:sync',

  // Repository operations
  REPOS_LIST: 'repos:list',
  REPOS_FILES: 'repos:files',
  REPOS_FILE_TREE: 'repos:file-tree',
  REPOS_CHANGED: 'repos:changed',
  FILE_TREE_CHANGED: 'file-tree:changed',
  REPOS_WATCH_FILE_TREE: 'repos:watch-file-tree',
  REPOS_UNWATCH_FILE_TREE: 'repos:unwatch-file-tree',

  // Git operations
  GIT_COMMITS: 'git:commits',
  GIT_BRANCHES: 'git:branches',
  GIT_STATUS: 'git:status',
  GIT_COMMIT: 'git:commit',

  // Config operations
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_IS_FIRST_RUN: 'config:is-first-run',

  // UI State operations
  UI_STATE_GET: 'ui-state:get',
  UI_STATE_SET: 'ui-state:set',

  // Notification operations
  TERMINAL_BELL: 'terminal:bell',
  NOTIFICATION_CLICK: 'notification:click',

  // Context menu operations
  CONTEXT_DELETE_FILE: 'context:delete-file',
  CONTEXT_REVEAL_IN_FINDER: 'context:reveal-in-finder',

  // Window operations
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',

  // Dialog operations
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',

  // Action operations
  ACTIONS_LIST: 'actions:list',
  ACTIONS_EXECUTE: 'actions:execute',
  ACTIONS_DELETE: 'actions:delete',
  ACTIONS_CHANGED: 'actions:changed',
  ACTIONS_LOAD_PROJECT: 'actions:load-project',
  ACTIONS_CREATE_NEW: 'actions:create-new',
  ACTIONS_HISTORY: 'actions:history',
  ACTIONS_RESTORE: 'actions:restore',
  ACTIONS_DEFAULT_IDS: 'actions:default-ids',

  // Persona operations
  PERSONAS_LIST: 'personas:list',
  PERSONAS_SPAWN: 'personas:spawn',
  PERSONAS_CHANGED: 'personas:changed',
  PERSONAS_LOAD_PROJECT: 'personas:load-project',

  // Collection operations
  COLLECTION_GET: 'collection:get',

  // PTY Inspector
  PTY_INSPECTOR_SET_ENABLED: 'pty-inspector:set-enabled',
  PTY_INSPECTOR_LOG_PATH: 'pty-inspector:log-path',
  PTY_INSPECTOR_STATS: 'pty-inspector:stats',

  // App lifecycle
  APP_CONFIRM_QUIT: 'app:confirm-quit',
  APP_QUIT_CONFIRMED: 'app:quit-confirmed'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
