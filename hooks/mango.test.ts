import { expect, mock, test } from 'claude-code/testing'
import type { MockClock, TestBody } from 'claude-code/testing'
import type { On } from 'claude-code'
import { ACTIVITY_TICKS } from './activity'
import { TICK_MS, SLEEP_AFTER_TICKS, RUFFLED_TICKS, PROUD_TICKS, remarkFor } from './cat'

export const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

test('the terminal draws two rows of cat and a line', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await ui.find({ key: 'row1' }))?.text?.trimEnd()).toBe(' /\\_/\\')
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/^\( [o-]\.[o-] \)/)
  expect(await ui.find({ key: 'line' })).toBeDefined()
})

// The mood and time logic is the same on every surface, so the tests below that read the
// ASCII rows mount on the terminal. These cover what only the picture surfaces draw.

test('the desktop draws a picture of Mango and a line, no ASCII rows', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const cat = await ui.find({ type: 'Svg' })
  expect(String(cat?.props.source)).toMatch(/^<svg /)
  expect(cat?.props.alt).toBe('Mango, a black cat, is awake.')
  expect(cat?.props.width).toBe(60)
  expect(cat?.props.height).toBe(48)
  expect(String(cat?.props.source)).toContain('<g class="act">')
  expect(await ui.find({ key: 'row1' })).toBeUndefined()
  expect(await ui.find({ key: 'line' })).toBeDefined()
})

test('the desktop picture keeps its markup across ticks and changes with the mood', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const before = await ui.find({ type: 'Svg' })
  expect(before?.props.isInteractive).toBe(false)
  // A changed source would restart her animations.
  await clock.advance(TICK_MS)
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(before?.props.source)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'd1' })
  const after = await ui.find({ type: 'Svg' })
  expect(after?.props.alt).toBe('Mango, a black cat, is ruffled.')
  expect(after?.props.source).not.toBe(before?.props.source)
})

test('the desktop draws Mango as one image, with no hover', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const svgs = await ui.findAll({ type: 'Svg' })
  expect(svgs).toHaveLength(1)
  expect(svgs[0]?.props.isInteractive).toBe(false)
  expect(svgs[0]?.props.width).toBe(60)
  expect(svgs[0]?.props.height).toBe(48)
  expect(String(svgs[0]?.props.source)).not.toContain('class="heart"')
  // A hover Box drawn absolute shows as a popover card above the band (hover probe, 2026-10-16).
  const boxes = await ui.findAll({ type: 'Box' })
  expect(boxes.some(b => b.props.position === 'absolute' || b.props.hover !== undefined)).toBe(false)
})

test('an idle desktop band is not redrawn on every tick', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  // The engine redraws a band when a value it read while drawing is written. On the
  // desktop each redraw rebuilds the picture's frame, which shows as a blink.
  const reads = new Set<string>()
  const writes = new Set<string>()
  let phase: 'draw' | 'idle' | null = null
  on('state.get', (_$, e, next) => { if (phase === 'draw') reads.add(e.key); return next(e) })
  on('state.set', (_$, e, next) => { if (phase === 'idle') writes.add(e.key); return next(e) })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  phase = 'draw'
  await ui.redraw()
  phase = 'idle'
  await clock.advance(TICK_MS * 10)
  phase = null
  expect(reads.size).toBeGreaterThan(0)
  expect([...writes].filter(key => reads.has(key))).toEqual([])
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is awake.')
})

test('the desktop picture falls asleep and a tool call wakes her at once', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '' } }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await clock.advance(TICK_MS * SLEEP_AFTER_TICKS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is asleep.')
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'w1' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is awake.')
})

test('still mode draws the desktop picture as a plain image, without motion', async ($, on) => {
  mock.clock(on)
  memoryStore(on, { isStill: true })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.isInteractive).toBe(false)
  expect(String(cat?.props.source)).not.toContain('<style>')
})

test('a short desktop band draws the picture at half size', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, maxRows: 2 } })
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.width).toBe(30)
  expect(cat?.props.height).toBe(24)
})

test('a remark takes the mood colour and the context figure stays dim', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'mango', surface, component: 'AbovePrompt', props: BAND })
    const figure = await ui.find({ type: 'Text', text: /^context/ })
    expect(figure?.props.dimColor).toBe(true)
    expect(figure?.props.color).toBeUndefined()
  }
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'd2' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'mango', surface, component: 'AbovePrompt', props: BAND })
    expect((await ui.find({ type: 'Text', text: remarkFor('ruffled', 0) }))?.props.color).toBe('error')
  }
})

