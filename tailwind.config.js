/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-void': '#07080a',
        'bg-primary': '#0c0e12',
        'bg-secondary': '#12151a',
        'bg-tertiary': '#1a1e25',
        'bg-elevated': '#222730',

        // Glass surfaces
        'surface-glass': 'rgba(255, 255, 255, 0.03)',
        'surface-hover': 'rgba(255, 255, 255, 0.06)',
        'surface-active': 'rgba(255, 255, 255, 0.10)',

        // Borders
        'border-subtle': 'rgba(255, 255, 255, 0.06)',
        'border-default': 'rgba(255, 255, 255, 0.10)',
        'border-primary': 'rgba(255, 255, 255, 0.10)',

        // Text
        'text-primary': '#e4e4e7',
        'text-secondary': '#a1a1aa',
        'text-tertiary': '#71717a',

        // Accent (Violet)
        'accent': '#8b5cf6',
        'accent-light': '#a78bfa',
        'accent-dark': '#7c3aed',
        'accent-glow': 'rgba(139, 92, 246, 0.25)',
        'accent-subtle': 'rgba(139, 92, 246, 0.15)',

        // Semantic
        'success': '#10b981',
        'success-glow': 'rgba(16, 185, 129, 0.25)',
        'warning': '#f59e0b',
        'warning-glow': 'rgba(245, 158, 11, 0.25)',
        'error': '#f43f5e',
        'error-glow': 'rgba(244, 63, 94, 0.25)',
        'info': '#06b6d4',
        'info-glow': 'rgba(6, 182, 212, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.25), 0 0 40px rgba(139, 92, 246, 0.15)',
        'glow-success': '0 0 12px rgba(16, 185, 129, 0.25)',
        'glow-warning': '0 0 12px rgba(245, 158, 11, 0.25)',
        'glow-error': '0 0 12px rgba(244, 63, 94, 0.25)',
        'glow-info': '0 0 12px rgba(6, 182, 212, 0.25)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'dropdown': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
