# Styles

Single `globals.css` file with CSS variables, reset, and all component styles.

## Color System
- Backgrounds: `--bg-deep` (#0a0a12), `--bg-surface` (#12121f), `--bg-elevated` (#1a1a2e)
- Accents: `--accent-primary` (#a78bfa), `--accent-vivid` (#8b5cf6), `--accent-deep` (#7c3aed), `--accent-cyan` (#22d3ee)
- Status: `--accent-success` (#4ade80), `--accent-warning` (#fbbf24), `--accent-error` (#f87171)
- Text: `--text-primary`, `--text-secondary`, `--text-muted`

## Layout Variables
- `--sidebar-width: 280px`
- `--header-height: 52px`
- Spacing scale: `--spacing-xs` (4px) through `--spacing-2xl` (32px)
- Border radius: `--radius-sm` (4px) through `--radius-xl` (12px)

## Conventions
- Font: JetBrains Mono, 13px base
- BEM naming throughout
- Fullscreen override: `body.platform-darwin.fullscreen` reduces header and focus-exit-control padding (traffic lights hidden in fullscreen)
- Custom scrollbars with rounded thumbs
- Animations: `fadeIn`, `fadeInUp`, `subtle-pulse`, `glow-pulse`, `spin`, `marquee`
- xterm viewport forced transparent background
