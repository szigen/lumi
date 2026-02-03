# AI Orchestrator MVP - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a desktop dashboard for managing multiple Claude Code CLI instances across repositories.

**Architecture:** Electron app with React renderer, IPC bridge for terminal management, node-pty for CLI spawning, xterm.js for terminal UI. State managed with Zustand, styled with Tailwind CSS.

**Tech Stack:** Electron + electron-vite, React 18, TypeScript, Tailwind CSS, Zustand, xterm.js, react-xtermjs, node-pty, simple-git

---

## Phase 1: Project Setup

### Task 1.1: Initialize Electron Project with electron-vite

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`

**Step 1: Create project with electron-vite**

```bash
cd /Users/sezginsazliogullari/Desktop/AiApps/ai-orchestrator
npm create @anthropic-ai/create-electron-app@latest . -- --template react-ts
```

If electron-vite CLI isn't available, manually initialize:

```bash
npm init -y
npm install -D electron electron-vite vite @vitejs/plugin-react typescript
npm install react react-dom
npm install -D @types/react @types/react-dom @types/node
```

**Step 2: Create electron.vite.config.ts**

```typescript
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
```

**Step 3: Update package.json scripts**

```json
{
  "name": "ai-orchestrator",
  "version": "0.1.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

**Step 4: Verify project runs**

```bash
npm run dev
```

Expected: Electron window opens (may be blank at this point)

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: initialize electron-vite project with React + TypeScript"
```

---

### Task 1.2: Setup Project Structure

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/index.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`

**Step 1: Create main process entry**

Create `src/main/index.ts`:

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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
    trafficLightPosition: { x: 15, y: 15 }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 2: Create preload script**

Create `src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Terminal operations
  spawnTerminal: (repoPath: string) =>
    ipcRenderer.invoke('terminal:spawn', repoPath),
  writeTerminal: (terminalId: string, data: string) =>
    ipcRenderer.invoke('terminal:write', terminalId, data),
  killTerminal: (terminalId: string) =>
    ipcRenderer.invoke('terminal:kill', terminalId),
  onTerminalOutput: (callback: (terminalId: string, data: string) => void) => {
    ipcRenderer.on('terminal:output', (_, terminalId, data) => callback(terminalId, data))
  },
  onTerminalExit: (callback: (terminalId: string, code: number) => void) => {
    ipcRenderer.on('terminal:exit', (_, terminalId, code) => callback(terminalId, code))
  },

  // Repository operations
  getRepos: () => ipcRenderer.invoke('repos:list'),
  getRepoFiles: (repoPath: string) => ipcRenderer.invoke('repos:files', repoPath),

  // Git operations
  getCommits: (repoPath: string, branch?: string) =>
    ipcRenderer.invoke('git:commits', repoPath, branch),
  getBranches: (repoPath: string) =>
    ipcRenderer.invoke('git:branches', repoPath),

  // Config operations
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke('config:set', config),
  getUIState: () => ipcRenderer.invoke('ui-state:get'),
  setUIState: (state: Record<string, unknown>) =>
    ipcRenderer.invoke('ui-state:set', state)
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
```

**Step 3: Create renderer entry**

Create `src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Orchestrator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

Create `src/renderer/index.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Create `src/renderer/App.tsx`:

```typescript
export default function App() {
  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center">
      <h1 className="text-2xl">AI Orchestrator</h1>
    </div>
  )
}
```

**Step 4: Create shared types**

Create `src/shared/types.ts`:

```typescript
export interface Terminal {
  id: string
  repoPath: string
  status: 'idle' | 'running' | 'completed' | 'error'
  task?: string
  createdAt: Date
}

export interface Repository {
  name: string
  path: string
  isGitRepo: boolean
}

export interface Commit {
  hash: string
  shortHash: string
  message: string
  author: string
  date: Date
}

export interface Branch {
  name: string
  isCurrent: boolean
}

export interface Config {
  projectsRoot: string
  maxTerminals: number
  theme: 'dark' | 'light'
}

export interface UIState {
  openTabs: string[]
  activeTab: string | null
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
}

export interface WorkLog {
  id: string
  repo: string
  task: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'error'
  output: string
}
```

Create `src/shared/constants.ts`:

```typescript
export const DEFAULT_CONFIG = {
  projectsRoot: '~/Desktop/AiApps',
  maxTerminals: 12,
  theme: 'dark' as const
}

export const DEFAULT_UI_STATE = {
  openTabs: [],
  activeTab: null,
  leftSidebarOpen: true,
  rightSidebarOpen: false
}

export const QUICK_ACTIONS = [
  { id: 'test', label: 'Run Tests', command: 'npm test' },
  { id: 'install', label: 'Install Deps', command: 'npm install' },
  { id: 'pull', label: 'Git Pull', command: 'git pull' },
  { id: 'terminal', label: 'New Terminal', command: null }
]
```

**Step 5: Verify structure**

```bash
ls -la src/main src/preload src/renderer src/shared
```

Expected: All directories and files exist

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add project structure with main, preload, renderer, shared"
```

---

### Task 1.3: Setup Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/renderer/styles/globals.css`

**Step 1: Install Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure Tailwind**

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d1117',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#21262d',
        'border-primary': '#30363d',
        'text-primary': '#c9d1d9',
        'text-secondary': '#8b949e',
        'accent': '#58a6ff'
      }
    }
  },
  plugins: []
}
```

**Step 3: Create global styles**

Create `src/renderer/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  background-color: #0d1117;
  color: #c9d1d9;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #161b22;
}

