import { app, BrowserWindow, Menu, ipcMain, powerMonitor, screen } from 'electron'
import { join } from 'path'
import { rmSync } from 'fs'
import { setupIpcHandlers, setMainWindow, getTerminalManager, getRepoManager } from './ipc/handlers'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { ConfigManager } from './config/ConfigManager'
import { getWindowConfig, getTempDir, isMac, isLinux, fixProcessPath } from './platform'
import { safeSend } from './safeSend'

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
    show: false,
    backgroundColor: '#0a0a12',
    ...(isMac ? { acceptFirstMouse: true } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    ...getWindowConfig()
  })

  mainWindow.once('ready-to-show', () => {
    if (uiState.windowMaximized) {
      mainWindow?.maximize()
    }
    mainWindow?.show()
  })

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

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_CHANGED, true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_CHANGED, false)
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
      safeSend(mainWindow, IPC_CHANNELS.APP_CONFIRM_QUIT, terminalCount)
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
    if (code !== -3) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.reload()
        }
      }, 1000)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer process gone:', details.reason)
    if (details.reason === 'crashed' || details.reason === 'oom') {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.reload()
        }
      }, 1000)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.setTitle(`${app.name} [DEV]`)
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
          click: () => safeSend(mainWindow, 'shortcut', 'new-terminal')
        },
        {
          label: 'Close Terminal',
          accelerator: accel('W'),
          click: () => safeSend(mainWindow, 'shortcut', 'close-terminal')
        },
        { type: 'separator' },
        {
          label: 'Open Repository',
          accelerator: accel('O'),
          click: () => safeSend(mainWindow, 'shortcut', 'open-repo-selector')
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
          click: () => safeSend(mainWindow, 'shortcut', 'toggle-left-sidebar')
        },
        {
          label: 'Toggle Right Sidebar',
          accelerator: isMac ? 'Cmd+Shift+B' : 'Ctrl+Shift+J',
          click: () => safeSend(mainWindow, 'shortcut', 'toggle-right-sidebar')
        },
        {
          label: 'Settings',
          accelerator: accel(','),
          click: () => safeSend(mainWindow, 'shortcut', 'open-settings')
        },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          accelerator: isMac ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
          click: () => safeSend(mainWindow, 'shortcut', 'toggle-focus-mode')
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
    safeSend(mainWindow, IPC_CHANNELS.TERMINAL_SYNC)
  })
})

app.on('will-quit', () => {
  try {
    rmSync(getTempDir(), { recursive: true, force: true })
  } catch { /* ignore */ }
})

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})
