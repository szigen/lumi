import { describe, it, expect } from 'vitest'
import { trimOutputTail } from '../output-trim'

describe('trimOutputTail', () => {
  it('returns text unchanged when within max size', () => {
    expect(trimOutputTail('hello', 10, 4)).toBe('hello')
  })

  it('trims head to keep at most maxSize chars', () => {
    const text = 'x'.repeat(100)
    const result = trimOutputTail(text, 40, 4)
    expect(result.length).toBeLessThanOrEqual(40)
  })

  it('cuts at the nearest newline within the search window', () => {
    // 50 chars of noise, then newline, then payload
    const text = 'a'.repeat(50) + '\n' + 'payload'
    const result = trimOutputTail(text, 10, 60)
    expect(result).toBe('payload')
  })

  it('falls back to hard cut when no newline is within the window', () => {
    const text = 'b'.repeat(100)
    const result = trimOutputTail(text, 30, 5)
    expect(result).toBe('b'.repeat(30))
  })

  it('handles empty string', () => {
    expect(trimOutputTail('', 10, 4)).toBe('')
  })
})