const START = { cwd: 'C:/x', surface: 'desktop' as const, isInteractive: true }

test('the clock ticks and the tail flicks', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const before = (await ui.find({ key: 'row2' }))?.text
  await clock.advance(TICK_MS)
  const after = (await ui.find({ key: 'row2' }))?.text
  expect(after).not.toBe(before)
})

test('sleeps after two idle minutes and a tool call wakes her', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '' } }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await clock.advance(TICK_MS * SLEEP_AFTER_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/z/)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u1' })
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toMatch(/z/)
})

test('still mode stops tick writes but a mood change still redraws', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on, { isStill: true })
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const before = await ui.drawn()
  await clock.advance(TICK_MS * 20)
  expect(await ui.drawn()).toEqual(before)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u2' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
})

// The test's `$` has no `store` noun, so these tests answer the store ops with a Map
// they can read back. A hook must answer a result object, so the value rides in { value }.
const memoryStore = (on: On, entries: Record<string, unknown> = {}) => {
  const data = new Map<string, unknown>(Object.entries(entries))
  on('store.get', (_$, e) => ({ value: data.get(e.key) }))
  on('store.set', (_$, e) => { data.set(e.key, e.value); return { value: undefined } })
  return data
}

test('a failed Bash call ruffles Mango and counts an error survived', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { errorsSurvived: 'not a number' })
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u3' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  expect(data.get('errorsSurvived')).toBe(1)
})

test('a green test run makes Mango proud; ls does not', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '' } }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u4' })
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('^.^')
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'u5' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('^.^')
})

test('a denied Bash call is neither an error nor a success for Mango', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'no' }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'u6' })
  const row2 = (await ui.find({ key: 'row2' }))?.text ?? ''
  expect(row2).not.toContain('>.<')
  expect(row2).not.toContain('^.^')
  expect(data.has('errorsSurvived')).toBe(false)
})

test('the Bash hook throwing after next still returns the result once', async ($, on) => {
  mock.clock(on)
  let runs = 0
  answerStart(on)
  on('store.set', () => { throw new Error('store down') })
  on('store.get', () => ({ value: undefined }))
  on('tool.call', { tool: 'Bash' }, () => { runs += 1; return { result: { stdout: '', stderr: 'x' }, isError: true } })
  await $.session.start(START)
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u7' })
  expect(ran.isError).toBe(true)
  expect(runs).toBe(1)
})

const usageAt = (percent: number | undefined, window = 200000) => ({
  startedAt: 0,
  context: { window, tokens: percent === undefined ? undefined : (percent / 100) * window, percent },
  rateLimits: [],
})

const TURN = { answer: '', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' as const }

test('crossing 20 % worries Mango and toasts once; dropping below calms her', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let percent = 25
  const toasts: string[] = []
  on('session.usage', () => ({ value: usageAt(percent) }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.turn.complete(TURN)
  expect((await ui.find({ key: 'row2' }))?.text).toContain('O.O')
  await $.turn.complete({ ...TURN, turnId: 't2' })
  expect(toasts).toHaveLength(1)
  percent = 10
  await $.turn.complete({ ...TURN, turnId: 't3' })
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('O.O')
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 10 %')
})

test('percent absent and window 0 leaves the previous value', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let usage = usageAt(15)
  on('session.usage', () => ({ value: usage }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.turn.complete(TURN)
  usage = usageAt(undefined, 0)
  await $.turn.complete({ ...TURN, turnId: 't2' })
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 15 %')
})

test('a long turn gets a yawn, an aborted long turn does not', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  answerStart(on)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.usage', () => ({ value: usageAt(5) }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.turn.complete({ ...TURN, durationMs: 130000, isAborted: true, reason: 'aborted' })
  expect((await ui.find({ key: 'line' }))?.text).not.toMatch(/^Mango/)
  await $.turn.complete({ ...TURN, turnId: 't2', durationMs: 130000 })
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
})

test('submitting a prompt clears the remark', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  on('prompt.submit', (_$, e) => e)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u8' })
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

// Nothing beneath the plugin answers session.start or command.register, so tests that start a session do.
const answerStart = (on: On) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'mango' } }))
}

