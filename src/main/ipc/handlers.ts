import { BrowserWindow } from 'electron'
import { ConfigManager } from '../config/ConfigManager'
import { NotificationManager } from '../notification/NotificationManager'
import { TerminalManager } from '../terminal/TerminalManager'
import { RepoManager } from '../repo/RepoManager'
import { ActionStore } from '../action/ActionStore'
import { ActionEngine } from '../action/ActionEngine'
import { PersonaStore } from '../persona/PersonaStore'
import { SystemChecker } from '../system/SystemChecker'
import { BugStorage } from '../bug/bug-storage'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { safeSend } from '../safeSend'
import type { AIProvider } from '../../shared/ai-provider'
import { AssistantOrchestrator } from '../assistant/AssistantOrchestrator'
import { registerTerminalHandlers } from './handlers/register-terminal-handlers'
import { registerRepoGitHandlers } from './handlers/register-repo-git-handlers'
import { registerConfigWindowHandlers } from './handlers/register-config-window-handlers'
import { registerActionPersonaHandlers } from './handlers/register-action-persona-handlers'
import { registerSystemHandlers } from './handlers/register-system-handlers'
import { registerBugHandlers } from './handlers/register-bug-handlers'
import type { IpcHandlerContext } from './handlers/types'

let mainWindow: BrowserWindow | null = null
let terminalManager: TerminalManager | null = null
let repoManager: RepoManager | null = null
let actionEngine: ActionEngine | null = null

function getActiveProvider(configManager: ConfigManager): AIProvider {
  const configured = configManager.getConfig().aiProvider
  return configured === 'codex' ? 'codex' : 'claude'
}

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
  const newTerminalManager = new TerminalManager(config.maxTerminals, notificationManager, configManager)
  const newRepoManager = new RepoManager(config.projectsRoot, config.additionalPaths || [])
  terminalManager = newTerminalManager
  repoManager = newRepoManager

  const newActionStore = new ActionStore()
  const newActionEngine = new ActionEngine(newTerminalManager)
  const newPersonaStore = new PersonaStore()
  actionEngine = newActionEngine

  const systemChecker = new SystemChecker(() => getActiveProvider(configManager))
  const bugStorage = new BugStorage()

  const assistantOrchestrator = new AssistantOrchestrator({
    getProvider: () => getActiveProvider(configManager),
    emitDelta: (bugId, text) => {
      safeSend(mainWindow, IPC_CHANNELS.BUGS_ASSISTANT_STREAM_DELTA, bugId, text)
    },
    emitDone: (bugId, fullText, error) => {
      safeSend(mainWindow, IPC_CHANNELS.BUGS_ASSISTANT_STREAM_DONE, bugId, fullText, error)
    },
    emitActivity: (bugId, activity) => {
      safeSend(mainWindow, IPC_CHANNELS.BUGS_ASSISTANT_STREAM_ACTIVITY, bugId, activity)
    }
  })

  newActionStore.setOnChange(() => {
    safeSend(mainWindow, IPC_CHANNELS.ACTIONS_CHANGED)
  })

  newPersonaStore.setOnChange(() => {
    safeSend(mainWindow, IPC_CHANNELS.PERSONAS_CHANGED)
  })

  newRepoManager.setOnReposChange(() => {
    safeSend(mainWindow, IPC_CHANNELS.REPOS_CHANGED)
  })

  newRepoManager.setOnFileTreeChange((repoPath) => {
    safeSend(mainWindow, IPC_CHANNELS.FILE_TREE_CHANGED, repoPath)
  })

  newRepoManager.watchProjectsRoot()

  const context: IpcHandlerContext = {
    getMainWindow: () => mainWindow,
    terminalManager: newTerminalManager,
    repoManager: newRepoManager,
    configManager,
    notificationManager,
    actionStore: newActionStore,
    actionEngine: newActionEngine,
    personaStore: newPersonaStore,
    systemChecker,
    bugStorage,
    assistantOrchestrator,
    getActiveProvider: () => getActiveProvider(configManager)
  }

  registerTerminalHandlers(context)
  registerRepoGitHandlers(context)
  registerConfigWindowHandlers(context)
  registerActionPersonaHandlers(context)
  registerSystemHandlers(context)
  registerBugHandlers(context)
}
