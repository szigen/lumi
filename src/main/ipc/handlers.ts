import { ipcMain, BrowserWindow } from 'electron'
import { TerminalManager } from '../terminal/TerminalManager'
import { RepoManager } from '../repo/RepoManager'
import { ConfigManager } from '../config/ConfigManager'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

let mainWindow: BrowserWindow | null = null
let terminalManager: TerminalManager | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window

  // Cleanup on window close
  window.on('close', () => {
    terminalManager?.killAll()
  })
}

export function setupIpcHandlers(): void {
  const configManager = new ConfigManager()
  const config = configManager.getConfig()
  terminalManager = new TerminalManager(config.maxTerminals)
  const repoManager = new RepoManager(config.projectsRoot)

  // Terminal handlers
  ipcMain.handle(IPC_CHANNELS.TERMINAL_SPAWN, async (_, repoPath: string) => {
    if (!mainWindow) throw new Error('No main window')
    return terminalManager!.spawn(repoPath, mainWindow)
  })

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_WRITE,
    async (_, terminalId: string, data: string) => {
      return terminalManager!.write(terminalId, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, async (_, terminalId: string) => {
    return terminalManager!.kill(terminalId)
  })

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    async (_, terminalId: string, cols: number, rows: number) => {
      return terminalManager!.resize(terminalId, cols, rows)
    }
  )

  // Repository handlers
  ipcMain.handle(IPC_CHANNELS.REPOS_LIST, async () => {
    return repoManager.listRepos()
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILES, async (_, repoPath: string) => {
    return repoManager.getFiles(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILE_TREE, async (_, repoPath: string) => {
    return repoManager.getFileTree(repoPath)
  })

  // Git handlers
  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMITS,
    async (_, repoPath: string, branch?: string) => {
      return repoManager.getCommits(repoPath, branch)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async (_, repoPath: string) => {
    return repoManager.getBranches(repoPath)
  })

  // Config handlers
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    return configManager.getConfig()
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_SET,
    async (_, newConfig: Record<string, unknown>) => {
      configManager.setConfig(newConfig)

      // Update managers with new config
      if (newConfig.maxTerminals) {
        terminalManager!.setMaxTerminals(newConfig.maxTerminals as number)
      }
      if (newConfig.projectsRoot) {
        repoManager.setProjectsRoot(newConfig.projectsRoot as string)
      }

      return true
    }
  )

  // UI State handlers
  ipcMain.handle(IPC_CHANNELS.UI_STATE_GET, async () => {
    return configManager.getUIState()
  })

  ipcMain.handle(
    IPC_CHANNELS.UI_STATE_SET,
    async (_, state: Record<string, unknown>) => {
      configManager.setUIState(state)
      return true
    }
  )
}
