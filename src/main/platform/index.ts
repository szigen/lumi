export const platform = process.platform
export const isMac = platform === 'darwin'
export const isWin = platform === 'win32'
export const isLinux = platform === 'linux'

export { getDefaultShell, getShellArgs } from './shell'
export { getWindowConfig } from './window'
export { getConfigDir } from './paths'
export { getPlatformChecks, autoFixSpawnHelper } from './systemChecks'
export { fixProcessPath } from './shellEnv'
