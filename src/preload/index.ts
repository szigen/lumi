import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Terminal operations
  spawnTerminal: (repoPath: string) =>
    ipcRenderer.invoke('terminal:spawn', repoPath),
  writeTerminal: (terminalId: string, data: string) =>
    ipcRenderer.invoke('terminal:write', terminalId, data),
  killTerminal: (terminalId: string) =>
    ipcRenderer.invoke('terminal:kill', terminalId),
  onTerminalOutput: (callback: (terminalId: string, data: string) => void) => {
    ipcRenderer.on('terminal:output', (_, terminalId, data) => callback(terminalId, data))
  },
  onTerminalExit: (callback: (terminalId: string, code: number) => void) => {
    ipcRenderer.on('terminal:exit', (_, terminalId, code) => callback(terminalId, code))
  },

  // Repository operations
  getRepos: () => ipcRenderer.invoke('repos:list'),
  getRepoFiles: (repoPath: string) => ipcRenderer.invoke('repos:files', repoPath),

  // Git operations
  getCommits: (repoPath: string, branch?: string) =>
    ipcRenderer.invoke('git:commits', repoPath, branch),
  getBranches: (repoPath: string) =>
    ipcRenderer.invoke('git:branches', repoPath),

  // Config operations
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke('config:set', config),
  getUIState: () => ipcRenderer.invoke('ui-state:get'),
  setUIState: (state: Record<string, unknown>) =>
    ipcRenderer.invoke('ui-state:set', state)
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
