# AI Orchestrator UI Tasarım Planı

> **Tarih**: 2026-02-04
> **Durum**: Planlandı
> **Kapsam**: Naked HTML → Full CSS UI

## Proje Özeti

**AI Orchestrator**: Birden fazla Claude Code CLI instance'ı yönetmek için Electron tabanlı masaüstü dashboard. Terminal yönetimi, git entegrasyonu, dosya ağacı ve quick actions içeriyor.

---

## Tasarım Kararları

### Estetik Yön: **Neon Violet Terminal**

Modern developer aracı için şık mor/violet tonları - mevcut logo ile uyumlu, glow efektleri ile derinlik.

### Renk Paleti

```css
/* Background */
--bg-deep: #0a0a12          /* Ana arka plan - derin mor-siyah */
--bg-surface: #12121f       /* Panel/card arka planları */
--bg-elevated: #1a1a2e      /* Hover/active durumlar */
--border: #2a2a4a           /* Subtle border */
--border-glow: #8b5cf640    /* Glow border */

/* Text */
--text-primary: #e2e2f0     /* Ana metin */
--text-secondary: #8888a8   /* İkincil metin */
--text-muted: #4a4a6a       /* Disabled/placeholder */

/* Accent Colors */
--accent-primary: #a78bfa   /* Ana accent - soft violet */
--accent-vivid: #8b5cf6     /* Canlı violet */
--accent-deep: #7c3aed      /* Derin mor */
--accent-cyan: #22d3ee      /* Sekonder accent - cyan */
--accent-success: #4ade80   /* Success - yeşil */
--accent-warning: #fbbf24   /* Warning - amber */
--accent-error: #f87171     /* Error - kırmızı */
```

### Tipografi

- **Font**: `'JetBrains Mono', monospace`
- Monospace throughout - terminal temasına uygun
- Google Fonts import gerekli

---

## Implementasyon Planı

### Aşama 1: CSS Altyapısı

**Dosya**: `src/renderer/styles/globals.css`

| Görev | Açıklama |
|-------|----------|
| CSS Variables | Renk paleti, spacing, typography tanımları |
| Google Fonts | JetBrains Mono import |
| Reset | Box-sizing, margin/padding reset |
| Base styles | html, body, #root |
| Utility classes | .glow, .transition-all, .gradient-border |
| Keyframes | fadeIn, subtle-pulse animasyonları |

### Aşama 2: Layout Component

**Dosya**: `src/renderer/components/Layout/Layout.tsx`

```
CSS Classes:
├── .layout                 → Ana container, full height
├── .layout-body            → Flex row, sidebars + main
├── .sidebar                → Sabit genişlik (280px), scrollable
├── .sidebar-left           → Sol kenar border
├── .sidebar-right          → Sağ kenar border
├── .main-content           → Flex grow, terminal alanı
├── .loading-screen         → Splash screen, centered
├── .loading-content        → Logo + text container
├── .loading-logo           → Animated logo
├── .loading-title          → App title
└── .loading-status         → Loading dots
```

### Aşama 3: Header Components

**Dosyalar**:
- `src/renderer/components/Header/Header.tsx`
- `src/renderer/components/Header/RepoTab.tsx`
- `src/renderer/components/Header/RepoSelector.tsx`

```
CSS Classes:
├── .header                 → Draggable area, glass effect, 52px height
├── .header-left            → Logo + menu, flex items
├── .header-center          → Tabs container, overflow scroll
├── .header-right           → Actions, gap spacing
├── .app-title              → Glowing text on hover
├── .repo-tab               → Tab item, border-radius
├── .repo-tab--active       → Active state with accent border
├── .repo-tab__close        → Close button, hover visible
├── .repo-dropdown          → Portal dropdown panel
├── .repo-dropdown__search  → Search input with icon
└── .repo-dropdown__item    → Repo item, hover state
```

### Aşama 4: Left Sidebar Components

**Dosyalar**:
- `src/renderer/components/LeftSidebar/LeftSidebar.tsx`
- `src/renderer/components/LeftSidebar/SessionList.tsx`
- `src/renderer/components/LeftSidebar/ProjectContext.tsx`
- `src/renderer/components/LeftSidebar/QuickActions.tsx`

```
CSS Classes:
├── .left-sidebar           → Full height, flex column
├── .sidebar-section        → Padding, border-bottom
├── .section-header         → Icon + title + count, flex
│
├── .session-list           → Sessions container
├── .session-item           → Session row, clickable
├── .session-item--active   → Highlighted state
│
├── .file-tree              → Tree container, max-height scroll
├── .tree-node              → File/folder row
├── .tree-node__content     → Icon + name, draggable
├── .tree-children          → Nested with padding-left
│
├── .quick-actions          → Grid layout 2 columns
└── .action-btn             → Button with icon + label
```

### Aşama 5: Right Sidebar (Commit Tree)

**Dosyalar**:
- `src/renderer/components/RightSidebar/RightSidebar.tsx`
- `src/renderer/components/RightSidebar/CommitTree.tsx`
- `src/renderer/components/RightSidebar/BranchSection.tsx`

```
CSS Classes:
├── .right-sidebar          → Full height container
├── .commit-tree            → Scrollable container
├── .commit-header          → Title + refresh button
│
├── .branch-section         → Branch wrapper
├── .branch-header          → Clickable, expand/collapse
├── .branch-header--current → With accent indicator
│
├── .commit-list            → Commits container
├── .commit-item            → Single commit row
├── .commit-hash            → Monospace, muted color
├── .commit-message         → Truncate with ellipsis
└── .commit-date            → Small, secondary color
```

