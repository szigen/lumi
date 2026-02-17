import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { IpcHandlerContext } from './types'
import { buildDelimitedInputCommand } from './utils'

function isValidRepoPath(repoPath: string): boolean {
  return (
    typeof repoPath === 'string' &&
    path.isAbsolute(repoPath) &&
    !repoPath.includes('..') &&
    existsSync(repoPath)
  )
}

export function registerBugHandlers(context: IpcHandlerContext): void {
  const {
    getMainWindow,
    getActiveProvider,
    terminalManager,
    bugStorage,
    assistantOrchestrator
  } = context

  ipcMain.handle(IPC_CHANNELS.BUGS_LIST, async (_, repoPath: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.list(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_CREATE, async (_, repoPath: string, title: string, description: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.create(repoPath, title, description)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_UPDATE, async (_, repoPath: string, bugId: string, updates: Record<string, unknown>) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.update(repoPath, bugId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_DELETE, async (_, repoPath: string, bugId: string) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.delete(repoPath, bugId)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_ADD_FIX, async (_, repoPath: string, bugId: string, fix: Record<string, unknown>) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.addFix(repoPath, bugId, fix as Omit<import('../../../shared/bug-types').Fix, 'id'>)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_UPDATE_FIX, async (_, repoPath: string, bugId: string, fixId: string, updates: Record<string, unknown>) => {
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')
    return bugStorage.updateFix(repoPath, bugId, fixId, updates)
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_ASK_ASSISTANT, async (_, repoPath: string, bugId: string, prompt: string) => {
    if (!getMainWindow()) return { started: false }
    if (!isValidRepoPath(repoPath)) return { started: false, error: 'Invalid repo path' }

    return assistantOrchestrator.askAssistant({ repoPath, bugId, prompt })
  })

  ipcMain.handle(IPC_CHANNELS.BUGS_APPLY_FIX, async (_, repoPath: string, prompt: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')
    if (!isValidRepoPath(repoPath)) throw new Error('Invalid repo path')

    const provider = getActiveProvider()
    const result = terminalManager.spawn(repoPath, mainWindow, false)
    if (result) {
      terminalManager.setTask(result.id, 'Applying fix')

      setTimeout(() => {
        const command = provider === 'codex'
          ? buildDelimitedInputCommand('codex exec -', prompt)
          : buildDelimitedInputCommand('claude -p', prompt)
        terminalManager.write(result.id, command)
      }, 500)
    }

    return result
  })
}
