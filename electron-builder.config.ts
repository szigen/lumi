import type { Configuration } from 'electron-builder'
import * as path from 'path'
import * as fs from 'fs'

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
  },
  deb: {
    depends: [
      'libgtk-3-0 | libgtk-3-0t64',
      'libnotify4',
      'libnss3',
      'libxss1 | libxss1t64',
      'libxtst6',
      'xdg-utils',
      'libatspi2.0-0 | libatspi2.0-0t64',
      'libuuid1',
      'libsecret-1-0'
    ]
  },
  afterPack: async (context) => {
    // Fix ARM64 AppImage libz.so issue:
    // AppImageKit cross-compiled for ARM64 links against libz.so (dev symlink)
    // instead of libz.so.1 (runtime). Bundle a symlink so the AppImage resolves it.
    // See: https://github.com/AppImage/AppImageKit/issues/964
    if (context.electronPlatformName === 'linux' && context.arch === 3 /* arm64 */) {
      const libDir = path.join(context.appOutDir, 'usr', 'lib')
      fs.mkdirSync(libDir, { recursive: true })
      const symlinkPath = path.join(libDir, 'libz.so')
      if (!fs.existsSync(symlinkPath)) {
        fs.symlinkSync('libz.so.1', symlinkPath)
      }
    }
  }
}

export default config
