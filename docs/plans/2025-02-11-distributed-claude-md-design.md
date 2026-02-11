# Distributed CLAUDE.md Design

## Problem
Mevcut CLAUDE.md 204 satir, monolitik. Her oturumda tamami yukleniyor ama cogu zaman sadece 1-2 feature ile calisiliyor. Bilgi yogunlugu context'i kirletiyor.

## Karar
CLAUDE.md'yi "Proje Anayasasi" olarak sadelestir, detaylari feature-level CLAUDE.md dosyalarina tasi.

## Yapisal Kurallar

- **Dosya adi**: `CLAUDE.md` (degisebilir - her feature kendi adini alabilir ileride)
- **Konum**: Anlamli olan her dizinde (main/*, renderer/*, shared/, preload/)
- **Icerik formati**: Minimal ama hafif structured - genel bakis + kurallar/dikkat edilecekler
- **Icerik dili**: Ingilizce
- **Root CLAUDE.md**: ~15 satir, davranis kurallari + komutlar

## Root CLAUDE.md Icerigi

Kalacaklar:
- Tek satirlik proje tanimi
- Tech stack ozeti
- Gelistirme komutlari (dev/build/lint/typecheck)
- Davranis kurali: "When working in a directory, check for CLAUDE.md first and read it before modifying files."
- Kural: "When executing plans with superpowers:executing-plan, don't commit, don't wait for feedback, do full implementation. User will test in the end."
- Stil convention'lari (CSS variables, BEM, Framer Motion, Lucide icons)

Tasinacaklar (feature CLAUDE.md'lere):
- IPC iletisimi detaylari
- Terminal management detaylari
- Action system detaylari
- Persona system detaylari
- State management detaylari
- Component patterns
- Her feature'a ait dosya aciklamalari

## Feature CLAUDE.md Lokasyonlari

### Main Process
- `src/main/terminal/CLAUDE.md` - PTY management, output buffering, codenames, syncFromMain
- `src/main/action/CLAUDE.md` - YAML actions, ActionEngine, CLI flag injection, Create Action flow
- `src/main/persona/CLAUDE.md` - YAML personas, PersonaStore, CLI integration
- `src/main/ipc/CLAUDE.md` - Handler registrations, channel conventions
- `src/main/config/CLAUDE.md` - ConfigManager, persistence, UI state
- `src/main/notification/CLAUDE.md` - Bell detection, OS notifications
- `src/main/repo/CLAUDE.md` - simple-git operations, branch/status tracking

### Renderer
- `src/renderer/stores/CLAUDE.md` - Store iliskileri, syncFromMain, state ownership
- `src/renderer/components/CLAUDE.md` - Component conventions (barrel export, Framer Motion, glass-morphism)
- `src/renderer/styles/CLAUDE.md` - CSS variables, renk semasi, BEM

### Shared & Preload
- `src/shared/CLAUDE.md` - Type conventions, IPC channel naming
- `src/preload/CLAUDE.md` - contextBridge, security rules

## Feature CLAUDE.md Ornek Format (Ingilizce)

```markdown
# Terminal Management

PTY process spawn/management, output buffering, state queries.

## Rules
- Main process = single source of truth (TerminalManager owns metadata + buffer)
- Output buffering: last 100KB per terminal
- Max 12 terminal limit
- Terminals support optional `task` field

## Watch Out
- syncFromMain(): Called on renderer startup, visibility change, and powerMonitor resume
- TERMINAL_LIST / TERMINAL_BUFFER / TERMINAL_SYNC IPC channels for state reconciliation
```

## Isimlendirme Notu

Simdilik tum feature dosyalari `CLAUDE.md`. Verim alinamazsa her feature kendi adini alabilir (orn. `TERMINAL.md`, `ACTIONS.md`). Root CLAUDE.md'deki kural buna gore guncellenir.