::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
```

**Step 4: Verify Tailwind works**

Update `src/renderer/App.tsx`:

```typescript
export default function App() {
  return (
    <div className="h-screen w-screen bg-bg-primary text-text-primary flex items-center justify-center">
      <div className="bg-bg-secondary p-8 rounded-lg border border-border-primary">
        <h1 className="text-2xl font-bold text-accent">AI Orchestrator</h1>
        <p className="text-text-secondary mt-2">Ready to build!</p>
      </div>
    </div>
  )
}
```

**Step 5: Run and verify**

```bash
npm run dev
```

Expected: Styled component visible with custom colors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: setup Tailwind CSS with custom color palette"
```

---

### Task 1.4: Setup Zustand Store

**Files:**
- Create: `src/renderer/stores/useAppStore.ts`
- Create: `src/renderer/stores/useTerminalStore.ts`
- Create: `src/renderer/stores/useRepoStore.ts`

**Step 1: Install Zustand**

```bash
npm install zustand
```

**Step 2: Create app store**

Create `src/renderer/stores/useAppStore.ts`:

```typescript
import { create } from 'zustand'
import type { UIState } from '../../shared/types'
import { DEFAULT_UI_STATE } from '../../shared/constants'

interface AppState extends UIState {
  setActiveTab: (tab: string | null) => void
  openTab: (repoName: string) => void
  closeTab: (repoName: string) => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  loadUIState: () => Promise<void>
  saveUIState: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ...DEFAULT_UI_STATE,

  setActiveTab: (tab) => {
    set({ activeTab: tab })
    get().saveUIState()
  },

  openTab: (repoName) => {
    const { openTabs } = get()
    if (!openTabs.includes(repoName)) {
      set({ openTabs: [...openTabs, repoName], activeTab: repoName })
      get().saveUIState()
    } else {
      set({ activeTab: repoName })
    }
  },

  closeTab: (repoName) => {
    const { openTabs, activeTab } = get()
    const newTabs = openTabs.filter((t) => t !== repoName)
    const newActive = activeTab === repoName
      ? newTabs[newTabs.length - 1] || null
      : activeTab
    set({ openTabs: newTabs, activeTab: newActive })
    get().saveUIState()
  },

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }))
    get().saveUIState()
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }))
    get().saveUIState()
  },

  loadUIState: async () => {
    try {
      const state = await window.api.getUIState()
      if (state) {
        set(state)
      }
    } catch (error) {
      console.error('Failed to load UI state:', error)
    }
  },

  saveUIState: async () => {
    const { openTabs, activeTab, leftSidebarOpen, rightSidebarOpen } = get()
    try {
      await window.api.setUIState({ openTabs, activeTab, leftSidebarOpen, rightSidebarOpen })
    } catch (error) {
      console.error('Failed to save UI state:', error)
    }
  }
}))
```

**Step 3: Create terminal store**

Create `src/renderer/stores/useTerminalStore.ts`:

```typescript
import { create } from 'zustand'
import type { Terminal } from '../../shared/types'

interface TerminalState {
  terminals: Map<string, Terminal>
  outputs: Map<string, string>
  activeTerminalId: string | null

  addTerminal: (terminal: Terminal) => void
  removeTerminal: (id: string) => void
  updateTerminal: (id: string, updates: Partial<Terminal>) => void
  appendOutput: (id: string, data: string) => void
  setActiveTerminal: (id: string | null) => void
  getTerminalsByRepo: (repoPath: string) => Terminal[]
  getTerminalCount: () => number
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  outputs: new Map(),
  activeTerminalId: null,

  addTerminal: (terminal) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      newTerminals.set(terminal.id, terminal)
      const newOutputs = new Map(state.outputs)
      newOutputs.set(terminal.id, '')
      return { terminals: newTerminals, outputs: newOutputs, activeTerminalId: terminal.id }
    })
  },

  removeTerminal: (id) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      newTerminals.delete(id)
      const newOutputs = new Map(state.outputs)
      newOutputs.delete(id)
      const newActive = state.activeTerminalId === id
        ? Array.from(newTerminals.keys())[0] || null
        : state.activeTerminalId
      return { terminals: newTerminals, outputs: newOutputs, activeTerminalId: newActive }
    })
  },

  updateTerminal: (id, updates) => {
    set((state) => {
      const newTerminals = new Map(state.terminals)
      const terminal = newTerminals.get(id)
      if (terminal) {
        newTerminals.set(id, { ...terminal, ...updates })
      }
      return { terminals: newTerminals }
    })
  },

  appendOutput: (id, data) => {
    set((state) => {
      const newOutputs = new Map(state.outputs)
      const current = newOutputs.get(id) || ''
      newOutputs.set(id, current + data)
      return { outputs: newOutputs }
    })
  },

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  getTerminalsByRepo: (repoPath) => {
    return Array.from(get().terminals.values()).filter((t) => t.repoPath === repoPath)
  },

  getTerminalCount: () => get().terminals.size
}))
```

**Step 4: Create repo store**

Create `src/renderer/stores/useRepoStore.ts`:

```typescript
import { create } from 'zustand'
import type { Repository, Commit, Branch } from '../../shared/types'

interface RepoState {
  repos: Repository[]
  commits: Map<string, Commit[]>
  branches: Map<string, Branch[]>

  loadRepos: () => Promise<void>
  loadCommits: (repoPath: string, branch?: string) => Promise<void>
  loadBranches: (repoPath: string) => Promise<void>
  getRepoByName: (name: string) => Repository | undefined
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  commits: new Map(),
  branches: new Map(),

  loadRepos: async () => {
    try {
      const repos = await window.api.getRepos()
      set({ repos })
    } catch (error) {
      console.error('Failed to load repos:', error)
    }
  },

  loadCommits: async (repoPath, branch) => {
    try {
      const commits = await window.api.getCommits(repoPath, branch)
      set((state) => {
        const newCommits = new Map(state.commits)
        newCommits.set(repoPath, commits)
        return { commits: newCommits }
      })
    } catch (error) {
      console.error('Failed to load commits:', error)
    }
  },

  loadBranches: async (repoPath) => {
    try {
      const branches = await window.api.getBranches(repoPath)
      set((state) => {
        const newBranches = new Map(state.branches)
        newBranches.set(repoPath, branches)
        return { branches: newBranches }
      })
    } catch (error) {
      console.error('Failed to load branches:', error)
    }
  },

  getRepoByName: (name) => {
    return get().repos.find((r) => r.name === name)
  }
}))
```

