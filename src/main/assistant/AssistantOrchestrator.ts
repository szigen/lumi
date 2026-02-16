import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import type { ChildProcess } from 'child_process'
import type { AIProvider } from '../../shared/ai-provider'
import { createClaudeStreamParser } from './parsers/ClaudeStreamParser'
import { createCodexStreamParser } from './parsers/CodexStreamParser'
import { deltaFromSnapshot } from './parsers/common'
import type {
  AskAssistantParams,
  AskAssistantResult,
  AssistantOrchestratorOptions,
  AssistantStreamActivity
} from './types'

const DEFAULT_MAX_CONCURRENT_PROCESSES = 2
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_MAX_BUFFER_SIZE = 1024 * 1024

const CODEX_IGNORED_STDERR_PATTERNS = [
  /state db missing rollout path for thread/i,
  /failed to record rollout items: failed to queue rollout items: channel closed/i,
  /failed to shutdown rollout recorder/i
]

export class AssistantOrchestrator {
  private readonly getProvider: () => AIProvider
  private readonly emitDelta: (bugId: string, text: string) => void
  private readonly emitDone: (bugId: string, fullText: string | null, error?: string) => void
  private readonly emitActivity: (bugId: string, activity: AssistantStreamActivity) => void
  private readonly maxConcurrentProcesses: number
  private readonly timeoutMs: number
  private readonly maxBufferSize: number

  private readonly activeProcesses = new Map<string, ChildProcess>()
  private readonly activeByBug = new Map<string, string>()

  constructor(options: AssistantOrchestratorOptions) {
    this.getProvider = options.getProvider
    this.emitDelta = options.emitDelta
    this.emitDone = options.emitDone
    this.emitActivity = options.emitActivity
    this.maxConcurrentProcesses = options.maxConcurrentProcesses ?? DEFAULT_MAX_CONCURRENT_PROCESSES
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxBufferSize = options.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE
  }

  askAssistant({ repoPath, bugId, prompt }: AskAssistantParams): AskAssistantResult {
    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      return {
        started: false,
        error: 'Too many concurrent assistant processes. Please wait for one to finish.'
      }
    }

    if (this.activeByBug.has(bugId)) {
      return {
        started: false,
        error: 'An assistant request is already running for this bug.'
      }
    }

    const provider = this.getProvider()
    const proc = this.spawnProviderProcess(provider, repoPath)
    if (!proc.stdin || !proc.stdout || !proc.stderr) {
      proc.kill('SIGTERM')
      return {
        started: false,
        error: 'Failed to initialize assistant process streams.'
      }
    }

    const requestId = randomUUID()
    this.activeProcesses.set(requestId, proc)
    this.activeByBug.set(bugId, requestId)

    proc.stdin.write(prompt)
    proc.stdin.end()

    let previewAccumulated = ''
    let responseAccumulated = ''
    let error = ''
    let codexStreamError: string | null = null
    let latestCodexAgentMessage: string | null = null
    let stdoutBuffer = ''
    let stderrBuffer = ''
    let killed = false
    let doneEmitted = false

    const cleanup = () => {
      clearTimeout(timeout)
      this.activeProcesses.delete(requestId)
      if (this.activeByBug.get(bugId) === requestId) {
        this.activeByBug.delete(bugId)
      }
    }

    const safeEmitDone = (fullText: string | null, doneError?: string) => {
      if (doneEmitted) return
      doneEmitted = true
      this.emitDone(bugId, fullText, doneError)
    }

    const wouldExceedBufferLimit = (previewDeltaSize: number, responseDeltaSize: number) => (
      previewAccumulated.length + previewDeltaSize > this.maxBufferSize ||
      responseAccumulated.length + responseDeltaSize > this.maxBufferSize
    )

    const killForBufferLimit = () => {
      if (killed) return
      killed = true
      proc.kill('SIGTERM')
      safeEmitDone(null, 'Response exceeded maximum size limit')
      cleanup()
    }

    const emitPreviewDelta = (text: string) => {
      if (!text || killed) return
      if (wouldExceedBufferLimit(text.length, 0)) {
        killForBufferLimit()
        return
      }
      previewAccumulated += text
      this.emitDelta(bugId, text)
    }

