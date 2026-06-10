import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveActiveTerminal,
  rebuildLastActiveByRepo,
  findNeighborTerminalId,
  appendTerminalOutput,
  mergeSnapshotOutput,
  preserveNewerLiveOutputs,
  RENDERER_OUTPUT_MAX_SIZE,
  useTerminalStore
} from '../useTerminalStore'
import type { TerminalOutput } from '../useTerminalStore'
import type { Terminal } from '../../../shared/types'

function makeTerminal(id: string, repoPath = '/repo'): Terminal {
  return { id, name: `Terminal ${id}`, repoPath, status: 'idle', createdAt: new Date() }
}

function makeOutput(overrides: Partial<TerminalOutput> = {}): TerminalOutput {
  return { text: '', totalLength: 0, epoch: 0, ...overrides }
}

// --- Pure function tests ---

describe('appendTerminalOutput', () => {
  it('appends chunk and tracks total length', () => {
    const result = appendTerminalOutput(makeOutput({ text: 'abc', totalLength: 3 }), 'def')
    expect(result.text).toBe('abcdef')
    expect(result.totalLength).toBe(6)
    expect(result.epoch).toBe(0)
  })

  it('starts from empty when there is no current output', () => {
    const result = appendTerminalOutput(undefined, 'hi')
    expect(result.text).toBe('hi')
    expect(result.totalLength).toBe(2)
  })

  it('caps the buffered text but keeps absolute total length', () => {
    const big = 'x'.repeat(RENDERER_OUTPUT_MAX_SIZE)
    let output = appendTerminalOutput(undefined, big)
    output = appendTerminalOutput(output, big)

    expect(output.text.length).toBeLessThanOrEqual(RENDERER_OUTPUT_MAX_SIZE)
    expect(output.totalLength).toBe(big.length * 2)
  })

  it('does not mutate the previous output object', () => {
    const current = makeOutput({ text: 'abc', totalLength: 3 })
    appendTerminalOutput(current, 'def')
    expect(current.text).toBe('abc')
    expect(current.totalLength).toBe(3)
  })
})

describe('mergeSnapshotOutput', () => {
  it('adopts snapshot when renderer has nothing', () => {
    const result = mergeSnapshotOutput(undefined, 'snapshot')
    expect(result.text).toBe('snapshot')
    expect(result.totalLength).toBe(8)
  })

  it('keeps current when snapshot is empty', () => {
    const current = makeOutput({ text: 'live', totalLength: 4 })
    expect(mergeSnapshotOutput(current, '')).toBe(current)
  })

  it('returns current when snapshot equals current text', () => {
    const current = makeOutput({ text: 'same', totalLength: 4 })
    expect(mergeSnapshotOutput(current, 'same')).toBe(current)
  })

  it('extends incrementally when snapshot is ahead (renderer missed events)', () => {
    const current = makeOutput({ text: 'abc', totalLength: 3 })
    const result = mergeSnapshotOutput(current, 'abcdef')
    expect(result.text).toBe('abcdef')
    expect(result.totalLength).toBe(6)
    expect(result.epoch).toBe(current.epoch) // incremental — no redraw needed
  })

  it('keeps current when renderer is ahead (sync raced live output)', () => {
    const current = makeOutput({ text: 'abcdef', totalLength: 6 })
    expect(mergeSnapshotOutput(current, 'abc')).toBe(current)
  })

  it('prefers the longer buffer on divergence and bumps epoch for a redraw', () => {
    const current = makeOutput({ text: 'short', totalLength: 5, epoch: 0 })
    const result = mergeSnapshotOutput(current, 'completely different long output')
    expect(result.text).toBe('completely different long output')
    expect(result.epoch).toBe(1)
    expect(result.totalLength).toBeGreaterThan(current.totalLength)
  })

  it('keeps current on divergence when current is longer', () => {
    const current = makeOutput({ text: 'a much longer live buffer', totalLength: 25 })
    expect(mergeSnapshotOutput(current, 'short')).toBe(current)
  })
})

