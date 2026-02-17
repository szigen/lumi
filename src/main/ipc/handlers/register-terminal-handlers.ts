import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { IpcHandlerContext } from './types'

export function registerTerminalHandlers(context: IpcHandlerContext): void {
  const { terminalManager, getMainWindow } = context

  ipcMain.handle(IPC_CHANNELS.TERMINAL_SPAWN, async (_, repoPath: string, task?: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('No main window')

    const result = terminalManager.spawn(repoPath, mainWindow)
    if (result && task) {
      terminalManager.setTask(result.id, task)
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, async (_, terminalId: string, data: string) => {
    return terminalManager.write(terminalId, data)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, async (_, terminalId: string) => {
    return terminalManager.kill(terminalId)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, async (_, terminalId: string, cols: number, rows: number) => {
    return terminalManager.resize(terminalId, cols, rows)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_SNAPSHOT, async () => {
    return terminalManager.getTerminalSnapshots()
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_STATUS, async (_, terminalId: string) => {
    return terminalManager.getStatus(terminalId)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_FOCUS, (_event, terminalId: string | null) => {
    terminalManager.setFocused(terminalId)
  })
}