    const emitResponseDelta = (text: string) => {
      if (!text || killed) return
      if (wouldExceedBufferLimit(text.length, text.length)) {
        killForBufferLimit()
        return
      }
      responseAccumulated += text
      previewAccumulated += text
      this.emitDelta(bugId, text)
    }

    const emitResponseSnapshot = (snapshot: string) => {
      const delta = deltaFromSnapshot(snapshot, responseAccumulated)
      if (delta) {
        emitResponseDelta(delta)
      }
    }

    const timeout = setTimeout(() => {
      if (killed) return
      killed = true
      proc.kill('SIGTERM')
      safeEmitDone(
        null,
        `${provider === 'codex' ? 'Codex' : 'Claude'} process timed out after ${Math.floor(this.timeoutMs / 60000)} minutes`
      )
      cleanup()
    }, this.timeoutMs)

    const claudeParser = createClaudeStreamParser({
      onResponseDelta: emitResponseDelta,
      onResponseSnapshot: emitResponseSnapshot,
      onToolStart: (tool) => this.emitActivity(bugId, { type: 'tool_start', tool }),
      onToolEnd: () => this.emitActivity(bugId, { type: 'tool_end' })
    })

    const codexParser = createCodexStreamParser({
      onPreviewDelta: emitPreviewDelta,
      onResponseSnapshot: emitResponseSnapshot,
      onToolStart: (tool) => this.emitActivity(bugId, { type: 'tool_start', tool }),
      onToolEnd: () => this.emitActivity(bugId, { type: 'tool_end' }),
      onError: (message) => {
        codexStreamError = message
      },
      onAgentMessage: (message) => {
        latestCodexAgentMessage = message
      }
    })

    const processStdoutLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed || killed) return

      if (provider === 'claude') {
        claudeParser.processLine(trimmed)
      } else {
        codexParser.processLine(trimmed)
      }
    }

    const processStderrLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      if (provider === 'codex' && this.isIgnorableCodexStderrLine(trimmed)) {
        return
      }
      error += `${trimmed}\n`
      console.error('[ASSISTANT-STREAM] stderr:', trimmed.slice(0, 200))
    }

    proc.stdout.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() || ''
      for (const line of lines) {
        processStdoutLine(line)
        if (killed) break
      }
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffer += data.toString()
      const lines = stderrBuffer.split('\n')
      stderrBuffer = lines.pop() || ''
      for (const line of lines) {
        processStderrLine(line)
      }
    })

    proc.on('error', (err: Error) => {
      killed = true
      console.error('[ASSISTANT-STREAM] spawn error:', err.message)
      safeEmitDone(null, err.message)
      cleanup()
    })

    proc.on('close', (code: number) => {
      if (stdoutBuffer.trim()) {
        processStdoutLine(stdoutBuffer)
      }
      if (stderrBuffer.trim()) {
        processStderrLine(stderrBuffer)
      }

      claudeParser.close()
      codexParser.close()

      if (!killed) {
        const codexFinal = latestCodexAgentMessage?.trim() || ''
        const fallbackFinal = responseAccumulated.trim()
        const finalResponse = (provider === 'codex' ? codexFinal || fallbackFinal : fallbackFinal) || null
        const finalError = codexStreamError || error.trim() || undefined

        if (code === 0) {
          if (finalResponse) {
            safeEmitDone(finalResponse)
          } else {
            safeEmitDone(null, finalError)
          }
        } else {
          safeEmitDone(null, finalError || `${provider} exited with code ${code}`)
        }
      }

      cleanup()
    })

    return { started: true }
  }

  private spawnProviderProcess(provider: AIProvider, repoPath: string): ChildProcess {
    if (provider === 'codex') {
      return spawn('codex', ['exec', '--json', '-'], { cwd: repoPath, env: process.env })
    }

    return spawn('claude', ['-p', '--verbose', '--output-format', 'stream-json', '--include-partial-messages'], {
      cwd: repoPath,
      env: process.env
    })
  }

  private isIgnorableCodexStderrLine(line: string): boolean {
    return CODEX_IGNORED_STDERR_PATTERNS.some((pattern) => pattern.test(line))
  }
}
