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

  // Config operations
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // UI State operations
  UI_STATE_GET: 'ui-state:get',
  UI_STATE_SET: 'ui-state:set'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
