import { ipcMain } from 'electron'
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
}