**Step 5: Add window.api type declaration**

Create `src/renderer/types/global.d.ts`:

```typescript
import type { ApiType } from '../../preload/index'

declare global {
  interface Window {
    api: ApiType
  }
}

export {}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: setup Zustand stores for app, terminal, and repo state"
```

---

## Phase 2: Main Process & IPC Handlers

### Task 2.1: Terminal Manager with node-pty

**Files:**
- Create: `src/main/terminal/TerminalManager.ts`
- Create: `src/main/terminal/types.ts`

**Step 1: Install node-pty**

```bash
npm install node-pty
npm install -D @types/node
```

**Step 2: Create terminal types**

Create `src/main/terminal/types.ts`:

```typescript
import type { IPty } from 'node-pty'

export interface ManagedTerminal {
  id: string
  pty: IPty
  repoPath: string
  createdAt: Date
}
```

**Step 3: Create TerminalManager**

Create `src/main/terminal/TerminalManager.ts`:

```typescript
import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { ManagedTerminal } from './types'

export class TerminalManager {
  private terminals: Map<string, ManagedTerminal> = new Map()
  private maxTerminals: number

  constructor(maxTerminals: number = 12) {
    this.maxTerminals = maxTerminals
  }

  spawn(repoPath: string, window: BrowserWindow): string | null {
    if (this.terminals.size >= this.maxTerminals) {
      console.error(`Max terminals (${this.maxTerminals}) reached`)
      return null
    }

    const id = uuidv4()
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'zsh'

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: repoPath,
      env: process.env as Record<string, string>
    })

    const terminal: ManagedTerminal = {
      id,
      pty: ptyProcess,
      repoPath,
      createdAt: new Date()
    }

    ptyProcess.onData((data) => {
      window.webContents.send('terminal:output', id, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      window.webContents.send('terminal:exit', id, exitCode)
      this.terminals.delete(id)
    })

    this.terminals.set(id, terminal)

    // Auto-start Claude CLI
    ptyProcess.write('claude\r')

    return id
  }

  write(terminalId: string, data: string): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.write(data)
    return true
  }

  resize(terminalId: string, cols: number, rows: number): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.resize(cols, rows)
    return true
  }

  kill(terminalId: string): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return false
    terminal.pty.kill()
    this.terminals.delete(terminalId)
    return true
  }

  killAll(): void {
    for (const terminal of this.terminals.values()) {
      terminal.pty.kill()
    }
    this.terminals.clear()
  }

  getCount(): number {
    return this.terminals.size
  }

  setMaxTerminals(max: number): void {
    this.maxTerminals = max
  }
}
```

**Step 4: Install uuid**

```bash
npm install uuid
npm install -D @types/uuid
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TerminalManager with node-pty for Claude CLI spawning"
```

---

### Task 2.2: Repository Manager

**Files:**
- Create: `src/main/repo/RepoManager.ts`

**Step 1: Install simple-git**

```bash
npm install simple-git
```

**Step 2: Create RepoManager**

Create `src/main/repo/RepoManager.ts`:

```typescript
import { simpleGit, SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Repository, Commit, Branch } from '../../shared/types'

export class RepoManager {
  private projectsRoot: string

  constructor(projectsRoot: string) {
    this.projectsRoot = this.expandPath(projectsRoot)
  }

  private expandPath(p: string): string {
    if (p.startsWith('~')) {
      return path.join(os.homedir(), p.slice(1))
    }
    return p
  }

  async listRepos(): Promise<Repository[]> {
    const repos: Repository[] = []

    if (!fs.existsSync(this.projectsRoot)) {
      console.warn(`Projects root does not exist: ${this.projectsRoot}`)
      return repos
    }

    const entries = fs.readdirSync(this.projectsRoot, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(this.projectsRoot, entry.name)
      const gitPath = path.join(fullPath, '.git')
      const isGitRepo = fs.existsSync(gitPath)

      repos.push({
        name: entry.name,
        path: fullPath,
        isGitRepo
      })
    }

    return repos
  }

  async getFiles(repoPath: string): Promise<string[]> {
    const files: string[] = []
    const expandedPath = this.expandPath(repoPath)

    const readDir = (dir: string, prefix: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        if (entry.name === 'node_modules') continue

        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          files.push(relativePath + '/')
          readDir(path.join(dir, entry.name), relativePath)
        } else {
          files.push(relativePath)
        }
      }
    }

    readDir(expandedPath)
    return files.slice(0, 100) // Limit for performance
  }

  async getCommits(repoPath: string, branch?: string): Promise<Commit[]> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      const log = await git.log({
        maxCount: 50,
        ...(branch && { from: branch })
      })

      return log.all.map((commit) => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date)
      }))
    } catch (error) {
      console.error('Failed to get commits:', error)
      return []
    }
  }

  async getBranches(repoPath: string): Promise<Branch[]> {
    const git: SimpleGit = simpleGit(this.expandPath(repoPath))

    try {
      const summary = await git.branchLocal()

      return summary.all.map((name) => ({
        name,
        isCurrent: name === summary.current
      }))
    } catch (error) {
      console.error('Failed to get branches:', error)
      return []
    }
  }

  setProjectsRoot(root: string): void {
    this.projectsRoot = this.expandPath(root)
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add RepoManager with simple-git for repo discovery and git operations"
```

---

