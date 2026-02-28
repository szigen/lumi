import { ipcMain, dialog } from 'electron'
import { isMac } from '../../platform'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import { safeSend } from '../../safeSend'
import type { NotificationSettings } from '../../../shared/types'
import type { IpcHandlerContext } from './types'

export function registerConfigWindowHandlers(context: IpcHandlerContext): void {
  const { configManager, terminalManager, repoManager, notificationManager, getMainWindow } = context

  ipcMain.handle(IPC_CHANNELS.CONFIG_IS_FIRST_RUN, async () => {
    return configManager.isFirstRun()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    return configManager.getConfig()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_, newConfig: Record<string, unknown>) => {
    configManager.setConfig(newConfig)

    let reposAffected = false
    if (newConfig.maxTerminals) {
      terminalManager.setMaxTerminals(newConfig.maxTerminals as number)
    }
    if (newConfig.projectsRoot) {
      repoManager.setProjectsRoot(newConfig.projectsRoot as string)
      reposAffected = true
    }
    if (newConfig.additionalPaths !== undefined) {
      repoManager.setAdditionalPaths(newConfig.additionalPaths as import('../../../shared/types').AdditionalPath[])
      reposAffected = true
    }

    if (newConfig.notifications) {
      notificationManager.updateSettings(newConfig.notifications as NotificationSettings)
    }

    if (reposAffected) {
      safeSend(getMainWindow(), IPC_CHANNELS.REPOS_CHANGED)
    }

    return true
  })

  ipcMain.handle(IPC_CHANNELS.UI_STATE_GET, async () => {
    return configManager.getUIState()
  })

  ipcMain.handle(IPC_CHANNELS.UI_STATE_SET, async (_, state: Record<string, unknown>) => {
    configManager.setUIState(state)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    getMainWindow()?.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY, (_event, visible: boolean) => {
    if (isMac) {
      getMainWindow()?.setWindowButtonVisibility(visible)
    }
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