### Aşama 6: Terminal Panel

**Dosyalar**:
- `src/renderer/components/TerminalPanel/TerminalPanel.tsx`
- `src/renderer/components/Terminal/Terminal.tsx`

```
CSS Classes:
├── .terminal-panel         → Main panel, flex column
├── .terminal-panel__header → Header bar with title + button
├── .terminal-panel__count  → Terminal count badge
│
├── .terminal-grid          → CSS Grid, responsive
├── .terminal-card          → Single terminal wrapper
├── .terminal-card__header  → Status + title + close
├── .terminal-card__body    → xterm container, flex-grow
├── .terminal-card--drag    → Drag over state, border glow
└── .drag-overlay           → Drop zone overlay text
```

### Aşama 7: UI Components

**Dosyalar**:
- `src/renderer/components/ui/Button.tsx`
- `src/renderer/components/ui/IconButton.tsx`
- `src/renderer/components/ui/Badge.tsx`
- `src/renderer/components/ui/EmptyState.tsx`

```
CSS Classes:
├── .btn                    → Base button styles
├── .btn--primary           → Accent background
├── .btn--ghost             → Transparent, border on hover
│
├── .icon-btn               → Square button, centered icon
├── .icon-btn:hover         → Background + scale
│
├── .badge                  → Inline badge, small text
├── .badge--accent          → Violet background
├── .badge--success         → Green background
├── .badge--warning         → Amber background
│
├── .empty-state            → Centered content
├── .empty-state__icon      → Large, muted icon
├── .empty-state__title     → Heading
└── .empty-state__desc      → Secondary text
```

### Aşama 8: Icon Components

**Dosyalar**:
- `src/renderer/components/icons/StatusDot.tsx`
- `src/renderer/components/icons/Logo.tsx`

```
CSS Classes:
├── .status-dot             → Inline-block, circle
├── .status-dot--running    → Green, pulse animation
├── .status-dot--completed  → Cyan, static
├── .status-dot--error      → Red, static
├── .status-dot--idle       → Muted, static
│
├── .logo                   → SVG wrapper
└── .logo--animated         → Hover glow effect
```

---

## Özel Efektler (Orta Seviye)

### Violet Glow

```css
.glow {
  box-shadow: 0 0 15px var(--accent-primary),
              0 0 30px rgba(139, 92, 246, 0.3);
}

.glow-text {
  text-shadow: 0 0 10px var(--accent-primary),
               0 0 20px rgba(139, 92, 246, 0.5);
}
```

### Gradient Border

```css
.gradient-border {
  border: 1px solid transparent;
  background: linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
              linear-gradient(135deg, var(--accent-primary), var(--accent-deep)) border-box;
}
```

### Subtle Pulse

```css
@keyframes subtle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Smooth Transitions

```css
.transition-all {
  transition: all 0.2s ease;
}
```

---

## Dosya Değişiklikleri Özeti

| # | Dosya | Değişiklik |
|---|-------|------------|
| 1 | `globals.css` | Tamamen yeniden yaz (~400 satır) |
| 2 | `Layout.tsx` | className ekle |
| 3 | `Header.tsx` | className ekle |
| 4 | `RepoTab.tsx` | className ekle |
| 5 | `RepoSelector.tsx` | className ekle |
| 6 | `LeftSidebar.tsx` | className ekle |
| 7 | `SessionList.tsx` | className ekle |
| 8 | `ProjectContext.tsx` | className ekle |
| 9 | `QuickActions.tsx` | className ekle |
| 10 | `RightSidebar.tsx` | className ekle |
| 11 | `CommitTree.tsx` | className ekle |
| 12 | `BranchSection.tsx` | className ekle |
| 13 | `TerminalPanel.tsx` | className ekle |
| 14 | `Terminal.tsx` | className ekle |
| 15 | `Button.tsx` | className ekle |
| 16 | `IconButton.tsx` | className ekle |
| 17 | `Badge.tsx` | className + variant logic |
| 18 | `EmptyState.tsx` | className ekle |
| 19 | `StatusDot.tsx` | className + color logic |
| 20 | `Logo.tsx` | className ekle |

**Toplam**: 1 CSS dosyası + 19 TSX dosyası

---

## Uygulama Sırası

```
1. globals.css         → Tüm CSS tanımları (en büyük iş)
2. Layout.tsx          → Ana yapı className'leri
3. UI Components       → Button, Badge, StatusDot, EmptyState
4. Header Components   → Header, RepoTab, RepoSelector
5. Left Sidebar        → LeftSidebar, SessionList, ProjectContext, QuickActions
6. Right Sidebar       → RightSidebar, CommitTree, BranchSection
7. Terminal            → TerminalPanel, Terminal
```

---

## Verification Checklist

- [ ] `npm run dev` ile uygulama başlıyor
- [ ] Loading screen animasyonlu görünüyor
- [ ] Header draggable, macOS traffic lights düzgün
- [ ] Tab'lar açılıp kapanıyor
- [ ] Sol sidebar toggle çalışıyor
- [ ] File tree expand/collapse çalışıyor
- [ ] Drag-drop file to terminal çalışıyor
- [ ] Sağ sidebar commit tree gösteriyor
- [ ] Branch expand/collapse çalışıyor
- [ ] Terminal spawn ediliyor
- [ ] Quick actions terminal açıyor
- [ ] Tüm hover/focus durumları smooth
- [ ] Glow efektleri performanslı
