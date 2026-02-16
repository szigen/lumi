export function deltaFromSnapshot(snapshot: string, accumulated: string): string {
  if (!snapshot) return ''
  if (snapshot.startsWith(accumulated)) {
    return snapshot.slice(accumulated.length)
  }
  if (accumulated.startsWith(snapshot)) {
    return ''
  }
  return snapshot
}

export function normalizeCodexToolName(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }
  const lowered = value.toLowerCase()
  if (lowered === 'bash' || lowered.includes('command') || lowered.includes('shell')) return 'Bash'
  if (lowered.includes('read')) return 'Read'
  if (lowered.includes('grep') || lowered.includes('search')) return 'Grep'
  if (lowered.includes('glob') || lowered.includes('find') || lowered.includes('list')) return 'Glob'
  if (lowered.includes('write')) return 'Write'
  if (lowered.includes('edit') || lowered.includes('patch')) return 'Edit'
  return value
}
