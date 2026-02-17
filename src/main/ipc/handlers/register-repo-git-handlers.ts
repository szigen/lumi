import { ipcMain, shell } from 'electron'
import * as path from 'path'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { IpcHandlerContext } from './types'

export function registerRepoGitHandlers(context: IpcHandlerContext): void {
  const { repoManager } = context

  ipcMain.handle(IPC_CHANNELS.REPOS_LIST, async () => {
    return repoManager.listRepos()
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILES, async (_, repoPath: string) => {
    return repoManager.getFiles(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_FILE_TREE, async (_, repoPath: string) => {
    return repoManager.getFileTree(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_WATCH_FILE_TREE, async (_, repoPath: string) => {
    repoManager.watchRepoFileTree(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.REPOS_UNWATCH_FILE_TREE, async (_, repoPath: string) => {
    repoManager.unwatchRepoFileTree(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_COMMITS, async (_, repoPath: string, branch?: string) => {
    return repoManager.getCommits(repoPath, branch)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async (_, repoPath: string) => {
    return repoManager.getBranches(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_, repoPath: string) => {
    return repoManager.getStatus(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_, repoPath: string, files: string[], message: string) => {
    return repoManager.commit(repoPath, files, message)
  })

  ipcMain.handle(IPC_CHANNELS.CONTEXT_DELETE_FILE, async (_, repoPath: string, relativePath: string) => {
    const absolutePath = path.join(repoPath, relativePath)
    await shell.trashItem(absolutePath)
  })

  ipcMain.handle(IPC_CHANNELS.CONTEXT_REVEAL_IN_FILE_MANAGER, async (_, repoPath: string, relativePath: string) => {
    const absolutePath = path.join(repoPath, relativePath)
    shell.showItemInFolder(absolutePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_READ_FILE, async (_, repoPath: string, filePath: string) => {
    return repoManager.readFile(repoPath, filePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_FILE_DIFF, async (_, repoPath: string, filePath: string) => {
    return repoManager.getFileDiff(repoPath, filePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT_DIFF, async (_, repoPath: string, commitHash: string) => {
    return repoManager.getCommitDiff(repoPath, commitHash)
  })
}