describe('preserveNewerLiveOutputs', () => {
  it('keeps live entry when it advanced past the reconciled one (append raced sync)', () => {
    const reconciled = new Map([['t1', makeOutput({ text: 'abc', totalLength: 3 })]])
    const live = new Map([['t1', makeOutput({ text: 'abcdef', totalLength: 6 })]])

    const result = preserveNewerLiveOutputs(reconciled, live)
    expect(result.get('t1')).toBe(live.get('t1'))
  })

  it('keeps reconciled entry when epochs differ (snapshot forced a redraw)', () => {
    const reconciled = new Map([['t1', makeOutput({ text: 'snapshot', totalLength: 8, epoch: 1 })]])
    const live = new Map([['t1', makeOutput({ text: 'liveliveliv', totalLength: 11, epoch: 0 })]])

    const result = preserveNewerLiveOutputs(reconciled, live)
    expect(result.get('t1')).toBe(reconciled.get('t1'))
  })

  it('keeps reconciled entry when live is not newer', () => {
    const reconciled = new Map([['t1', makeOutput({ text: 'abcdef', totalLength: 6 })]])
    const live = new Map([['t1', makeOutput({ text: 'abc', totalLength: 3 })]])

    const result = preserveNewerLiveOutputs(reconciled, live)
    expect(result.get('t1')).toBe(reconciled.get('t1'))
  })

  it('ignores live entries for terminals not present in reconciled (killed terminals)', () => {
    const reconciled = new Map([['t1', makeOutput({ text: 'abc', totalLength: 3 })]])
    const live = new Map([
      ['t1', makeOutput({ text: 'abc', totalLength: 3 })],
      ['dead', makeOutput({ text: 'gone', totalLength: 4 })]
    ])

    const result = preserveNewerLiveOutputs(reconciled, live)
    expect(result.has('dead')).toBe(false)
  })
})

describe('resolveActiveTerminal', () => {
  it('keeps current active when still valid', () => {
    const terminals = new Map([['t1', makeTerminal('t1')], ['t2', makeTerminal('t2')]])
    const validIds = new Set(['t1', 't2'])

    expect(resolveActiveTerminal('t1', validIds, terminals)).toBe('t1')
  })

  it('falls back to first terminal when current is invalid', () => {
    const terminals = new Map([['t2', makeTerminal('t2')], ['t3', makeTerminal('t3')]])
    const validIds = new Set(['t2', 't3'])

    expect(resolveActiveTerminal('t1', validIds, terminals)).toBe('t2')
  })

  it('returns null when no terminals exist', () => {
    const terminals = new Map<string, Terminal>()
    const validIds = new Set<string>()

    expect(resolveActiveTerminal('t1', validIds, terminals)).toBeNull()
  })
})

describe('rebuildLastActiveByRepo', () => {
  it('defaults to first terminal per repo', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1', '/a')],
      ['t2', makeTerminal('t2', '/a')],
      ['t3', makeTerminal('t3', '/b')]
    ])
    const result = rebuildLastActiveByRepo(terminals, new Map())

    expect(result.get('/a')).toBe('t1')
    expect(result.get('/b')).toBe('t3')
  })

  it('preserves valid previous selections', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1', '/a')],
      ['t2', makeTerminal('t2', '/a')]
    ])
    const previous = new Map([['a', 't2']]) // wrong key — won't match
    const previousValid = new Map([['/a', 't2']])

    const result = rebuildLastActiveByRepo(terminals, previousValid)
    expect(result.get('/a')).toBe('t2')

    const result2 = rebuildLastActiveByRepo(terminals, previous)
    expect(result2.get('/a')).toBe('t1') // falls back — 'a' ≠ '/a'
  })
})

describe('findNeighborTerminalId', () => {
  it('returns previous terminal when closing the last', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')]
    ])
    expect(findNeighborTerminalId('t3', terminals)).toBe('t2')
  })

  it('returns previous terminal when closing a middle one', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')]
    ])
    expect(findNeighborTerminalId('t2', terminals)).toBe('t1')
  })

  it('returns next terminal when closing the first', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')]
    ])
    expect(findNeighborTerminalId('t1', terminals)).toBe('t2')
  })

  it('returns null when closing the only terminal', () => {
    const terminals = new Map([['t1', makeTerminal('t1')]])
    expect(findNeighborTerminalId('t1', terminals)).toBeNull()
  })

  it('returns first terminal when id is not found', () => {
    const terminals = new Map([['t1', makeTerminal('t1')], ['t2', makeTerminal('t2')]])
    expect(findNeighborTerminalId('missing', terminals)).toBe('t1')
  })

  it('returns null when map is empty and id is not found', () => {
    const terminals = new Map<string, Terminal>()
    expect(findNeighborTerminalId('missing', terminals)).toBeNull()
  })

  it('with repoPath picks same-repo neighbor, ignoring other repos', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1', '/repo-a')],
      ['t2', makeTerminal('t2', '/repo-a')],
      ['t3', makeTerminal('t3', '/repo-b')],
      ['t4', makeTerminal('t4', '/repo-a')]
    ])
    // Closing t2 in /repo-a → neighbor is t1 (same repo, previous)
    expect(findNeighborTerminalId('t2', terminals, '/repo-a')).toBe('t1')
    // Closing t1 in /repo-a → neighbor is t2 (same repo, next)
    expect(findNeighborTerminalId('t1', terminals, '/repo-a')).toBe('t2')
  })

  it('with repoPath returns null when no same-repo terminals remain', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1', '/repo-a')],
      ['t3', makeTerminal('t3', '/repo-b')]
    ])
    // Only terminal in /repo-a → null (don't jump to /repo-b)
    expect(findNeighborTerminalId('t1', terminals, '/repo-a')).toBeNull()
  })
})

