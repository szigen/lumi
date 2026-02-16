import { ipcMain } from 'electron'
import type { Action } from '../../../shared/action-types'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import { CREATE_ACTION_PROMPT } from '../../action/create-action-prompt'
import { buildEditActionPrompt } from '../../action/edit-action-prompt'
import { buildAgentCommand } from '../../action/build-agent-command'
import { getProviderBinary } from '../../../shared/ai-provider'
import type { IpcHandlerContext } from './types'
import { buildDelimitedInputCommand } from './utils'

export function registerActionPersonaHandlers(context: IpcHandlerContext): void {
  const {
    getMainWindow,
    getActiveProvider,
    terminalManager,
    actionStore,
    actionEngine,
    personaStore
  } = context

  ipcMain.handle(IPC_CHANNELS.ACTIONS_LIST, async (_, repoPath?: string) => {
    return actionStore.getActions(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_EXECUTE, async (_, actionId: string, repoPath: string) => {
    const actions = actionStore.getActions(repoPath)
    const action = actions.find((a) => a.id === actionId)
    if (!action) throw new Error(`Action not found: ${actionId}`)

    const result = await actionEngine.execute(
      { ...action, provider: action.provider ?? getActiveProvider() },
      repoPath
    )

    if (result) {
      terminalManager.setTask(result.id, action.label)
    }

    return result
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_DELETE, async (_, actionId: string, scope: 'user' | 'project', repoPath?: string) => {
    return actionStore.deleteAction(actionId, scope, repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_LOAD_PROJECT, async (_, repoPath: string) => {
    actionStore.loadProjectActions(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_HISTORY, async (_, actionId: string) => {
    return actionStore.getActionHistory(actionId)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_RESTORE, async (_, actionId: string, timestamp: string) => {
    return actionStore.restoreAction(actionId, timestamp)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_DEFAULT_IDS, async () => {
    return actionStore.getDefaultIds()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_CREATE_NEW, async (_, repoPath: string) => {
    const provider = getActiveProvider()
    const action: Action = {
      id: '__create-action',
      label: 'Create Action',
      icon: 'Plus',
      scope: 'user',
      provider,
      ...(provider === 'claude'
        ? {
            claude: {
              appendSystemPrompt: CREATE_ACTION_PROMPT
            }
          }
        : {}),
      steps: [
        {
          type: 'write',
          content: provider === 'codex'
            ? buildDelimitedInputCommand(
                'codex exec -',
                `${CREATE_ACTION_PROMPT}\n\nThe user request is ".". Create the action now.`
              )
            : `${getProviderBinary(provider)} "."\r`
        }
      ]
    }

    const result = await actionEngine.execute(action, repoPath)
    if (result) {
      terminalManager.setTask(result.id, 'Create Action')
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.ACTIONS_EDIT, async (_, actionId: string, scope: string, repoPath?: string) => {
    const yamlContent = actionStore.getActionContent(actionId, scope as 'user' | 'project', repoPath)
    if (!yamlContent) throw new Error(`Action not found: ${actionId}`)

    const filePath = actionStore.getActionFilePath(actionId, scope as 'user' | 'project', repoPath)
    if (!filePath) throw new Error(`Action file not found: ${actionId}`)

    const provider = getActiveProvider()
    const editPrompt = buildEditActionPrompt(yamlContent, filePath)

    const action: Action = {
      id: '__edit-action',
      label: `Edit Action`,
      icon: 'FileEdit',
      scope: 'user',
      provider,
      ...(provider === 'claude'
        ? {
            claude: {
              appendSystemPrompt: editPrompt
            }
          }
        : {}),
      steps: [
        {
          type: 'write',
          content: provider === 'codex'
            ? buildDelimitedInputCommand(
                'codex exec -',
                `${editPrompt}\n\nThe user request is ".". Edit the action now.`
              )
            : `${getProviderBinary(provider)} "."\r`
        }
      ]
    }

    const editResult = await actionEngine.execute(action, repoPath || actionStore.getUserDir())
    if (editResult) {
      terminalManager.setTask(editResult.id, `Edit: ${actionId}`)
    }
    return editResult
  })

  ipcMain.handle(IPC_CHANNELS.PERSONAS_LIST, async (_, repoPath?: string) => {
    return personaStore.getPersonas(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.PERSONAS_LOAD_PROJECT, async (_, repoPath: string) => {
    personaStore.loadProjectPersonas(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.PERSONAS_SPAWN, async (_, personaId: string, repoPath: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')

    const personas = personaStore.getPersonas(repoPath)
    const persona = personas.find((p) => p.id === personaId)
    if (!persona) throw new Error(`Persona not found: ${personaId}`)

    const result = terminalManager.spawn(repoPath, mainWindow, false)
    if (!result) return null

    terminalManager.setTask(result.id, persona.label)
    const provider = persona.provider ?? getActiveProvider()
    const baseCommand = provider === 'codex' ? 'codex\r' : 'claude ""\r'
    const command = buildAgentCommand(baseCommand, {
      provider,
      claude: persona.claude,
      codex: persona.codex
    })
    terminalManager.write(result.id, command)

    return result
  })
}
