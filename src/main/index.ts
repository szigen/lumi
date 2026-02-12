import { app, BrowserWindow, Menu, ipcMain, powerMonitor } from 'electron'
import { join } from 'path'
import { rmSync } from 'fs'
import { tmpdir } from 'os'
import { setupIpcHandlers, setMainWindow, getTerminalManager, getRepoManager } from './ipc/handlers'
import { IPC_CHANNELS } from '../shared/ipc-channels'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 19 }
  })

  setMainWindow(mainWindow)

  // Intercept window close when terminals are active
  mainWindow.on('close', (e) => {
    const terminalManager = getTerminalManager()
    const terminalCount = terminalManager?.getCount() ?? 0

    if (!isQuitting && terminalCount > 0) {
      e.preventDefault()
      mainWindow?.webContents.send(IPC_CHANNELS.APP_CONFIRM_QUIT, terminalCount)
    } else {
      terminalManager?.killAll()
      getRepoManager()?.dispose()
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => mainWindow?.close()
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Claude',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('shortcut', 'new-terminal')
        },
        {
          label: 'Close Terminal',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow?.webContents.send('shortcut', 'close-terminal')
        },
        { type: 'separator' },
        {
          label: 'Open Repository',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('shortcut', 'open-repo-selector')
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Left Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-left-sidebar')
        },
        {
          label: 'Toggle Right Sidebar',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-right-sidebar')
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('shortcut', 'open-settings')
        },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-focus-mode')
        },
        { type: 'separator' },
        {
          label: 'PTY Inspector',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-pty-inspector')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Crash recovery — kill zombie PTY processes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  getTerminalManager()?.killAll()
  getRepoManager()?.dispose()
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

app.whenReady().then(() => {
  setupIpcHandlers()
  createWindow()
  createMenu()

  // Handle quit confirmation from renderer
  ipcMain.on(IPC_CHANNELS.APP_QUIT_CONFIRMED, () => {
    isQuitting = true
    getTerminalManager()?.killAll()
    getRepoManager()?.dispose()
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Notify renderer to re-sync terminal state after macOS sleep/wake
  powerMonitor.on('resume', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.TERMINAL_SYNC)
  })
})

app.on('will-quit', () => {
  try {
    rmSync(join(tmpdir(), 'ai-orchestrator'), { recursive: true, force: true })
  } catch { /* ignore */ }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
