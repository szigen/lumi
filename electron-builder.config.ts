import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.ai-orchestrator.app',
  productName: 'AI Orchestrator',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'default-actions/**/*',
    'default-personas/**/*'
  ],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.developer-tools'
  },
  win: {
    target: ['nsis', 'portable']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Development'
  }
}

export default config
