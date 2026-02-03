import { ipcMain, BrowserWindow } from 'electron'
import { TerminalManager } from '../terminal/TerminalManager'
import { RepoManager } from '../repo/RepoManager'
import { ConfigManager } from '../config/ConfigManager'

export function setupIpcHandlers(window: BrowserWindow): void {
  const configManager = new ConfigManager()
  const config = configManager.getConfig()
  const terminalManager = new TerminalManager(config.maxTerminals)
  const repoManager = new RepoManager(config.projectsRoot)

  // Terminal handlers
  ipcMain.handle('terminal:spawn', async (_, repoPath: string) => {
    return terminalManager.spawn(repoPath, window)
  })

  ipcMain.handle('terminal:write', async (_, terminalId: string, data: string) => {
    return terminalManager.write(terminalId, data)
  })

  ipcMain.handle('terminal:kill', async (_, terminalId: string) => {
    return terminalManager.kill(terminalId)
  })

  ipcMain.handle('terminal:resize', async (_, terminalId: string, cols: number, rows: number) => {
    return terminalManager.resize(terminalId, cols, rows)
  })

  // Repository handlers
  ipcMain.handle('repos:list', async () => {
    return repoManager.listRepos()
  })

  ipcMain.handle('repos:files', async (_, repoPath: string) => {
    return repoManager.getFiles(repoPath)
  })

  // Git handlers
  ipcMain.handle('git:commits', async (_, repoPath: string, branch?: string) => {
    return repoManager.getCommits(repoPath, branch)
  })

  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    return repoManager.getBranches(repoPath)
  })

  // Config handlers
  ipcMain.handle('config:get', async () => {
    return configManager.getConfig()
  })

  ipcMain.handle('config:set', async (_, newConfig: Record<string, unknown>) => {
    configManager.setConfig(newConfig)

    // Update managers with new config
    if (newConfig.maxTerminals) {
      terminalManager.setMaxTerminals(newConfig.maxTerminals as number)
    }
    if (newConfig.projectsRoot) {
      repoManager.setProjectsRoot(newConfig.projectsRoot as string)
    }

    return true
  })

  // UI State handlers
  ipcMain.handle('ui-state:get', async () => {
    return configManager.getUIState()
  })

  ipcMain.handle('ui-state:set', async (_, state: Record<string, unknown>) => {
    configManager.setUIState(state)
    return true
  })

  // Cleanup on window close
  window.on('close', () => {
    terminalManager.killAll()
  })
}
