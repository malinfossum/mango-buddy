import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'
import type { Mood } from '../types'
import { BUDGET_PERCENT, frameFor, isTestCommand, PROUD_TICKS, remarkFor, resolveMood, RUFFLED_TICKS, TICK_MS } from './cat'

type EngineType = EngineInterface

export const tick = atom({ plugin: 'mango', key: 'tick' } as const, 0)
export const mood = atom({ plugin: 'mango', key: 'mood' } as const, 'awake' as Mood)
export const moodUntil = atom({ plugin: 'mango', key: 'moodUntil' } as const, 0)
export const lastActivityTick = atom({ plugin: 'mango', key: 'lastActivityTick' } as const, 0)
export const contextPercent = atom({ plugin: 'mango', key: 'contextPercent' } as const, 0)
export const remark = atom({ plugin: 'mango', key: 'remark' } as const, null as string | null)
export const isSessionCounted = atom({ plugin: 'mango', key: 'isSessionCounted' } as const, false)
export const wasOverBudget = atom({ plugin: 'mango', key: 'wasOverBudget' } as const, false)
export const isOff = atom({ plugin: 'mango', key: 'isOff' } as const, false)
export const isMuted = atom({ plugin: 'mango', key: 'isMuted' } as const, false)
export const isStill = atom({ plugin: 'mango', key: 'isStill' } as const, false)

const flag = (x: unknown): boolean => x === true

// The clock's own count. In still mode the tick atom is only written on a mood
// change, so time is kept here and the atom follows it.
let clockTick = 0

// The running clock, kept so a repeated session.start stops it before starting another.
let clock: Timer | undefined

const snapshot = async ($: EngineType, t: number) => ({
  mood: await read($, mood),
  moodUntil: await read($, moodUntil),
  tick: t,
  lastActivityTick: await read($, lastActivityTick),
  contextPercent: await read($, contextPercent),
})

export const markActivity = async ($: EngineType) => {
  const t = clockTick
  await update($, lastActivityTick, () => t)
}

// Reads the count, adds one and writes it back at the moment of change.
const bump = async ($: EngineType, key: string): Promise<number> => {
  const value = (Number(await $.store.get(key)) || 0) + 1
  await $.store.set(key, value)
  return value
}

const HELP = 'Mango knows: pet, mute, unmute, still, move, off, on, card.'

export const runCommand = async ($: EngineType, args: string): Promise<string> => {
  const word = args.trim().toLowerCase().split(/\s+/)[0] ?? ''
  switch (word) {
    case '':
    case 'pet':
      await bump($, 'pets')
      await update($, remark, () => remarkFor('purr', clockTick))
      return 'Mango purrs.'
    case 'mute':
      await update($, isMuted, () => true)
      await $.store.set('isMuted', true)
      return 'Mango is quiet now.'
    case 'unmute':
      await update($, isMuted, () => false)
      await $.store.set('isMuted', false)
      return 'Mango may speak again.'
    case 'still':
      await update($, isStill, () => true)
      await $.store.set('isStill', true)
      return 'Mango sits still.'
    case 'move':
      await update($, isStill, () => false)
      await $.store.set('isStill', false)
      return 'Mango moves again.'
    case 'off':
      await update($, isOff, () => true)
      await $.store.set('isOff', true)
      return 'Mango is away.'
    case 'on':
      await update($, isOff, () => false)
      await $.store.set('isOff', false)
      return 'Mango is back.'
    case 'card': {
      const n = async (k: string) => Number(await $.store.get(k)) || 0
      return `Mango · sessions ${await n('sessions')} · pets ${await n('pets')} · errors survived ${await n('errorsSurvived')} · context ${await read($, contextPercent)} %`
    }
    default:
      return HELP
  }
}

const setTimedMood = async ($: EngineType, m: 'ruffled' | 'proud', ticks: number) => {
  const t = clockTick
  await update($, mood, () => m)
  await update($, moodUntil, () => t + ticks)
  await update($, remark, () => remarkFor(m, t))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const storedOff = flag(await $.store.get('isOff'))
    const storedMuted = flag(await $.store.get('isMuted'))
    const storedStill = flag(await $.store.get('isStill'))
    await update($, isOff, () => storedOff)
    await update($, isMuted, () => storedMuted)
    await update($, isStill, () => storedStill)
    clockTick = await read($, tick)

    clock?.cancel()
    clock = $.clock.every(TICK_MS, async () => {
      clockTick += 1
      const t = clockTick
      if (!(await read($, isStill))) {
        await update($, tick, () => t)
        return
      }
      const stored = await read($, tick)
      const s = await snapshot($, t)
      if (resolveMood(s) !== resolveMood({ ...s, tick: stored })) await update($, tick, () => t)
    })

    if (!(await read($, isSessionCounted))) {
      await bump($, 'sessions')
      await update($, isSessionCounted, () => true)
    }
    await $.command.register({
      name: 'mango',
      description: 'Pet Mango, or tell her to be still, quiet or away.',
      argumentHint: 'pet | mute | unmute | still | move | off | on | card',
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'mango' }, async ($, e) => ({ text: await runCommand($, e.args) }))
    .catch(($, e, next) => (next.called ? next(e) : { text: HELP }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await markActivity($)
    const isTest = isTestCommand(e.command)
    const ran = await next(e)
    if (ran.deny !== undefined) return ran
    if (ran.isError === true) {
      await setTimedMood($, 'ruffled', RUFFLED_TICKS)
      await bump($, 'errorsSurvived')
    } else if (isTest) {
      await setTimedMood($, 'proud', PROUD_TICKS)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await markActivity($)
    try {
      const { context } = await $.session.usage()
      const percent =
        context.percent ??
        (context.window > 0 && context.tokens !== undefined ? (context.tokens / context.window) * 100 : undefined)
      if (percent !== undefined) {
        const rounded = Math.round(percent)
        await update($, contextPercent, () => rounded)
        const over = rounded >= BUDGET_PERCENT
        const was = await read($, wasOverBudget)
        if (over && !was) {
          await $.ui.toast(`Mango: context passed ${BUDGET_PERCENT} %`)
          await update($, remark, () => remarkFor('worried', clockTick))
        }
        if (!over && was) await update($, remark, () => null)
        await update($, wasOverBudget, () => over)
      }
    } catch {
      // usage unavailable: keep the previous figure
    }
    if (!e.isAborted && e.durationMs > 120000) {
      await update($, remark, () => remarkFor('yawn', clockTick))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    await markActivity($)
    await update($, remark, () => null)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isOff))) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const t = await read($, tick)
    const s = await snapshot($, t)
    const said = await read($, remark)
    const muted = await read($, isMuted)
    const pose = e.props.isWorking ? 'working' : resolveMood(s)
    const [row1, row2] = frameFor(pose, t)
    return (
      <Box flexDirection="column">
        <Box key="row1"><Text>{row1}</Text></Box>
        <Box>
          <Box key="row2"><Text>{row2}</Text></Box>
          {muted ? null : <Text>{'  '}</Text>}
          {muted ? null : (
            <Box key="line"><Text dimColor={said === null}>{said ?? `context ${s.contextPercent} %`}</Text></Box>
          )}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
