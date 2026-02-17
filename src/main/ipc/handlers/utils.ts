import { randomUUID } from 'crypto'

export function buildDelimitedInputCommand(commandPrefix: string, prompt: string): string {
  const marker = `__AI_ORCH_${randomUUID().replace(/-/g, '_')}__`
  return `${commandPrefix} <<'${marker}'\n${prompt}\n${marker}\r`
}
