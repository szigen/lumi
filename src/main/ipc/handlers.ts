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
import { SystemChecker } from '../system/SystemChecker'
import { BugStorage } from '../bug/bug-storage'
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

  const systemChecker = new SystemChecker()
  const bugStorage = new BugStorage()

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

  // System check handlers
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_RUN, async () => {
    return systemChecker.runAll()
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_FIX, async (_, checkId: string) => {
    return systemChecker.fix(checkId)
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

  // Bug handlers
  ipcMain.handle(IPC_CHANNELS.BUGS_LIST, async (_, repoPath: string) => {
    return bugStorage.list(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_CREATE, async (_, repoPath: string, title: string, description: string) => {
    return bugStorage.create(repoPath, title, description)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_UPDATE, async (_, repoPath: string, bugId: string, updates: Record<string, unknown>) => {
    return bugStorage.update(repoPath, bugId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_DELETE, async (_, repoPath: string, bugId: string) => {
    return bugStorage.delete(repoPath, bugId)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_ADD_FIX, async (_, repoPath: string, bugId: string, fix: Record<string, unknown>) => {
    return bugStorage.addFix(repoPath, bugId, fix as Omit<import('../../shared/bug-types').Fix, 'id'>)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_UPDATE_FIX, async (_, repoPath: string, bugId: string, fixId: string, updates: Record<string, unknown>) => {
    return bugStorage.updateFix(repoPath, bugId, fixId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_ASK_CLAUDE, async (_, repoPath: string, bugId: string, prompt: string) => {
    if (!mainWindow) return { started: false }
    const { spawn } = require('child_process') as typeof import('child_process')
    console.log('[CLAUDE-STREAM] Starting stream for bug:', bugId)
    // Pass prompt via stdin to avoid shell escaping issues with newlines/special chars
    const proc = spawn('claude', ['-p', '--verbose', '--output-format', 'stream-json', '--include-partial-messages'], {
      cwd: repoPath,
      env: process.env
    })
    proc.stdin.write(prompt)
    proc.stdin.end()

    let accumulated = ''
    let error = ''
    let buffer = ''
    let currentToolName: string | null = null

    proc.stdout.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const event = JSON.parse(trimmed)

          // Handle stream_event from --include-partial-messages
          if (event.type === 'stream_event' && event.event) {
            const streamEvent = event.event

            if (streamEvent.type === 'content_block_start' && streamEvent.content_block) {
              const block = streamEvent.content_block
              if (block.type === 'tool_use' && block.name) {
                currentToolName = block.name
                mainWindow!.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_ACTIVITY, bugId, { type: 'tool_start', tool: block.name })
              }
            } else if (streamEvent.type === 'content_block_delta' && streamEvent.delta) {
              if (streamEvent.delta.type === 'text_delta' && streamEvent.delta.text) {
                accumulated += streamEvent.delta.text
                mainWindow!.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_DELTA, bugId, streamEvent.delta.text)
              }
            } else if (streamEvent.type === 'content_block_stop') {
              if (currentToolName) {
                mainWindow!.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_ACTIVITY, bugId, { type: 'tool_end' })
                currentToolName = null
              }
            }
            continue
          }

          // Fallback: handle assistant events (CLI versions without --include-partial-messages)
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                const newText = block.text.slice(accumulated.length)
                if (newText) {
                  accumulated = block.text
                  mainWindow!.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_DELTA, bugId, newText)
                }
              }
            }
          }
        } catch {
          // skip non-JSON lines
        }
      }
    })

    proc.stderr.on('data', (data: Buffer) => {
      error += data.toString()
      console.log('[CLAUDE-STREAM] stderr:', data.toString().slice(0, 200))
    })

    proc.on('error', (err: Error) => {
      console.log('[CLAUDE-STREAM] spawn error:', err.message)
      mainWindow?.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_DONE, bugId, null, err.message)
    })

    proc.on('close', (code: number) => {
      console.log('[CLAUDE-STREAM] Process closed with code:', code, 'accumulated length:', accumulated.length)
      if (code === 0) {
        mainWindow?.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_DONE, bugId, accumulated.trim())
      } else {
        mainWindow?.webContents.send(IPC_CHANNELS.BUGS_CLAUDE_STREAM_DONE, bugId, null, error || `claude exited with code ${code}`)
      }
    })

    return { started: true }
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_APPLY_FIX, async (_, repoPath: string, prompt: string) => {
    if (!mainWindow) throw new Error('No main window')
    const result = terminalManager!.spawn(repoPath, mainWindow, false)
    if (result) {
      terminalManager!.setTask(result.id, 'Applying fix')
      setTimeout(() => {
        terminalManager!.write(result.id, `claude "${prompt.replace(/"/g, '\\"')}"\r`)
      }, 500)
    }
    return result
  })
}