// The kit's typed `$.command.run` takes the full input, so the origin and presentation are given.
const run = ($: Parameters<TestBody>[0], args: string) => $.command.run({ command: 'mango', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: BAND.bodyColumns } })

test('/mango pet purrs and counts, with sloppy input', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { pets: 2 })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await run($, '  PET ')).text).toBe('Mango purrs.')
  expect(data.get('pets')).toBe(3)
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  expect((await run($, '')).text).toBe('Mango purrs.')
  expect(data.get('pets')).toBe(4)
})

test('/mango off hides the band and on brings it back, and the flag persists', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  // What the engine draws for the band when Mango steps aside: nothing.
  on('ui.render', () => ({ type: 'Box' }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await run($, 'off')).text).toBe('Mango is away.')
  expect(await ui.find({ key: 'row1' })).toBeUndefined()
  expect(data.get('isOff')).toBe(true)
  expect((await run($, 'on')).text).toBe('Mango is back.')
  expect(await ui.find({ key: 'row1' })).toBeDefined()
  expect(data.get('isOff')).toBe(false)
})

test('/mango mute keeps the cat and drops the speech line', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await run($, 'mute')).text).toBe('Mango is quiet now.')
  expect(data.get('isMuted')).toBe(true)
  expect(await ui.find({ key: 'row2' })).toBeDefined()
  expect(await ui.find({ key: 'line' })).toBeUndefined()
  expect((await run($, 'unmute')).text).toBe('Mango may speak again.')
  expect(await ui.find({ key: 'line' })).toBeDefined()
})

test('/mango still, move and auto store how she moves and redraw her', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const cat = async () => (await ui.find({ type: 'Svg' }))?.props
  expect(String((await cat())?.source)).toContain('prefers-reduced-motion:reduce')
  expect((await run($, 'still')).text).toBe('Mango sits still.')
  expect(data.get('motion')).toBe('never')
  expect((await cat())?.isInteractive).toBe(false)
  expect(String((await cat())?.source)).not.toContain('<style>')
  expect((await run($, 'move')).text).toBe('Mango always moves.')
  expect(data.get('motion')).toBe('always')
  expect((await cat())?.isInteractive).toBe(false)
  expect(String((await cat())?.source)).toContain('<style>')
  expect(String((await cat())?.source)).not.toContain('prefers-reduced-motion')
  expect((await run($, 'auto')).text).toBe('Mango follows your system.')
  expect(data.get('motion')).toBe('auto')
  expect(String((await cat())?.source)).toContain('prefers-reduced-motion:reduce')
})

test('an old isStill: true loads as never and is written as motion once', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { isStill: true })
  answerStart(on)
  await $.session.start(START)
  expect(data.get('motion')).toBe('never')
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.isInteractive).toBe(false)
  // Loaded as never: a still picture has no style sheet.
  expect(String(cat?.props.source)).not.toContain('<style>')
})

test('a stored motion wins over an old isStill', async ($, on) => {
  mock.clock(on)
  const kept = memoryStore(on, { isStill: true, motion: 'always' })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).not.toContain('prefers-reduced-motion')
  expect(kept.get('motion')).toBe('always')
})

test('junk stored settings fall back to auto, and a non-true isStill never migrates', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { motion: 'fast', isStill: 'yes' })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.isInteractive).toBe(false)
  expect(String(cat?.props.source)).toContain('prefers-reduced-motion:reduce')
  expect(data.get('motion')).toBe('fast')
})

test('a timed mood beats working on every surface', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  failBash(on)
  await $.session.start(START)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'tw1' })
  const picture = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: true } })
  expect((await picture.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is ruffled.')
  const terminal = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, isWorking: true } })
  expect((await terminal.find({ key: 'row2' }))?.text).toContain('>.<')
})

test('stored flags load at session start, and anything but true counts as false', async ($, on) => {
  mock.clock(on)
  memoryStore(on, { isMuted: true, isOff: 'yes' })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ key: 'row1' })).toBeDefined()
  expect(await ui.find({ key: 'line' })).toBeUndefined()
})

