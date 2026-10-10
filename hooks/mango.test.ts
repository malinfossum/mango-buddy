import { expect, mock, test } from 'claude-code/testing'
import { TICK_MS, SLEEP_AFTER_TICKS } from './cat'

export const SURFACES = ['terminal', 'desktop'] as const

export const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

test('draws two rows of cat and a line on both surfaces', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'mango', surface, component: 'AbovePrompt', props: BAND })
    expect((await ui.find({ key: 'row1' }))?.text?.trimEnd()).toBe(' /\\_/\\')
    expect((await ui.find({ key: 'row2' }))?.text).toMatch(/^\( [o-]\.[o-] \)/)
    expect(await ui.find({ key: 'line' })).toBeDefined()
  }
})

const START = { cwd: 'C:/x', surface: 'desktop' as const, isInteractive: true }

test('the clock ticks and the tail flicks', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const before = (await ui.find({ key: 'row2' }))?.text
  await clock.advance(TICK_MS)
  const after = (await ui.find({ key: 'row2' }))?.text
  expect(after).not.toBe(before)
})

test('sleeps after two idle minutes and a tool call wakes her', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const before = await ui.drawn()
  await clock.advance(TICK_MS * 20)
  expect(await ui.drawn()).toEqual(before)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u2' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
})

// The test's `$` has no `store` noun, so these tests answer the store ops with a Map
// they can read back. A hook must answer a result object, so the value rides in { value }.
const memoryStore = (on: Parameters<Parameters<typeof test>[1]>[1], entries: Record<string, unknown> = {}) => {
  const data = new Map<string, unknown>(Object.entries(entries))
  on('store.get', (_$, e) => ({ value: data.get(e.key) }))
  on('store.set', (_$, e) => { data.set(e.key, e.value); return { value: undefined } })
  return data
}

test('a failed Bash call ruffles Mango and counts an error survived', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { errorsSurvived: 'not a number' })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u3' })
  expect((await ui.find({ key: 'row2' }))?.text).toContain('>.<')
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  expect(data.get('errorsSurvived')).toBe(1)
})

test('a green test run makes Mango proud; ls does not', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let percent = 25
  const toasts: string[] = []
  on('session.usage', () => ({ value: usageAt(percent) }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'boom' }, isError: true }))
  on('prompt.submit', (_$, e) => e)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'u8' })
  expect((await ui.find({ key: 'line' }))?.text).toMatch(/^Mango/)
  await $.prompt.submit({ text: 'hi' })
  expect((await ui.find({ key: 'line' }))?.text).toContain('context 0 %')
})
