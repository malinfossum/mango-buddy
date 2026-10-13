import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import type { On } from 'claude-code'
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
  expect(before?.props.isInteractive).toBe(true)
  // A changed source would reload the frame and restart her animations.
  await clock.advance(TICK_MS)
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(before?.props.source)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'd1' })
  const after = await ui.find({ type: 'Svg' })
  expect(after?.props.alt).toBe('Mango, a black cat, is ruffled.')
  expect(after?.props.source).not.toBe(before?.props.source)
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

test('/mango still and move toggle the flag', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  expect((await run($, 'still')).text).toBe('Mango sits still.')
  expect(data.get('isStill')).toBe(true)
  expect((await run($, 'move')).text).toBe('Mango moves again.')
  expect(data.get('isStill')).toBe(false)
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
