import { app, BrowserWindow, Menu, ipcMain, powerMonitor, screen } from 'electron'
import { join } from 'path'
import { rmSync } from 'fs'
import { tmpdir } from 'os'
import { setupIpcHandlers, setMainWindow, getTerminalManager, getRepoManager } from './ipc/handlers'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { ConfigManager } from './config/ConfigManager'
import { getWindowConfig, isMac, isLinux, fixProcessPath } from './platform'

/** Returns platform-appropriate accelerator: Cmd on macOS, Ctrl+Shift on Windows/Linux */
const accel = (key: string): string => isMac ? `Cmd+${key}` : `Ctrl+Shift+${key}`

if (isLinux) {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-setuid-sandbox')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('no-zygote')
  app.commandLine.appendSwitch('in-process-gpu')
  // Software rendering fallback
  app.commandLine.appendSwitch('use-gl', 'angle')
  app.commandLine.appendSwitch('use-angle', 'swiftshader')
  // Wayland support
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations')
}

const configManager = new ConfigManager()
let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  const uiState = configManager.getUIState()
  const savedBounds = uiState.windowBounds

  // Validate saved bounds are on a visible display
  let useSavedBounds = false
  if (savedBounds) {
    const displays = screen.getAllDisplays()
    const visible = displays.some((display) => {
      const { x, y, width, height } = display.workArea
      // Check if at least part of the window is on this display
      return (
        savedBounds.x < x + width &&
        savedBounds.x + savedBounds.width > x &&
        savedBounds.y < y + height &&
        savedBounds.y + savedBounds.height > y
      )
    })
    useSavedBounds = visible
  }

  mainWindow = new BrowserWindow({
    width: useSavedBounds ? savedBounds!.width : 1400,
    height: useSavedBounds ? savedBounds!.height : 900,
    ...(useSavedBounds ? { x: savedBounds!.x, y: savedBounds!.y } : {}),
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    ...getWindowConfig()
  })

  // Restore maximized state after window creation
  if (uiState.windowMaximized) {
    mainWindow.maximize()
  }

  setMainWindow(mainWindow)

  // --- Window state persistence ---
  let saveTimeout: NodeJS.Timeout | null = null

  const saveWindowBounds = () => {
    if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return
      configManager.setUIState({ windowBounds: mainWindow.getBounds() })
    }, 500)
  }

  mainWindow.on('resize', saveWindowBounds)
  mainWindow.on('move', saveWindowBounds)

  mainWindow.on('maximize', () => {
    configManager.setUIState({ windowMaximized: true })
  })

  mainWindow.on('unmaximize', () => {
    configManager.setUIState({ windowMaximized: false })
  })

  // Intercept window close when terminals are active
  mainWindow.on('close', (e) => {
    // Save final window state before closing
    if (mainWindow) {
      const maximized = mainWindow.isMaximized()
      configManager.setUIState({ windowMaximized: maximized })
      if (!maximized && !mainWindow.isMinimized()) {
        configManager.setUIState({ windowBounds: mainWindow.getBounds() })
      }
    }

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

  // Track window-level focus for notification decisions
  mainWindow.on('focus', () => {
    getTerminalManager()?.setWindowFocused(true)
  })
  mainWindow.on('blur', () => {
    getTerminalManager()?.setWindowFocused(false)
  })

  mainWindow.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error(`Renderer failed to load: ${code} ${desc} (${url})`)
  })
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer process gone:', details.reason)
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            {
              label: 'Quit',
              accelerator: accel('Q'),
              click: () => mainWindow?.close()
            }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: accel('T'),
          click: () => mainWindow?.webContents.send('shortcut', 'new-terminal')
        },
        {
          label: 'Close Terminal',
          accelerator: accel('W'),
          click: () => mainWindow?.webContents.send('shortcut', 'close-terminal')
        },
        { type: 'separator' },
        {
          label: 'Open Repository',
          accelerator: accel('O'),
          click: () => mainWindow?.webContents.send('shortcut', 'open-repo-selector')
        },
        ...(!isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'Quit',
                accelerator: accel('Q'),
                click: () => mainWindow?.close()
              }
            ]
          : [])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Left Sidebar',
          accelerator: accel('B'),
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-left-sidebar')
        },
        {
          label: 'Toggle Right Sidebar',
          accelerator: isMac ? 'Cmd+Shift+B' : 'Ctrl+Shift+J',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-right-sidebar')
        },
        {
          label: 'Settings',
          accelerator: accel(','),
          click: () => mainWindow?.webContents.send('shortcut', 'open-settings')
        },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          accelerator: isMac ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
          click: () => mainWindow?.webContents.send('shortcut', 'toggle-focus-mode')
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
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const }
            ]
          : [
              { role: 'close' as const }
            ])
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
  fixProcessPath()
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
    rmSync(join(tmpdir(), 'lumi'), { recursive: true, force: true })
  } catch { /* ignore */ }
})

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})
