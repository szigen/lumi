import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { IpcHandlerContext } from './types'

export function registerSystemHandlers(context: IpcHandlerContext): void {
  const { systemChecker } = context

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_RUN, async () => {
    return systemChecker.runAll()
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_FIX, async (_, checkId: string) => {
    return systemChecker.fix(checkId)
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    }
  })
}
