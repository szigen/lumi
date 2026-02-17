import type { BrowserWindow } from 'electron'
import type { ActionEngine } from '../../action/ActionEngine'
import type { ActionStore } from '../../action/ActionStore'
import type { ConfigManager } from '../../config/ConfigManager'
import type { BugStorage } from '../../bug/bug-storage'
import type { NotificationManager } from '../../notification/NotificationManager'
import type { PersonaStore } from '../../persona/PersonaStore'
import type { RepoManager } from '../../repo/RepoManager'
import type { SystemChecker } from '../../system/SystemChecker'
import type { TerminalManager } from '../../terminal/TerminalManager'
import type { AIProvider } from '../../../shared/ai-provider'
import type { AssistantOrchestrator } from '../../assistant/AssistantOrchestrator'

export interface IpcHandlerContext {
  getMainWindow: () => BrowserWindow | null
  terminalManager: TerminalManager
  repoManager: RepoManager
  configManager: ConfigManager
  notificationManager: NotificationManager
  actionStore: ActionStore
  actionEngine: ActionEngine
  personaStore: PersonaStore
  systemChecker: SystemChecker
  bugStorage: BugStorage
  assistantOrchestrator: AssistantOrchestrator
  getActiveProvider: () => AIProvider
}
