export const platform = process.platform
export const isMac = platform === 'darwin'
export const isWin = platform === 'win32'
export const isLinux = platform === 'linux'

export { getDefaultShell, getShellArgs } from './shell'
export { getWindowConfig } from './window'
export { getConfigDir, getTempDir } from './paths'
export { getPlatformChecks } from './systemChecks'
export { fixProcessPath } from './shellEnv'