// --- Store integration tests ---

describe('useTerminalStore — focus on create', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      terminals: new Map(),
      outputs: new Map(),
      activeTerminalId: null,
      lastActiveByRepo: new Map(),
      syncing: false
    })
  })

  it('setActiveTerminal switches to a new terminal', () => {
    // Set up store with one terminal (simulating existing state)
    const t1 = makeTerminal('t1', '/repo')
    const t2 = makeTerminal('t2', '/repo')

    useTerminalStore.setState({
      terminals: new Map([['t1', t1]]),
      activeTerminalId: 't1',
      lastActiveByRepo: new Map([['/repo', 't1']])
    })

    // Simulate syncFromMain adding a second terminal
    useTerminalStore.setState((state) => ({
      terminals: new Map([...state.terminals, ['t2', t2]])
    }))

    // Simulate the fix: setActiveTerminal(newId) after syncFromMain
    useTerminalStore.getState().setActiveTerminal('t2')

    const state = useTerminalStore.getState()
    expect(state.activeTerminalId).toBe('t2')
    expect(state.lastActiveByRepo.get('/repo')).toBe('t2')
  })

  it('setActiveTerminal updates lastActiveByRepo for the correct repo', () => {
    const t1 = makeTerminal('t1', '/repo-a')
    const t2 = makeTerminal('t2', '/repo-b')

    useTerminalStore.setState({
      terminals: new Map([['t1', t1], ['t2', t2]]),
      activeTerminalId: 't1',
      lastActiveByRepo: new Map([['/repo-a', 't1']])
    })

    useTerminalStore.getState().setActiveTerminal('t2')

    const state = useTerminalStore.getState()
    expect(state.activeTerminalId).toBe('t2')
    expect(state.lastActiveByRepo.get('/repo-b')).toBe('t2')
    expect(state.lastActiveByRepo.get('/repo-a')).toBe('t1') // unchanged
  })
})

describe('useTerminalStore — removeTerminal neighbor focus', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      terminals: new Map(),
      outputs: new Map(),
      activeTerminalId: null,
      lastActiveByRepo: new Map(),
      syncing: false
    })
  })

  it('focuses previous neighbor when closing last of 4 terminals', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')],
      ['t4', makeTerminal('t4')]
    ])

    useTerminalStore.setState({
      terminals,
      activeTerminalId: 't4'
    })

    useTerminalStore.getState().removeTerminal('t4')

    const state = useTerminalStore.getState()
    expect(state.activeTerminalId).toBe('t3')
    expect(state.terminals.has('t4')).toBe(false)
  })

  it('focuses next neighbor when closing the first terminal', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')]
    ])

    useTerminalStore.setState({
      terminals,
      activeTerminalId: 't1'
    })

    useTerminalStore.getState().removeTerminal('t1')

    expect(useTerminalStore.getState().activeTerminalId).toBe('t2')
  })

  it('sets null when closing the only terminal', () => {
    useTerminalStore.setState({
      terminals: new Map([['t1', makeTerminal('t1')]]),
      activeTerminalId: 't1'
    })

    useTerminalStore.getState().removeTerminal('t1')

    expect(useTerminalStore.getState().activeTerminalId).toBeNull()
  })

  it('never activates a cross-repo terminal when closing', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1', '/repo-a')],
      ['t2', makeTerminal('t2', '/repo-b')],
      ['t3', makeTerminal('t3', '/repo-b')]
    ])

    useTerminalStore.setState({
      terminals,
      activeTerminalId: 't1',
      lastActiveByRepo: new Map([['/repo-a', 't1'], ['/repo-b', 't2']])
    })

    // Closing the only /repo-a terminal → should be null, NOT t2 or t3
    useTerminalStore.getState().removeTerminal('t1')

    expect(useTerminalStore.getState().activeTerminalId).toBeNull()
  })

  it('preserves active when removing a non-active terminal', () => {
    const terminals = new Map([
      ['t1', makeTerminal('t1')],
      ['t2', makeTerminal('t2')],
      ['t3', makeTerminal('t3')]
    ])

    useTerminalStore.setState({
      terminals,
      activeTerminalId: 't1'
    })

    useTerminalStore.getState().removeTerminal('t3')

    expect(useTerminalStore.getState().activeTerminalId).toBe('t1')
  })
})
