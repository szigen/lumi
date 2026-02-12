import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { TerminalManager } from '../terminal/TerminalManager'
import { RepoManager } from '../repo/RepoManager'
import { ConfigManager } from '../config/ConfigManager'
import { NotificationManager } from '../notification/NotificationManager'
import * as path from 'path'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { ActionStore } from '../action/ActionStore'
import { ActionEngine } from '../action/ActionEngine'
import { CREATE_ACTION_PROMPT } from '../action/create-action-prompt'
import { buildClaudeCommand } from '../action/build-claude-command'
import { PersonaStore } from '../persona/PersonaStore'
import { TOTAL_CODENAMES } from '../terminal/codenames'

let mainWindow: BrowserWindow | null = null
let terminalManager: TerminalManager | null = null
let repoManager: RepoManager | null = null
let actionStore: ActionStore | null = null
let actionEngine: ActionEngine | null = null
let personaStore: PersonaStore | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
  actionEngine?.setWindow(window)
}

export function getTerminalManager(): TerminalManager | null {
  return terminalManager
}

export function getRepoManager(): RepoManager | null {
  return repoManager
}

export function setupIpcHandlers(): void {
  const configManager = new ConfigManager()
  const config = configManager.getConfig()
  const notificationManager = new NotificationManager()
  terminalManager = new TerminalManager(config.maxTerminals, notificationManager, configManager)
  repoManager = new RepoManager(config.projectsRoot, config.additionalPaths || [])

  actionStore = new ActionStore()
  actionEngine = new ActionEngine(terminalManager)

  personaStore = new PersonaStore()

  // Send action changes to renderer
  actionStore.setOnChange(() => {
    mainWindow?.webContents.send(IPC_CHANNELS.ACTIONS_CHANGED)
  })

  // Send persona changes to renderer
  personaStore.setOnChange(() => {
    mainWindow?.webContents.send(IPC_CHANNELS.PERSONAS_CHANGED)
  })

  // Send repo/file-tree changes to renderer
  repoManager.setOnReposChange(() => {
    mainWindow?.webContents.send(IPC_CHANNELS.REPOS_CHANGED)
  })
  repoManager.setOnFileTreeChange((repoPath) => {
    mainWindow?.webContents.send(IPC_CHANNELS.FILE_TREE_CHANGED, repoPath)
  })
  repoManager.watchProjectsRoot()

  // Terminal handlers
  ipcMain.handle(IPC_CHANNELS.TERMINAL_SPAWN, async (_, repoPath: string, task?: string) => {
    if (!mainWindow) throw new Error('No main window')
    const result = terminalManager!.spawn(repoPath, mainWindow)
    if (result && task) {
      terminalManager!.setTask(result.id, task)
    }
    return result
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

  ipcMain.handle(IPC_CHANNELS.TERMINAL_LIST, async () => {
    return terminalManager!.getTerminalList()
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_BUFFER, async (_, terminalId: string) => {
    return terminalManager!.getOutputBuffer(terminalId)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_STATUS, async (_, terminalId: string) => {
    return terminalManager!.getStatus(terminalId)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_FOCUS, (_event, terminalId: string | null) => {
    if (!terminalManager) return
    terminalManager.setFocused(terminalId)
  })

  // Repository handlers
  ipcMain.handle(IPC_CHANNELS.REPOS_LIST, async () => {
    return repoManager!.listRepos()
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILES, async (_, repoPath: string) => {
    return repoManager!.getFiles(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILE_TREE, async (_, repoPath: string) => {
    return repoManager!.getFileTree(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_WATCH_FILE_TREE, async (_, repoPath: string) => {
    repoManager!.watchRepoFileTree(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_UNWATCH_FILE_TREE, async (_, repoPath: string) => {
    repoManager!.unwatchRepoFileTree(repoPath)
  })

  // Git handlers
  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMITS,
    async (_, repoPath: string, branch?: string) => {
      return repoManager!.getCommits(repoPath, branch)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async (_, repoPath: string) => {
    return repoManager!.getBranches(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_, repoPath: string) => {
    return repoManager!.getStatus(repoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (_, repoPath: string, files: string[], message: string) => {
      return repoManager!.commit(repoPath, files, message)
    }
  )

  // Config handlers
  ipcMain.handle(IPC_CHANNELS.CONFIG_IS_FIRST_RUN, async () => {
    return configManager.isFirstRun()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    return configManager.getConfig()
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_SET,
    async (_, newConfig: Record<string, unknown>) => {
      configManager.setConfig(newConfig)

      // Update managers with new config
      let reposAffected = false
      if (newConfig.maxTerminals) {
        terminalManager!.setMaxTerminals(newConfig.maxTerminals as number)
      }
      if (newConfig.projectsRoot) {
        repoManager!.setProjectsRoot(newConfig.projectsRoot as string)
        reposAffected = true
      }
      if (newConfig.additionalPaths !== undefined) {
        repoManager!.setAdditionalPaths(newConfig.additionalPaths as import('../../shared/types').AdditionalPath[])
        reposAffected = true
      }

      // Notify renderer to reload repo list
      if (reposAffected) {
        mainWindow?.webContents.send(IPC_CHANNELS.REPOS_CHANGED)
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

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  // Dialog handlers
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Context menu handlers
  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_DELETE_FILE,
    async (_, repoPath: string, relativePath: string) => {
      const absolutePath = path.join(repoPath, relativePath)
      await shell.trashItem(absolutePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_REVEAL_IN_FINDER,
    async (_, repoPath: string, relativePath: string) => {
      const absolutePath = path.join(repoPath, relativePath)
      shell.showItemInFolder(absolutePath)
    }
  )

  // Collection handlers
  ipcMain.handle(IPC_CHANNELS.COLLECTION_GET, async () => {
    const discovered = configManager.getDiscoveredCodenames()
    return { discovered: discovered.length, total: TOTAL_CODENAMES }
  })

  // Action handlers
  ipcMain.handle(IPC_CHANNELS.ACTIONS_LIST, async (_, repoPath?: string) => {
    return actionStore!.getActions(repoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.ACTIONS_EXECUTE,
    async (_, actionId: string, repoPath: string) => {
      const actions = actionStore!.getActions(repoPath)
      const action = actions.find((a) => a.id === actionId)
      if (!action) throw new Error(`Action not found: ${actionId}`)
      const result = await actionEngine!.execute(action, repoPath)
      if (result) {
        terminalManager!.setTask(result.id, action.label)
      }
      return result
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACTIONS_DELETE,
    async (_, actionId: string, scope: 'user' | 'project', repoPath?: string) => {
      return actionStore!.deleteAction(actionId, scope, repoPath)
    }
  )

  ipcMain.handle(IPC_CHANNELS.ACTIONS_LOAD_PROJECT, async (_, repoPath: string) => {
    actionStore!.loadProjectActions(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_HISTORY, async (_, actionId: string) => {
    return actionStore!.getActionHistory(actionId)
  })

  ipcMain.handle(
    IPC_CHANNELS.ACTIONS_RESTORE,
    async (_, actionId: string, timestamp: string) => {
      return actionStore!.restoreAction(actionId, timestamp)
    }
  )

  ipcMain.handle(IPC_CHANNELS.ACTIONS_DEFAULT_IDS, async () => {
    return actionStore!.getDefaultIds()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_CREATE_NEW, async (_, repoPath: string) => {
    const action: import('../../shared/action-types').Action = {
      id: '__create-action',
      label: 'Create Action',
      icon: 'Plus',
      scope: 'user',
      claude: {
        appendSystemPrompt: CREATE_ACTION_PROMPT
      },
      steps: [
        {
          type: 'write',
          content: `claude "."\r`
        }
      ]
    }
    const result = await actionEngine!.execute(action, repoPath)
    if (result) {
      terminalManager!.setTask(result.id, 'Create Action')
    }
    return result
  })

  // Persona handlers
  ipcMain.handle(IPC_CHANNELS.PERSONAS_LIST, async (_, repoPath?: string) => {
    return personaStore!.getPersonas(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.PERSONAS_LOAD_PROJECT, async (_, repoPath: string) => {
    personaStore!.loadProjectPersonas(repoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.PERSONAS_SPAWN,
    async (_, personaId: string, repoPath: string) => {
      if (!mainWindow) throw new Error('No main window')

      const personas = personaStore!.getPersonas(repoPath)
      const persona = personas.find((p) => p.id === personaId)
      if (!persona) throw new Error(`Persona not found: ${personaId}`)

      const result = terminalManager!.spawn(repoPath, mainWindow, false)
      if (!result) return null

      terminalManager!.setTask(result.id, persona.label)
      const command = buildClaudeCommand('claude ""\r', persona.claude)
      terminalManager!.write(result.id, command)

      return result
    }
  )
}
