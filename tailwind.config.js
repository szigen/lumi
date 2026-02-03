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
