# AI Orchestrator

Birden fazla Claude Code CLI instance'ı yönetmek için Electron tabanlı masaüstü dashboard uygulaması.

## Tech Stack

- **Electron 40** + TypeScript
- **React 19** + Zustand 5 (state management)
- **Tailwind CSS 4** + Framer Motion 12 (animasyonlar)
- **xterm.js 6** + node-pty (terminal emulation)
- **simple-git** (git operations)
- **Vite 7** + electron-vite 5 (bundling)

## Proje Yapısı

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Main entry, BrowserWindow, app menu
│   ├── ipc/
│   │   └── handlers.ts      # All IPC handler registrations
│   ├── action/
│   │   ├── ActionStore.ts   # YAML action loading & file watching
│   │   └── ActionEngine.ts  # Action step execution (write/wait_for/delay)
│   ├── terminal/
│   │   ├── TerminalManager.ts # PTY process spawn/management
│   │   └── types.ts         # ManagedTerminal interface
│   ├── repo/
│   │   └── RepoManager.ts   # simple-git operations
│   ├── config/
│   │   └── ConfigManager.ts # Config & UI state persistence
│   └── notification/
│       └── NotificationManager.ts # Terminal bell & OS notifications
├── preload/                 # Electron preload (contextBridge)
│   ├── index.ts             # window.api exposure
│   └── ipc-utils.ts         # IPC helper utilities
├── renderer/                # React UI
│   ├── App.tsx              # Root component
│   ├── components/
│   │   ├── Header/          # Top bar, RepoSelector, RepoTab
│   │   ├── Layout/          # Main layout wrapper
│   │   ├── LeftSidebar/     # QuickActions, SessionList, ProjectContext, ContextMenu
│   │   ├── RightSidebar/    # BranchSection, ChangesSection, CommitTree
│   │   ├── TerminalPanel/   # Terminal container panel
│   │   ├── Terminal/        # xterm.js wrapper per session
│   │   ├── Settings/        # Settings modal (General, Terminal, Appearance, Shortcuts)
│   │   ├── Notifications/   # Toast notification system
│   │   ├── common/          # ErrorBoundary, LoadingSpinner
│   │   ├── icons/           # Logo, StatusDot
│   │   └── ui/              # Button, Badge, Card, IconButton, EmptyState
│   ├── stores/              # Zustand stores
│   │   ├── useTerminalStore.ts    # Terminal sessions & outputs
│   │   ├── useAppStore.ts         # UI layout state (tabs, sidebars)
│   │   ├── useRepoStore.ts        # Repository list
│   │   └── useNotificationStore.ts # Toast notifications
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts   # Menu & app shortcuts
│   │   └── useNotificationListener.ts # Terminal bell listener
│   ├── styles/
│   │   └── globals.css      # Tailwind global styles
│   └── types/
│       └── global.d.ts      # Global type declarations
├── shared/                  # Shared between main & renderer
│   ├── types.ts             # Core interfaces (Terminal, Repository, Commit, etc.)
│   ├── ipc-channels.ts      # Centralized IPC channel constants
│   ├── action-types.ts      # Action & ActionStep types
│   └── constants.ts         # DEFAULT_UI_STATE, etc.
└── default-actions/         # Bundled YAML action templates
    ├── git-pull.yaml
    ├── install-deps.yaml
    ├── run-tests.yaml
    └── update-claude-md.yaml
```

## Geliştirme Komutları

```bash
npm run dev          # Development mode (Vite + Electron)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## Mimari Notlar

### IPC İletişimi
- `src/preload/index.ts` contextBridge ile güvenli API expose eder
- Main ↔ Renderer iletişimi `window.api` üzerinden
- IPC channel isimleri `src/shared/ipc-channels.ts` içinde merkezi tanımlı
- Tüm handler'lar `src/main/ipc/handlers.ts` içinde kayıtlı

### State Management
- **useTerminalStore**: Terminal sessions, outputs, active terminal tracking
- **useAppStore**: UI layout (open tabs, active tab, sidebar visibility, settings modal)
- **useRepoStore**: Available repositories
- **useNotificationStore**: Toast notification queue

### Terminal Management
- Her terminal session bir `node-pty` process (TerminalManager)
- xterm.js frontend rendering (Terminal component)
- Session ID ile tracking, max 12 terminal

### Action System
- YAML-based action definitions (write/wait_for/delay steps)
- ActionStore: `~/.ai-orchestrator/actions` (user) + `<repo>/.ai-orchestrator/actions` (project) dizinlerini izler
- ActionEngine: Step'leri sırayla execute eder
- Default action'lar `default-actions/` klasöründen kopyalanır

### Notifications
- Terminal bell character algılama → OS notification
- Toast notification sistemi (useNotificationStore + ToastContainer)

## Stil Kuralları

### Tailwind Renk Şeması
- Background: `bg-[#1a1a2e]`, `bg-[#0f0f1a]`
- Accent: `bg-purple-600`, `text-purple-400`
- Border: `border-gray-700/50`

### Component Patterns
- Framer Motion ile animasyonlar (`motion.div`)
- Lucide React icons
- Glass-morphism effects: `bg-white/5 backdrop-blur`
- Component'ler alt klasörlerde `index.ts` barrel export ile

## Dikkat Edilmesi Gerekenler

### macOS Specific
- Traffic lights padding: `titleBarStyle: 'hiddenInset'`
- `-webkit-app-region: drag` for draggable header
- Window controls offset için padding

### Electron Güvenlik
- `nodeIntegration: false`
- `contextIsolation: true`
- Preload script ile güvenli IPC (`src/preload/`)

### Git Operations
- `simple-git` async operations (RepoManager)
- Branch/status/commit tracking per repo
- File change display & commit from UI

## Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/main/index.ts` | Electron main entry, BrowserWindow, app menu |
| `src/main/ipc/handlers.ts` | Tüm IPC handler kayıtları |
| `src/main/terminal/TerminalManager.ts` | PTY process management |
| `src/main/action/ActionStore.ts` | Action YAML loading & file watching |
| `src/main/action/ActionEngine.ts` | Action step execution |
| `src/main/repo/RepoManager.ts` | Git operations |
| `src/main/config/ConfigManager.ts` | Config & UI state persistence |
| `src/preload/index.ts` | IPC API bridge (`window.api`) |
| `src/renderer/stores/useTerminalStore.ts` | Terminal state management |
| `src/renderer/stores/useAppStore.ts` | App UI state management |
| `src/renderer/components/Terminal/Terminal.tsx` | xterm.js integration |
| `src/shared/ipc-channels.ts` | Centralized IPC channel constants |
| `src/shared/types.ts` | Core TypeScript interfaces |
| `electron.vite.config.ts` | Vite + Electron build config |
