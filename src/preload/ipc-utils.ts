import { ipcRenderer, IpcRendererEvent } from 'electron'

/**
 * Creates a typed IPC event listener with automatic cleanup
 * @param channel - The IPC channel to listen on
 * @param callback - The callback function to invoke when event is received
 * @returns A cleanup function that removes the listener
 */
export function createIpcListener<T extends unknown[]>(
  channel: string,
  callback: (...args: T) => void
): () => void {
  const handler = (_event: IpcRendererEvent, ...args: T) => {
    callback(...args)
  }
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

/**
 * Invokes an IPC handler and returns the result
 * @param channel - The IPC channel to invoke
 * @param args - Arguments to pass to the handler
 * @returns A promise that resolves with the handler's result
 */
export function invokeIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args)
}