### Task 2.3: Config Manager

**Files:**
- Create: `src/main/config/ConfigManager.ts`

**Step 1: Create ConfigManager**

Create `src/main/config/ConfigManager.ts`:

```typescript
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Config, UIState, WorkLog } from '../../shared/types'
import { DEFAULT_CONFIG, DEFAULT_UI_STATE } from '../../shared/constants'

export class ConfigManager {
  private configDir: string
  private configPath: string
  private uiStatePath: string
  private workLogsDir: string

  constructor() {
    this.configDir = path.join(os.homedir(), '.ai-orchestrator')
    this.configPath = path.join(this.configDir, 'config.json')
    this.uiStatePath = path.join(this.configDir, 'ui-state.json')
    this.workLogsDir = path.join(this.configDir, 'work-logs')
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true })
    }
    if (!fs.existsSync(this.workLogsDir)) {
      fs.mkdirSync(this.workLogsDir, { recursive: true })
    }
  }

  getConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('Failed to read config:', error)
    }
    return DEFAULT_CONFIG
  }

  setConfig(config: Partial<Config>): void {
    const current = this.getConfig()
    const updated = { ...current, ...config }
    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2))
  }

  getUIState(): UIState {
    try {
      if (fs.existsSync(this.uiStatePath)) {
        const data = fs.readFileSync(this.uiStatePath, 'utf-8')
        return { ...DEFAULT_UI_STATE, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('Failed to read UI state:', error)
    }
    return DEFAULT_UI_STATE
  }

  setUIState(state: Partial<UIState>): void {
    const current = this.getUIState()
    const updated = { ...current, ...state }
    fs.writeFileSync(this.uiStatePath, JSON.stringify(updated, null, 2))
  }

  saveWorkLog(log: WorkLog): void {
    const date = new Date().toISOString().split('T')[0]
    const dayDir = path.join(this.workLogsDir, date)

    if (!fs.existsSync(dayDir)) {
      fs.mkdirSync(dayDir, { recursive: true })
    }

    const filename = `${log.repo}_${log.id}.json`
    const filepath = path.join(dayDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(log, null, 2))
  }

  getWorkLogs(date?: string): WorkLog[] {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const dayDir = path.join(this.workLogsDir, targetDate)

    if (!fs.existsSync(dayDir)) {
      return []
    }

    const files = fs.readdirSync(dayDir).filter((f) => f.endsWith('.json'))
    const logs: WorkLog[] = []

    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(dayDir, file), 'utf-8')
        logs.push(JSON.parse(data))
      } catch (error) {
        console.error(`Failed to read work log ${file}:`, error)
      }
    }

    return logs
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add ConfigManager for config, UI state, and work logs persistence"
```

---

### Task 2.4: Setup IPC Handlers

**Files:**
- Create: `src/main/ipc/handlers.ts`
- Modify: `src/main/index.ts`

**Step 1: Create IPC handlers**

Create `src/main/ipc/handlers.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import { TerminalManager } from '../terminal/TerminalManager'
import { RepoManager } from '../repo/RepoManager'
import { ConfigManager } from '../config/ConfigManager'

export function setupIpcHandlers(window: BrowserWindow): void {
  const configManager = new ConfigManager()
  const config = configManager.getConfig()
  const terminalManager = new TerminalManager(config.maxTerminals)
  const repoManager = new RepoManager(config.projectsRoot)

  // Terminal handlers
  ipcMain.handle('terminal:spawn', async (_, repoPath: string) => {
    return terminalManager.spawn(repoPath, window)
  })

  ipcMain.handle('terminal:write', async (_, terminalId: string, data: string) => {
    return terminalManager.write(terminalId, data)
  })

  ipcMain.handle('terminal:kill', async (_, terminalId: string) => {
    return terminalManager.kill(terminalId)
  })

  ipcMain.handle('terminal:resize', async (_, terminalId: string, cols: number, rows: number) => {
    return terminalManager.resize(terminalId, cols, rows)
  })

  // Repository handlers
  ipcMain.handle('repos:list', async () => {
    return repoManager.listRepos()
  })

  ipcMain.handle('repos:files', async (_, repoPath: string) => {
    return repoManager.getFiles(repoPath)
  })

  // Git handlers
  ipcMain.handle('git:commits', async (_, repoPath: string, branch?: string) => {
    return repoManager.getCommits(repoPath, branch)
  })

  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    return repoManager.getBranches(repoPath)
  })

  // Config handlers
  ipcMain.handle('config:get', async () => {
    return configManager.getConfig()
  })

  ipcMain.handle('config:set', async (_, newConfig: Record<string, unknown>) => {
    configManager.setConfig(newConfig)

    // Update managers with new config
    if (newConfig.maxTerminals) {
      terminalManager.setMaxTerminals(newConfig.maxTerminals as number)
    }
    if (newConfig.projectsRoot) {
      repoManager.setProjectsRoot(newConfig.projectsRoot as string)
    }

    return true
  })

  // UI State handlers
  ipcMain.handle('ui-state:get', async () => {
    return configManager.getUIState()
  })

  ipcMain.handle('ui-state:set', async (_, state: Record<string, unknown>) => {
    configManager.setUIState(state)
    return true
  })

  // Cleanup on window close
  window.on('close', () => {
    terminalManager.killAll()
  })
}
```

**Step 2: Update main/index.ts**

Update `src/main/index.ts`:

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc/handlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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
    trafficLightPosition: { x: 15, y: 15 }
  })

  setupIpcHandlers(mainWindow)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 3: Verify app starts**

```bash
npm run dev
```

