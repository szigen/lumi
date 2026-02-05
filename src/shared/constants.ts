export const DEFAULT_CONFIG = {
  projectsRoot: '~/Desktop/AiApps',
  maxTerminals: 12,
  theme: 'dark' as const,
  terminalFontSize: 13
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
