import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.lumi.app',
  productName: 'Lumi',
  copyright: 'Copyright (c) 2025-2026 Sezgin Sazliogullari',
  icon: 'build/icon.png',
  asar: true,
  asarUnpack: ['node_modules/node-pty/**'],
  directories: {
    output: 'release'
  },
  files: [
    'out/**/*',
    'default-actions/**/*',
    'default-personas/**/*'
  ],
  mac: {
    target: ['dmg', 'zip'],
    artifactName: '${productName}-${version}-${arch}-mac.${ext}',
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.inherit.plist',
    notarize: true
  },
  win: {
    target: ['nsis', 'portable']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    artifactName: '${productName}-Setup-${version}-win.${ext}'
  },
  portable: {
    artifactName: '${productName}-${version}-win.${ext}'
  },
  linux: {
    target: ['AppImage', 'deb'],
    artifactName: '${productName}-${version}-linux-${arch}.${ext}',
    category: 'Development'
  }
}

export default config