test('/mango card reports stats; unknown words get help', async ($, on) => {
  mock.clock(on)
  memoryStore(on, { sessions: 4, pets: 9, errorsSurvived: 3 })
  answerStart(on)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.usage', () => ({ value: usageAt(12) }))
  await $.session.start(START)
  await $.turn.complete(TURN)
  expect((await run($, 'card')).text).toBe('Mango · sessions 5 · pets 9 · errors survived 3 · context 12 %')
  expect((await run($, 'dance')).text).toContain('pet')
  expect((await run($, 'dance')).text).toBe('Mango knows: pet, mute, unmute, still, move, auto, off, on, card.')
})

test('session.start counts a session once, even when it runs twice', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { sessions: 1 })
  answerStart(on)
  await $.session.start(START)
  await $.session.start(START)
  expect(data.get('sessions')).toBe(2)
})

test('a second session.start does not double the clock', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  // One clock reaches tick 100 and Mango is awake; two clocks would reach tick 200 and she would sleep.
  await clock.advance(TICK_MS * (SLEEP_AFTER_TICKS - 60))
  expect((await ui.find({ key: 'row2' }))?.text).not.toMatch(/z/)
})

test('a failed store write is reported plainly and the live flag does not flip', async ($, on) => {
  mock.clock(on)
  answerStart(on)
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => { throw new Error('store down') })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await run($, 'mute')).text).toBe('Mango could not do that.')
  expect(await ui.find({ key: 'line' })).toBeDefined()
})

test('under three rows Mango is one row: face and line', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, maxRows: 2 } })
  expect(await ui.find({ key: 'row1' })).toBeUndefined()
  expect((await ui.find({ key: 'face' }))?.text).toMatch(/^\(.\..\)$/)
  expect(await ui.find({ key: 'line' })).toBeDefined()
})

test('the speech line is cut to the columns left beside the art', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, bodyColumns: 20 } })
  await run($, 'pet')
  const line = (await ui.find({ key: 'line' }))?.text ?? ''
  expect(line).toBe('Mango pu')
  expect(line.length).toBeLessThanOrEqual(20 - 12)
})

test('the one-row form cuts the line to bodyColumns minus seven', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, maxRows: 2, bodyColumns: 15 } })
  await run($, 'pet')
  expect((await ui.find({ key: 'line' }))?.text).toBe('Mango pu')
})

test('a band narrower than the art draws the art and an empty line', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, bodyColumns: 8 } })
  expect(await ui.find({ key: 'row2' })).toBeDefined()
  expect((await ui.find({ key: 'line' }))?.text ?? '').toBe('')
})

// Time tests. A failed Bash call at tick 0 ruffles Mango until RUFFLED_TICKS; the line is a
// ruffled remark until then and the stats line after.
const failBash = (on: On) => on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))

test('a ruffled mood expires and takes its remark with it', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  failBash(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'e1' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  await clock.advance(TICK_MS * (RUFFLED_TICKS - 1))
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('a proud mood expires and takes its remark with it', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '' } }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'e2' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('^.^')
  await clock.advance(TICK_MS * PROUD_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('^.^')
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('still mode: a ruffled mood expires and takes its remark with it', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on, { isStill: true })
  answerStart(on)
  failBash(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'e3' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
  await clock.advance(TICK_MS * RUFFLED_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('a later remark survives the expiry of a timed mood', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  failBash(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'e4' })
  await run($, 'pet')
  await clock.advance(TICK_MS * RUFFLED_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
})

test('falling asleep sets a sleeping remark and a tool call clears it', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '' } }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await clock.advance(TICK_MS * SLEEP_AFTER_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/z/)
  expect((await ui.find({ key: 'line' }))?.text).toBe(remarkFor('sleeping', SLEEP_AFTER_TICKS))
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'e5' })
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('a prompt wakes a sleeping Mango', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('prompt.submit', (_$, e) => e)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await clock.advance(TICK_MS * SLEEP_AFTER_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/z/)
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toMatch(/z/)
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('still mode: Mango still falls asleep, with her sleeping remark', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on, { isStill: true })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await clock.advance(TICK_MS * SLEEP_AFTER_TICKS)
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/z/)
  expect((await ui.find({ key: 'line' }))?.text).toBe(remarkFor('sleeping', SLEEP_AFTER_TICKS))
})

test('still mode never draws the blink frame on an awake cat', async ($, on) => {
  mock.clock(on)
  memoryStore(on, { isStill: true })
  answerStart(on)
  await $.session.start(START)
  const wide = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await wide.find({ key: 'row2' }))?.text).toMatch(/^\( o\.o \)/)
  const short = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, maxRows: 2 } })
  expect((await short.find({ key: 'face' }))?.text).toBe('(o.o)')
})

