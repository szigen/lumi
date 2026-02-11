# AI Orchestrator

Birden fazla Claude Code CLI instance'ı yönetmek için Electron tabanlı masaüstü dashboard uygulaması.

## Tech Stack

- **Electron 40** + TypeScript
- **React 19** + Zustand 5 (state management)
- **Custom CSS** (CSS variables + BEM) + Framer Motion 12 (animasyonlar)
- **xterm.js 6** + node-pty (terminal emulation)
- **simple-git** (git operations)
- **Vite 7** + electron-vite 5 (bundling)

## Proje Yapısı

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Main entry, BrowserWindow, app menu, quit dialog
│   ├── ipc/
│   │   └── handlers.ts      # All IPC handler registrations
│   ├── action/
│   │   ├── ActionStore.ts   # YAML action loading & file watching
│   │   ├── ActionEngine.ts  # Action step execution (write/wait_for/delay)
│   │   ├── build-claude-command.ts  # Claude CLI flag injection for actions
│   │   └── create-action-prompt.ts  # System prompt for "Create Action" flow
│   ├── terminal/
│   │   ├── TerminalManager.ts # PTY process spawn/management, output buffering, state queries
│   │   ├── codenames.ts     # Random adjective-noun codename generator
│   │   └── types.ts         # ManagedTerminal (with outputBuffer, task), SpawnResult interfaces
│   ├── repo/
│   │   └── RepoManager.ts   # simple-git operations
│   ├── persona/
│   │   └── PersonaStore.ts  # YAML persona loading & file watching
│   ├── config/
│   │   └── ConfigManager.ts # Config, UI state & codename collection persistence
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
│   │   ├── LeftSidebar/     # QuickActions, SessionList, CollectionProgress, ProjectContext, ContextMenu
│   │   ├── RightSidebar/    # BranchSection, ChangesSection, CommitTree
│   │   ├── TerminalPanel/   # Terminal container panel, PersonaDropdown
│   │   ├── Terminal/        # xterm.js wrapper per session
│   │   ├── FocusMode/       # Focus Mode UI (FocusExitControl)
│   │   ├── QuitDialog/      # Quit confirmation when terminals active
│   │   ├── Settings/        # Settings modal (General, Terminal, Appearance, Shortcuts)
│   │   ├── Notifications/   # Toast notification system
│   │   ├── common/          # ErrorBoundary, LoadingSpinner
│   │   ├── icons/           # Logo, StatusDot
│   │   └── ui/              # Button, Badge, Card, IconButton, EmptyState
│   ├── stores/              # Zustand stores
│   │   ├── useTerminalStore.ts    # Terminal sessions & outputs
│   │   ├── useAppStore.ts         # UI layout state (tabs, sidebars, quit dialog)
│   │   ├── useRepoStore.ts        # Repository list
│   │   └── useNotificationStore.ts # Toast notifications
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts   # Menu & app shortcuts
│   │   └── useNotificationListener.ts # Terminal bell listener
│   ├── styles/
│   │   └── globals.css      # Global styles (CSS variables + BEM)
│   └── types/
│       └── global.d.ts      # Global type declarations
├── shared/                  # Shared between main & renderer
│   ├── types.ts             # Core interfaces (Terminal, TerminalInfo, Repository, Commit, etc.)
│   ├── ipc-channels.ts      # Centralized IPC channel constants (incl. TERMINAL_LIST/BUFFER/SYNC)
│   ├── action-types.ts      # Action, ActionStep & ClaudeConfig types
│   ├── persona-types.ts     # Persona type definitions
│   └── constants.ts         # DEFAULT_UI_STATE, etc.
default-actions/             # Bundled YAML action templates
├── run-tests.yaml
├── sync-plugins.yaml
└── update-claude-md.yaml
default-personas/            # Bundled YAML persona templates
├── architect.yaml
├── expert.yaml
├── fixer.yaml
└── reviewer.yaml
default-teams/               # Bundled YAML team templates
```

## Geliştirme Komutları

```bash
npm run dev          # Development mode (Vite + Electron)
npm run build        # Production build
npm run preview      # Preview production build
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
- **useTerminalStore**: Terminal sessions, outputs, active terminal tracking, syncFromMain reconciliation
- **useAppStore**: UI layout (open tabs, active tab, sidebar visibility, settings modal, quit dialog)
- **useRepoStore**: Available repositories
- **useNotificationStore**: Toast notification queue

