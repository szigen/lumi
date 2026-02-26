export const DEFAULT_CONFIG = {
  projectsRoot: '',
  additionalPaths: [] as import('./types').AdditionalPath[],
  aiProvider: 'claude' as const,
  maxTerminals: 12,
  theme: 'dark' as const,
  terminalFontSize: 13
}

export const DEFAULT_UI_STATE = {
  openTabs: [],
  activeTab: null,
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  projectGridLayouts: {} as Record<string, import('./types').GridLayout>,
  activeView: 'terminals' as const,
  windowBounds: undefined as { x: number; y: number; width: number; height: number } | undefined,
  windowMaximized: false
}