test('session.start reads the context figure once, without a toast', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const toasts: string[] = []
  on('session.usage', () => ({ value: usageAt(30) }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 30 %')
  expect(toasts).toHaveLength(0)
})

test('a store failure in session.start still registers /mango and starts the clock', async ($, on) => {
  const clock = mock.clock(on)
  const registered: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => { registered.push(e.name); return { value: { command: 'mango' } } })
  on('store.get', () => { throw new Error('store down') })
  await $.session.start(START)
  expect(registered).toEqual(['mango'])
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const before = (await ui.find({ key: 'row2' }))?.text
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toBe(before)
})

test('a failing toast does not skip the budget bookkeeping', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.usage', () => ({ value: usageAt(25) }))
  let toasts = 0
  on('ui.toast', () => { toasts += 1; throw new Error('toast down') })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.turn.complete(TURN)
  expect((await ui.find({ key: 'line' }))?.text).toBe(remarkFor('worried', 0))
  await $.turn.complete({ ...TURN, turnId: 't2' })
  expect(toasts).toBe(1)
})

test('a failed /mango registration still starts the clock', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => { throw new Error('register down') })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const before = (await ui.find({ key: 'row2' }))?.text
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).not.toBe(before)
})

test('a failed clock period is skipped and the next one still ticks', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  answerStart(on)
  let failNext = false
  on('state.get', (_$, e, next) => {
    if (failNext && e.key === 'moodUntil') {
      failNext = false
      throw new Error('state down')
    }
    return next(e)
  })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/^\( -\.- \)/)
  failNext = true
  await clock.advance(TICK_MS * 2)
  expect(failNext).toBe(false)
  expect((await ui.find({ key: 'row2' }))?.text).toMatch(/^\( o\.o \)/)
})

// Answers every tool call beneath Mango, at once or after some clock ticks, failed or not.
// The test's first hook on an event answers first, so a test that uses this registers no
// other tool.call hook.
type Answer = { ticks?: number; isError?: boolean }
const answerTools = (on: On, clock: MockClock, answer: (e: { tool: string; command?: string }) => Answer = () => ({})) =>
  on('tool.call', async (_$, e) => {
    const a = answer(e)
    if ((a.ticks ?? 0) > 0) await clock.sleep(TICK_MS * (a.ticks ?? 0))
    return a.isError === true ? { isError: true as const, result: 'boom' } : { result: {} }
  })

const AWAKE = 'Mango, a black cat, is awake.'
const SNIFFING = 'Mango, a black cat, sniffs around.'
const WAITING = 'Mango, a black cat, sits and waits.'

const desktop = ($: Parameters<TestBody>[0], props = BAND) => $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props })

test('a Read sets her sniffing, and her mood shows again when it ends', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/home/a/x.ts', tool_use_id: 'a1' })
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(SNIFFING)
  await clock.advance(TICK_MS * (ACTIVITY_TICKS - 2))
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(SNIFFING)
  await clock.advance(TICK_MS)
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe(AWAKE)
  expect(String(cat?.props.source)).toContain('<g class="act">')
})

// Counts writes of the activity atom, the guard against extra redraws (each one restarts her motion).
const countActivityWrites = (on: On) => {
  const count = { writes: 0 }
  on('state.set', (_$, e, next) => { if (e.key === 'activity') count.writes += 1; return next(e) })
  return count
}

test('a burst of five Reads writes the activity once', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countActivityWrites(on)
  answerTools(on, clock)
  await $.session.start(START)
  await desktop($)
  await Promise.all(['a', 'b', 'c', 'd', 'e'].map(n => $.tool.call({ tool: 'Read', file_path: `/r/${n}.ts`, tool_use_id: `b-${n}` })))
  await clock.advance(TICK_MS * 3)
  expect(count.writes).toBe(1)
})

test('a Read and a WebFetch before one period write the activity once, as peering', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countActivityWrites(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/r/f.ts', tool_use_id: 'p1' })
  await $.tool.call({ tool: 'WebFetch', url: 'https://example.com/', prompt: 'p', tool_use_id: 'p2' })
  await clock.advance(TICK_MS)
  expect(count.writes).toBe(1)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, peers out at the web.')
})

