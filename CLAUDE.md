# AI Orchestrator

Birden fazla Claude Code CLI instance'ı yönetmek için Electron tabanlı masaüstü dashboard uygulaması.

## Tech Stack

- **Electron 40** + TypeScript
- **React 19** + Zustand (state management)
- **Tailwind CSS 4** + Framer Motion (animasyonlar)
- **xterm.js** + node-pty (terminal emulation)
- **simple-git** (git operations)
- **Vite 7** (bundling)

## Proje Yapısı

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Main entry, window management
│   ├── preload.ts  # IPC bridge (contextBridge)
│   ├── terminal.ts # node-pty terminal spawn/management
│   └── git.ts      # simple-git operations
├── renderer/       # React UI
│   ├── App.tsx     # Root component
│   ├── components/ # UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TerminalTabs.tsx
│   │   ├── TerminalView.tsx
│   │   └── RepoSelector.tsx
│   ├── store/      # Zustand stores
│   │   └── terminalStore.ts
│   └── hooks/      # Custom React hooks
└── shared/         # Shared types
    └── types.ts
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
- `preload.ts` contextBridge ile güvenli API expose eder
- Main ↔ Renderer iletişimi `window.electronAPI` üzerinden
- Terminal data streaming: `terminal:data` event

### State Management
- Zustand store: `terminalStore.ts`
- Terminal sessions, active tab, repo selection state'leri

### Terminal Management
- Her terminal session bir `node-pty` process
- xterm.js frontend rendering
- Session ID ile tracking

## Stil Kuralları

### Tailwind Renk Şeması
- Background: `bg-[#1a1a2e]`, `bg-[#0f0f1a]`
- Accent: `bg-purple-600`, `text-purple-400`
- Border: `border-gray-700/50`

### Component Patterns
- Framer Motion ile animasyonlar (`motion.div`)
- Lucide React icons
- Glass-morphism effects: `bg-white/5 backdrop-blur`

## Dikkat Edilmesi Gerekenler

### macOS Specific
- Traffic lights padding: `titleBarStyle: 'hiddenInset'`
- `-webkit-app-region: drag` for draggable header
- Window controls offset için padding

### Electron Güvenlik
- `nodeIntegration: false`
- `contextIsolation: true`
- Preload script ile güvenli IPC

### Git Operations
- `simple-git` async operations
- Error handling for non-git directories
- Branch/status tracking per terminal

## Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/main/index.ts` | Electron main entry, BrowserWindow config |
| `src/main/preload.ts` | IPC API bridge |
| `src/main/terminal.ts` | PTY process management |
| `src/renderer/store/terminalStore.ts` | Global state |
| `src/renderer/components/TerminalView.tsx` | xterm.js integration |
| `electron.vite.config.ts` | Vite + Electron config |
