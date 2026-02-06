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

  // Repository operations
  REPOS_LIST: 'repos:list',
  REPOS_FILES: 'repos:files',
  REPOS_FILE_TREE: 'repos:file-tree',

  // Git operations
  GIT_COMMITS: 'git:commits',
  GIT_BRANCHES: 'git:branches',
  GIT_STATUS: 'git:status',
  GIT_COMMIT: 'git:commit',

  // Config operations
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

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

  // Collection operations
  COLLECTION_GET: 'collection:get',

  // App lifecycle
  APP_CONFIRM_QUIT: 'app:confirm-quit',
  APP_QUIT_CONFIRMED: 'app:quit-confirmed'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
