import { describe, it, expect } from 'vitest'
import { computeOutputPatch } from '../useTerminalOutputRenderer'
import type { TerminalOutput } from '../../../../stores/useTerminalStore'

function makeOutput(overrides: Partial<TerminalOutput> = {}): TerminalOutput {
  return { text: '', totalLength: 0, epoch: 0, ...overrides }
}

describe('computeOutputPatch', () => {
  it('returns noop when nothing changed', () => {
    const output = makeOutput({ text: 'abc', totalLength: 3 })
    const patch = computeOutputPatch({ totalLength: 3, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'noop' })
  })

  it('returns append with only the new chunk', () => {
    const output = makeOutput({ text: 'abcdef', totalLength: 6 })
    const patch = computeOutputPatch({ totalLength: 3, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'append', chunk: 'def' })
  })

  it('appends the full text on first render when nothing was trimmed', () => {
    const output = makeOutput({ text: 'hello', totalLength: 5 })
    const patch = computeOutputPatch({ totalLength: 0, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'append', chunk: 'hello' })
  })

  it('returns replace when renderer is behind more than the buffered tail', () => {
    // 100 chars appended in total, but only the last 10 are buffered
    const output = makeOutput({ text: 'tail-chars', totalLength: 100 })
    const patch = computeOutputPatch({ totalLength: 50, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'replace', value: 'tail-chars' })
  })

  it('returns replace when epoch changed (non-incremental rewrite)', () => {
    const output = makeOutput({ text: 'snapshot', totalLength: 8, epoch: 1 })
    const patch = computeOutputPatch({ totalLength: 8, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'replace', value: 'snapshot' })
  })

  it('returns replace when totalLength went backwards (store reset)', () => {
    const output = makeOutput({ text: '', totalLength: 0 })
    const patch = computeOutputPatch({ totalLength: 10, epoch: 0 }, output)
    expect(patch).toEqual({ kind: 'replace', value: '' })
  })
})