### Terminal Management
- Her terminal session bir `node-pty` process (TerminalManager)
- xterm.js frontend rendering (Terminal component)
- Session ID ile tracking, max 12 terminal
- **Main process = single source of truth**: TerminalManager owns all terminal metadata and output buffer
- Output buffering: Main process keeps last 100KB per terminal for reconnection
- `syncFromMain()`: Renderer syncs terminal state from main on startup, visibility change, and powerMonitor resume
- `TERMINAL_LIST` / `TERMINAL_BUFFER` / `TERMINAL_SYNC` IPC channels for state reconciliation
- Terminals support optional `task` field (set by actions, personas, or manual spawn)

### Action System
- YAML-based action definitions (write/wait_for/delay steps)
- ActionStore: `~/.ai-orchestrator/actions` (user) + `<repo>/.ai-orchestrator/actions` (project) dizinlerini izler
- ActionEngine: Step'leri sırayla execute eder
- Default action'lar `default-actions/` klasöründen kopyalanır
- Actions can include `claude:` config block for CLI flags (model, allowedTools, systemPrompt, permissionMode, maxTurns, etc.)
- `build-claude-command.ts`: Injects CLI flags into commands starting with `claude `, writes system prompts to temp files
- "Create Action" flow: Spawns a Claude terminal with `create-action-prompt.ts` to guide users through YAML action creation

### Persona System
- YAML-based persona definitions (name, description, systemPrompt)
- PersonaStore: `~/.ai-orchestrator/personas` (user) + `<repo>/.ai-orchestrator/personas` (project) dizinlerini izler
- Default persona'lar `default-personas/` klasöründen kopyalanır (architect, expert, fixer, reviewer)
- PersonaDropdown: Terminal spawn sırasında persona seçimi
- Seçilen persona'nın systemPrompt'u Claude CLI'a `--system-prompt` flag ile iletilir

### Terminal Codenames
- Terminals get random adjective-noun codenames on spawn (e.g., "brave-alpaca")
- 50 adjectives × 50 nouns = 2,500 possible codenames (`codenames.ts`)
- Discovered codenames tracked in `~/.ai-orchestrator/discovered-codenames.json` (ConfigManager)
- CollectionProgress component shows discovery progress with animated UI

### Quit Confirmation
- QuitDialog shown when closing app with active terminal sessions
- Warns user about running processes before termination

### Notifications
- Terminal bell character algılama → OS notification
- Toast notification sistemi (useNotificationStore + ToastContainer)

## Stil Kuralları

### Renk Şeması
- Background: `--bg-deep`, `--bg-surface`, `--bg-elevated`
- Accent: `--accent-primary`, `--accent-vivid`, `--accent-deep`
- Border: `--border`, `--border-glow`

### Component Patterns
- Framer Motion ile animasyonlar (`motion.div`)
- Lucide React icons
- Glass-morphism effects: `.glass` class (`globals.css`)
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
| `src/main/terminal/TerminalManager.ts` | PTY process management, output buffering, state queries |
| `src/main/action/ActionStore.ts` | Action YAML loading & file watching |
| `src/main/action/ActionEngine.ts` | Action step execution with Claude CLI flag injection |
| `src/main/action/build-claude-command.ts` | Claude CLI flag builder for action commands |
| `src/main/action/create-action-prompt.ts` | System prompt for Create Action flow |
| `src/main/terminal/codenames.ts` | Random codename generator for terminal sessions |
| `src/main/repo/RepoManager.ts` | Git operations |
| `src/main/persona/PersonaStore.ts` | Persona YAML loading & file watching |
| `src/main/config/ConfigManager.ts` | Config, UI state & codename collection persistence |
| `src/preload/index.ts` | IPC API bridge (`window.api`) |
| `src/renderer/stores/useTerminalStore.ts` | Terminal state management |
| `src/renderer/stores/useAppStore.ts` | App UI state management |
| `src/renderer/components/Terminal/Terminal.tsx` | xterm.js integration |
| `src/shared/ipc-channels.ts` | Centralized IPC channel constants |
| `src/shared/types.ts` | Core TypeScript interfaces (Terminal, TerminalInfo, Repository, etc.) |
| `src/shared/persona-types.ts` | Persona type definitions |
| `electron.vite.config.ts` | Vite + Electron build config |