test('TodoWrite and other tools leave her be', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countActivityWrites(on)
  answerTools(on, clock)
  await $.session.start(START)
  await desktop($)
  await $.tool.call({ tool: 'TodoWrite', todos: [], tool_use_id: 'n1' })
  await clock.advance(TICK_MS * 2)
  expect(count.writes).toBe(0)
})

test('a Bash call that runs twenty ticks keeps her waiting until six ticks after it ends', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, () => ({ ticks: 20.5 }))
  await $.session.start(START)
  const ui = await desktop($)
  const ran = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'w1' })
  for (let i = 1; i <= 25; i++) {
    await clock.advance(TICK_MS)
    expect((await ui.find({ type: 'Svg' }))?.props.alt, `tick ${i}`).toBe(WAITING)
  }
  await ran
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(AWAKE)
})

test('two parallel Bash calls keep her waiting until both return', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ ticks: e.command === 'quick' ? 4.5 : 10.5 }))
  await $.session.start(START)
  const ui = await desktop($)
  const quick = $.tool.call({ tool: 'Bash', command: 'quick', tool_use_id: 'w2' })
  const slow = $.tool.call({ tool: 'Bash', command: 'slow', tool_use_id: 'w3' })
  // Alone, the quick call would end her wait at tick 10.
  await clock.advance(TICK_MS * 10)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(WAITING)
  await clock.advance(TICK_MS * 5)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(WAITING)
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(AWAKE)
  await Promise.all([quick, slow])
})

test('an Agent keeps her waiting until it returns, plus six ticks', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ ticks: e.tool === 'Agent' ? 10.5 : 0 }))
  await $.session.start(START)
  const ui = await desktop($)
  const ran = $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p', tool_use_id: 'g1' })
  await clock.advance(TICK_MS * 15)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(WAITING)
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(AWAKE)
  await ran
})

test('a long run never puts her to sleep, not even as it ends', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, () => ({ ticks: SLEEP_AFTER_TICKS + 10.5 }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const ran = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 's1' })
  await clock.advance(TICK_MS * (SLEEP_AFTER_TICKS + 10))
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
  await clock.advance(TICK_MS)
  await ran
  await clock.advance(TICK_MS * (ACTIVITY_TICKS + 1))
  expect((await ui.find({ key: 'row2' }))?.text).not.toMatch(/z/)
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})

test('a failed Bash during an activity shows ruffled, not the activity', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ isError: e.tool === 'Bash' }))
  await $.session.start(START)
  const ui = await desktop($, { ...BAND, isWorking: true })
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'f1' })
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(SNIFFING)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'f2' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is ruffled.')
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is ruffled.')
})

test('a git commit that succeeds makes her pounce; a failed one ruffles her', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ isError: e.command === 'git commit -m broken' }))
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'c1' })
  await clock.advance(TICK_MS)
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'c2' })
  await clock.advance(TICK_MS)
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe('Mango, a black cat, pounces on the commit.')
  expect(String(cat?.props.source)).toContain('.act{animation:pounce 0.8s ease-out both}')
  await $.tool.call({ tool: 'Bash', command: 'git commit -m broken', tool_use_id: 'c3' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, is ruffled.')
})

test('a git push that succeeds sends her chasing', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Bash', command: 'git push -u origin feat', tool_use_id: 'c4' })
  await clock.advance(TICK_MS)
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe('Mango, a black cat, chases the push.')
  expect(String(cat?.props.source)).toContain('.act{animation:bounce 1.2s ease-in-out both}')
})

test('the terminal draws an activity in its own rows, and a timed mood beats it', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ isError: e.tool === 'Bash' }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'WebFetch', url: 'https://example.com/', prompt: 'p', tool_use_id: 't1' })
  await clock.advance(TICK_MS)
  expect((await ui.find({ key: 'row2' }))?.text).toContain('( O.O ) >')
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 't2' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
})

test('a failed bookkeeping write never blocks a tool or leaves her waiting', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  on('state.set', (_$, e, next) => {
    if (e.key === 'lastActivityTick') throw new Error('state down')
    return next(e)
  })
  let runs = 0
  answerTools(on, clock, () => { runs += 1; return {} })
  await $.session.start(START)
  const ui = await desktop($)
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'k1' })
  expect(ran.isError).toBeUndefined()
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'k2' })
  expect(runs).toBe(2)
  await clock.advance(TICK_MS * (ACTIVITY_TICKS + 1))
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(AWAKE)
})