Expected: App starts without errors

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: setup IPC handlers connecting terminal, repo, and config managers"
```

---

## Phase 3: UI Components

### Task 3.1: Layout Shell

**Files:**
- Create: `src/renderer/components/Layout/Layout.tsx`
- Create: `src/renderer/components/Layout/index.ts`
- Modify: `src/renderer/App.tsx`

**Step 1: Create Layout component**

Create `src/renderer/components/Layout/Layout.tsx`:

```typescript
import { useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'

export default function Layout() {
  const { leftSidebarOpen, rightSidebarOpen, loadUIState } = useAppStore()

  useEffect(() => {
    loadUIState()
  }, [loadUIState])

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {leftSidebarOpen && (
          <aside className="w-64 border-r border-border-primary bg-bg-secondary flex-shrink-0">
            <LeftSidebar />
          </aside>
        )}

        <main className="flex-1 overflow-hidden">
          <TerminalPanel />
        </main>

        {rightSidebarOpen && (
          <aside className="w-72 border-l border-border-primary bg-bg-secondary flex-shrink-0">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
```

Create `src/renderer/components/Layout/index.ts`:

```typescript
export { default } from './Layout'
```

**Step 2: Create placeholder components**

Create `src/renderer/components/Header/Header.tsx`:

```typescript
import { useAppStore } from '../../stores/useAppStore'

export default function Header() {
  const { toggleLeftSidebar, toggleRightSidebar } = useAppStore()

  return (
    <header className="h-12 border-b border-border-primary bg-bg-secondary flex items-center px-4 gap-4">
      <button
        onClick={toggleLeftSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
      >
        ☰
      </button>

      <span className="font-semibold text-text-primary">AI Orchestrator</span>

      <div className="flex-1 flex items-center gap-2">
        {/* Repo tabs will go here */}
      </div>

      <button
        onClick={toggleRightSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
      >
        🌿
      </button>

      <button className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary">
        ⚙
      </button>
    </header>
  )
}
```

Create `src/renderer/components/Header/index.ts`:

```typescript
export { default } from './Header'
```

Create `src/renderer/components/LeftSidebar/LeftSidebar.tsx`:

```typescript
export default function LeftSidebar() {
  return (
    <div className="p-4 text-text-secondary">
      <p>Left Sidebar</p>
    </div>
  )
}
```

Create `src/renderer/components/LeftSidebar/index.ts`:

```typescript
export { default } from './LeftSidebar'
```

Create `src/renderer/components/RightSidebar/RightSidebar.tsx`:

```typescript
export default function RightSidebar() {
  return (
    <div className="p-4 text-text-secondary">
      <p>Commit Tree</p>
    </div>
  )
}
```

Create `src/renderer/components/RightSidebar/index.ts`:

```typescript
export { default } from './RightSidebar'
```

Create `src/renderer/components/TerminalPanel/TerminalPanel.tsx`:

```typescript
export default function TerminalPanel() {
  return (
    <div className="h-full flex items-center justify-center text-text-secondary">
      <p>Terminal Panel</p>
    </div>
  )
}
```

Create `src/renderer/components/TerminalPanel/index.ts`:

```typescript
export { default } from './TerminalPanel'
```

**Step 3: Update App.tsx**

Update `src/renderer/App.tsx`:

```typescript
import Layout from './components/Layout'

export default function App() {
  return <Layout />
}
```

**Step 4: Verify layout works**

```bash
npm run dev
```

Expected: Layout with header and collapsible sidebars

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Layout shell with Header and collapsible sidebars"
```

---

### Task 3.2: Header with Repo Tabs

**Files:**
- Modify: `src/renderer/components/Header/Header.tsx`
- Create: `src/renderer/components/Header/RepoTab.tsx`
- Create: `src/renderer/components/Header/RepoSelector.tsx`

**Step 1: Create RepoTab component**

Create `src/renderer/components/Header/RepoTab.tsx`:

```typescript
interface RepoTabProps {
  name: string
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

export default function RepoTab({ name, isActive, onClick, onClose }: RepoTabProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer
        border border-b-0 border-border-primary
        ${isActive
          ? 'bg-bg-primary text-text-primary'
          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
        }
      `}
    >
      <span className="text-sm truncate max-w-32">{name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="text-text-secondary hover:text-text-primary text-xs"
      >
        ✕
      </button>
    </div>
  )
}
```

**Step 2: Create RepoSelector component**

Create `src/renderer/components/Header/RepoSelector.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react'
import { useRepoStore } from '../../stores/useRepoStore'
import { useAppStore } from '../../stores/useAppStore'

export default function RepoSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { repos, loadRepos } = useRepoStore()
  const { openTabs, openTab } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const availableRepos = repos.filter((r) => !openTabs.includes(r.name))

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded border border-border-primary text-sm"
      >
        +
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border-primary rounded shadow-lg z-50">
          {availableRepos.length === 0 ? (
            <div className="px-3 py-2 text-text-secondary text-sm">
              No more repos available
            </div>
          ) : (
            availableRepos.map((repo) => (
              <button
                key={repo.path}
                onClick={() => {
                  openTab(repo.name)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
              >
                {repo.isGitRepo && <span className="text-accent">●</span>}
                {repo.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Update Header component**

Update `src/renderer/components/Header/Header.tsx`:

```typescript
import { useAppStore } from '../../stores/useAppStore'
import RepoTab from './RepoTab'
import RepoSelector from './RepoSelector'

export default function Header() {
  const {
    openTabs,
    activeTab,
    setActiveTab,
    closeTab,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore()

  return (
    <header className="h-12 border-b border-border-primary bg-bg-secondary flex items-center px-4 gap-4">
      <button
        onClick={toggleLeftSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Toggle sidebar"
      >
        ☰
      </button>

      <span className="font-semibold text-text-primary">AI Orchestrator</span>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {openTabs.map((tab) => (
          <RepoTab
            key={tab}
            name={tab}
            isActive={tab === activeTab}
            onClick={() => setActiveTab(tab)}
            onClose={() => closeTab(tab)}
          />
        ))}
        <RepoSelector />
      </div>

      <button
        onClick={toggleRightSidebar}
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Toggle commits"
      >
        🌿
      </button>

      <button
        className="p-2 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        title="Settings"
      >
        ⚙
      </button>
    </header>
  )
}
```

**Step 4: Verify tabs work**

```bash
npm run dev
```

Expected: Can add/remove repo tabs, tabs are clickable

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Header with repo tabs and repo selector dropdown"
```

---

### Task 3.3: Terminal Component with xterm.js

**Files:**
- Create: `src/renderer/components/Terminal/Terminal.tsx`
- Create: `src/renderer/components/Terminal/index.ts`

**Step 1: Install xterm dependencies**

```bash
npm install @xterm/xterm @xterm/addon-fit react-xtermjs
```

**Step 2: Create Terminal component**

Create `src/renderer/components/Terminal/Terminal.tsx`:

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useTerminalStore } from '../../stores/useTerminalStore'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string
  onClose: () => void
}

export default function Terminal({ terminalId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const { terminals, outputs, updateTerminal, setActiveTerminal } = useTerminalStore()
  const terminal = terminals.get(terminalId)
  const output = outputs.get(terminalId) || ''

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = xtermRef.current
      window.api.writeTerminal(terminalId, `\x1b[8;${rows};${cols}t`)
    }
  }, [terminalId])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4'
      },
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block'
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Handle user input
    xterm.onData((data) => {
      window.api.writeTerminal(terminalId, data)
    })

    // Write existing output
    if (output) {
      xterm.write(output)
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [terminalId, handleResize])

  // Write new output
  useEffect(() => {
    if (xtermRef.current && output) {
      // Only write the new content
      const currentContent = xtermRef.current.buffer.active.length
      if (currentContent === 0) {
        xtermRef.current.write(output)
      }
    }
  }, [output])

  // Listen for terminal output
  useEffect(() => {
    const handleOutput = (id: string, data: string) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(data)
      }
    }

    const handleExit = (id: string, code: number) => {
      if (id === terminalId) {
        updateTerminal(terminalId, {
          status: code === 0 ? 'completed' : 'error'
        })
      }
    }

    window.api.onTerminalOutput(handleOutput)
    window.api.onTerminalExit(handleExit)
  }, [terminalId, updateTerminal])

  return (
    <div
      className="h-full flex flex-col bg-bg-primary border border-border-primary rounded overflow-hidden"
      onClick={() => setActiveTerminal(terminalId)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border-primary">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            terminal?.status === 'running' ? 'bg-green-500' :
            terminal?.status === 'completed' ? 'bg-blue-500' :
            terminal?.status === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-sm text-text-primary truncate">
            {terminal?.task || 'Terminal'}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          ✕
        </button>
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}
```

Create `src/renderer/components/Terminal/index.ts`:

```typescript
export { default } from './Terminal'
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Terminal component with xterm.js integration"
```

---

### Task 3.4: Terminal Panel with Grid Layout

**Files:**
- Modify: `src/renderer/components/TerminalPanel/TerminalPanel.tsx`

**Step 1: Update TerminalPanel**

Update `src/renderer/components/TerminalPanel/TerminalPanel.tsx`:

```typescript
import { useEffect, useCallback } from 'react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Terminal from '../Terminal'
import { DEFAULT_CONFIG } from '../../../shared/constants'

export default function TerminalPanel() {
  const { terminals, addTerminal, removeTerminal, getTerminalCount } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  const handleNewTerminal = useCallback(async () => {
    if (!activeRepo) return
    if (getTerminalCount() >= DEFAULT_CONFIG.maxTerminals) {
      alert(`Maximum ${DEFAULT_CONFIG.maxTerminals} terminals allowed`)
      return
    }

    const terminalId = await window.api.spawnTerminal(activeRepo.path)
    if (terminalId) {
      addTerminal({
        id: terminalId,
        repoPath: activeRepo.path,
        status: 'running',
        createdAt: new Date()
      })
    }
  }, [activeRepo, addTerminal, getTerminalCount])

  const handleCloseTerminal = useCallback(async (terminalId: string) => {
    await window.api.killTerminal(terminalId)
    removeTerminal(terminalId)
  }, [removeTerminal])

  // Calculate grid columns based on terminal count
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1'
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 6) return 'grid-cols-3'
    return 'grid-cols-4'
  }

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <p className="text-lg mb-2">No repository selected</p>
        <p className="text-sm">Select a repository from the header to get started</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-medium">
          Terminals ({repoTerminals.length}/{DEFAULT_CONFIG.maxTerminals})
        </h2>
        <button
          onClick={handleNewTerminal}
          className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-blue-600"
        >
          + New Terminal
        </button>
      </div>

      {repoTerminals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border-primary rounded">
          <div className="text-center text-text-secondary">
            <p className="mb-2">No terminals open</p>
            <button
              onClick={handleNewTerminal}
              className="text-accent hover:underline"
            >
              Create your first terminal
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex-1 grid ${getGridCols(repoTerminals.length)} gap-4`}>
          {repoTerminals.map((terminal) => (
            <Terminal
              key={terminal.id}
              terminalId={terminal.id}
              onClose={() => handleCloseTerminal(terminal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify terminal panel works**

```bash
npm run dev
```

Expected: Can create terminals, terminals appear in grid

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add TerminalPanel with grid layout and terminal management"
```

---

### Task 3.5: Left Sidebar - Sessions & Quick Actions

**Files:**
- Modify: `src/renderer/components/LeftSidebar/LeftSidebar.tsx`
- Create: `src/renderer/components/LeftSidebar/SessionList.tsx`
- Create: `src/renderer/components/LeftSidebar/QuickActions.tsx`
- Create: `src/renderer/components/LeftSidebar/ProjectContext.tsx`

**Step 1: Create SessionList**

Create `src/renderer/components/LeftSidebar/SessionList.tsx`:

```typescript
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function SessionList() {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoTerminals = activeRepo
    ? Array.from(terminals.values()).filter(t => t.repoPath === activeRepo.path)
    : []

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
        Sessions
      </h3>
      {repoTerminals.length === 0 ? (
        <p className="text-text-secondary text-sm px-2">No active sessions</p>
      ) : (
        <ul className="space-y-1">
          {repoTerminals.map((terminal) => (
            <li key={terminal.id}>
              <button
                onClick={() => setActiveTerminal(terminal.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                  activeTerminalId === terminal.id
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  terminal.status === 'running' ? 'bg-green-500' :
                  terminal.status === 'completed' ? 'bg-blue-500' :
                  terminal.status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <span className="truncate">
                  {terminal.task || `Terminal ${terminal.id.slice(0, 6)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**Step 2: Create QuickActions**

Create `src/renderer/components/LeftSidebar/QuickActions.tsx`:

```typescript
import { QUICK_ACTIONS } from '../../../shared/constants'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function QuickActions() {
  const { addTerminal, getTerminalCount } = useTerminalStore()
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  const handleAction = async (action: typeof QUICK_ACTIONS[number]) => {
    if (!activeRepo) return

    if (action.command === null) {
      // New terminal action
      const terminalId = await window.api.spawnTerminal(activeRepo.path)
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          task: 'New Terminal',
          createdAt: new Date()
        })
      }
    } else {
      // Run command in new terminal
      const terminalId = await window.api.spawnTerminal(activeRepo.path)
      if (terminalId) {
        addTerminal({
          id: terminalId,
          repoPath: activeRepo.path,
          status: 'running',
          task: action.label,
          createdAt: new Date()
        })
        // Send command after short delay to let shell initialize
        setTimeout(() => {
          window.api.writeTerminal(terminalId, action.command + '\r')
        }, 500)
      }
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
        Quick Actions
      </h3>
      <div className="space-y-1">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={!activeRepo}
            className="w-full text-left px-2 py-1.5 rounded text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Create ProjectContext**

Create `src/renderer/components/LeftSidebar/ProjectContext.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'

export default function ProjectContext() {
  const [files, setFiles] = useState<string[]>([])
  const [expanded, setExpanded] = useState(true)
  const { activeTab } = useAppStore()
  const { getRepoByName } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null

  useEffect(() => {
    if (activeRepo) {
      window.api.getRepoFiles(activeRepo.path).then(setFiles)
    } else {
      setFiles([])
    }
  }, [activeRepo])

  const directories = files.filter(f => f.endsWith('/'))
  const regularFiles = files.filter(f => !f.endsWith('/'))

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 flex items-center gap-1"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        Project Context
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto">
          {!activeRepo ? (
            <p className="text-text-secondary text-sm px-2">No repo selected</p>
          ) : files.length === 0 ? (
            <p className="text-text-secondary text-sm px-2">Loading...</p>
          ) : (
            <ul className="text-sm space-y-0.5">
              {directories.slice(0, 10).map((file) => (
                <li key={file} className="px-2 text-text-secondary flex items-center gap-1">
                  <span>📁</span>
                  <span className="truncate">{file}</span>
                </li>
              ))}
              {regularFiles.slice(0, 10).map((file) => (
                <li key={file} className="px-2 text-text-secondary flex items-center gap-1">
                  <span>📄</span>
                  <span className="truncate">{file}</span>
                </li>
              ))}
              {files.length > 20 && (
                <li className="px-2 text-text-secondary text-xs">
                  ... and {files.length - 20} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Update LeftSidebar**

Update `src/renderer/components/LeftSidebar/LeftSidebar.tsx`:

```typescript
import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  return (
    <div className="h-full flex flex-col p-2 overflow-y-auto">
      <SessionList />
      <ProjectContext />
      <QuickActions />
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add LeftSidebar with Sessions, ProjectContext, and QuickActions"
```

---

### Task 3.6: Right Sidebar - Commit Tree

**Files:**
- Modify: `src/renderer/components/RightSidebar/RightSidebar.tsx`
- Create: `src/renderer/components/RightSidebar/CommitTree.tsx`
- Create: `src/renderer/components/RightSidebar/BranchSection.tsx`

**Step 1: Create BranchSection**

Create `src/renderer/components/RightSidebar/BranchSection.tsx`:

```typescript
import { useState } from 'react'
import type { Commit, Branch } from '../../../shared/types'

interface BranchSectionProps {
  branch: Branch
  commits: Commit[]
  isExpanded: boolean
  onToggle: () => void
}

export default function BranchSection({ branch, commits, isExpanded, onToggle }: BranchSectionProps) {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full text-left px-2 py-1 flex items-center gap-2 text-sm hover:bg-bg-tertiary rounded"
      >
        <span className="text-text-secondary">{isExpanded ? '▼' : '▶'}</span>
        <span className={branch.isCurrent ? 'text-accent font-medium' : 'text-text-primary'}>
          {branch.name}
        </span>
        {branch.isCurrent && (
          <span className="text-xs text-accent">(current)</span>
        )}
      </button>

      {isExpanded && (
        <div className="ml-4 border-l border-border-primary">
          {commits.map((commit, index) => (
            <div
              key={commit.hash}
              className="relative pl-4 py-1.5 hover:bg-bg-tertiary cursor-pointer group"
            >
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
                index === 0 && branch.isCurrent ? 'bg-accent' : 'bg-border-primary'
              }`} />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-mono">{commit.shortHash}</span>
                  {index === 0 && branch.isCurrent && (
                    <span className="text-text-secondary">(HEAD)</span>
                  )}
                </div>
                <p className="text-text-primary truncate">{commit.message}</p>
                <p className="text-text-secondary">{formatDate(commit.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create CommitTree**

Create `src/renderer/components/RightSidebar/CommitTree.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import BranchSection from './BranchSection'

export default function CommitTree() {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const { activeTab } = useAppStore()
  const { getRepoByName, branches, commits, loadBranches, loadCommits } = useRepoStore()

  const activeRepo = activeTab ? getRepoByName(activeTab) : null
  const repoBranches = activeRepo ? branches.get(activeRepo.path) || [] : []
  const repoCommits = activeRepo ? commits.get(activeRepo.path) || [] : []

  useEffect(() => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
      loadCommits(activeRepo.path)

      // Auto-expand current branch
      const currentBranch = repoBranches.find(b => b.isCurrent)
      if (currentBranch) {
        setExpandedBranches(new Set([currentBranch.name]))
      }
    }
  }, [activeRepo?.path])

  const toggleBranch = (branchName: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev)
      if (next.has(branchName)) {
        next.delete(branchName)
      } else {
        next.add(branchName)
      }
      return next
    })
  }

  const handleRefresh = () => {
    if (activeRepo) {
      loadBranches(activeRepo.path)
      loadCommits(activeRepo.path)
    }
  }

  if (!activeRepo) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        Select a repository to view commits
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border-primary">
        <h3 className="text-sm font-medium text-text-primary">Commits</h3>
        <button
          onClick={handleRefresh}
          className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {repoBranches.length === 0 ? (
          <p className="text-text-secondary text-sm">Loading...</p>
        ) : (
          repoBranches.map((branch) => (
            <BranchSection
              key={branch.name}
              branch={branch}
              commits={repoCommits}
              isExpanded={expandedBranches.has(branch.name)}
              onToggle={() => toggleBranch(branch.name)}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 3: Update RightSidebar**

Update `src/renderer/components/RightSidebar/RightSidebar.tsx`:

```typescript
import CommitTree from './CommitTree'

export default function RightSidebar() {
  return <CommitTree />
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add RightSidebar with CommitTree and branch navigation"
```

---

## Phase 4: Final Integration & Polish

### Task 4.1: Error Handling & Loading States

**Files:**
- Create: `src/renderer/components/common/LoadingSpinner.tsx`
- Create: `src/renderer/components/common/ErrorBoundary.tsx`

**Step 1: Create LoadingSpinner**

Create `src/renderer/components/common/LoadingSpinner.tsx`:

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`${sizeClasses[size]} animate-spin`}>
      <svg viewBox="0 0 24 24" fill="none" className="text-accent">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="opacity-25"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
```

**Step 2: Create ErrorBoundary**

Create `src/renderer/components/common/ErrorBoundary.tsx`:

```typescript
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded m-4">
          <h2 className="text-red-400 font-medium mb-2">Something went wrong</h2>
          <p className="text-text-secondary text-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Step 3: Wrap App with ErrorBoundary**

Update `src/renderer/App.tsx`:

```typescript
import Layout from './components/Layout'
import ErrorBoundary from './components/common/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add LoadingSpinner and ErrorBoundary components"
```

---

### Task 4.2: App Initialization & Cleanup

**Files:**
- Modify: `src/renderer/components/Layout/Layout.tsx`

**Step 1: Update Layout with initialization**

Update `src/renderer/components/Layout/Layout.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useRepoStore } from '../../stores/useRepoStore'
import Header from '../Header/Header'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import TerminalPanel from '../TerminalPanel/TerminalPanel'
import LoadingSpinner from '../common/LoadingSpinner'

export default function Layout() {
  const [isInitializing, setIsInitializing] = useState(true)
  const { leftSidebarOpen, rightSidebarOpen, loadUIState } = useAppStore()
  const { loadRepos } = useRepoStore()

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          loadUIState(),
          loadRepos()
        ])
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initialize()
  }, [loadUIState, loadRepos])

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-text-secondary">Initializing AI Orchestrator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {leftSidebarOpen && (
          <aside className="w-64 border-r border-border-primary bg-bg-secondary flex-shrink-0">
            <LeftSidebar />
          </aside>
        )}

        <main className="flex-1 overflow-hidden">
          <TerminalPanel />
        </main>

        {rightSidebarOpen && (
          <aside className="w-72 border-l border-border-primary bg-bg-secondary flex-shrink-0">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add app initialization with loading state"
```

---

### Task 4.3: Final Testing & Verification

**Step 1: Run the application**

```bash
npm run dev
```

**Step 2: Verify all features**

Checklist:
- [ ] App starts without errors
- [ ] Header shows with toggle buttons
- [ ] Can add repo tabs from dropdown
- [ ] Can close repo tabs
- [ ] Left sidebar toggles correctly
- [ ] Right sidebar toggles correctly
- [ ] Sessions list shows active terminals
- [ ] Project Context shows file tree
- [ ] Quick Actions work (create terminals)
- [ ] Terminals spawn and show Claude CLI
- [ ] Can type in terminals
- [ ] Commit tree shows branches and commits
- [ ] UI state persists after restart

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP implementation of AI Orchestrator"
```

---

## Summary

### Completed Features

1. **Project Setup** - Electron + Vite + React + TypeScript
2. **State Management** - Zustand stores for app, terminal, repo
3. **Terminal Management** - node-pty with xterm.js
4. **Git Integration** - simple-git for commits/branches
5. **UI Components** - Header, Sidebars, Terminal Panel
6. **Persistence** - Config, UI state, work logs

### Next Phase (Post-MVP)

1. Atomizer for task breakdown
2. MCP server management
3. Status panel (CPU/RAM)
4. Custom Quick Actions
5. Advanced git operations (checkout, cherry-pick)
6. Diff viewer
