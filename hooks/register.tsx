import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'
import type { Mood } from '../types'
import { ART_WIDTH, BUDGET_PERCENT, faceFor, frameFor, GAP, isTestCommand, PROUD_TICKS, remarkFor, resolveMood, RUFFLED_TICKS, TICK_MS, toneFor } from './cat'
import { altFor, DRAWING_HEIGHT, DRAWING_WIDTH, drawingFor } from './drawing'

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
// The mood the picture surfaces draw. They never read the tick, which the clock writes
// every period: each redraw rebuilds the picture's frame, and that shows as a blink.
export const shownMood = atom({ plugin: 'mango', key: 'shownMood' } as const, 'awake' as Mood)

const FACE_WIDTH = 5

const flag = (x: unknown): boolean => x === true

// The clock's own count. In still mode the tick atom is only written on a mood
// change, so time is kept here and the atom follows it.
let clockTick = 0

// The running clock, kept so a repeated session.start stops it before starting another.
let clock: Timer | undefined

// The last line the timed-mood and sleep logic wrote to `remark`, kept so expiry and
// waking clear only that line and never a later purr, yawn or worried remark.
let timedRemark: string | null = null
let sleepRemark: string | null = null

// The mood the clock saw on its previous period, to spot the move into sleeping.
let lastMood: Mood = 'awake'

const snapshot = async ($: EngineType, t: number) => ({
  mood: await read($, mood),
  moodUntil: await read($, moodUntil),
  tick: t,
  lastActivityTick: await read($, lastActivityTick),
  contextPercent: await read($, contextPercent),
})

// Clears the sleeping remark if it is still the one showing. Waking calls this.
const clearSleepRemark = async ($: EngineType) => {
  if (sleepRemark === null) return
  const line = sleepRemark
  sleepRemark = null
  if ((await read($, remark)) === line) await update($, remark, () => null)
}

// Writes the mood only when it changes, so the picture is redrawn only then.
const showMood = async ($: EngineType, m: Mood) => {
  if ((await read($, shownMood)) !== m) await update($, shownMood, () => m)
}

// Resolves the mood now. Every write outside the clock that can change it calls this.
const syncShownMood = async ($: EngineType) => showMood($, resolveMood(await snapshot($, clockTick)))

export const markActivity = async ($: EngineType) => {
  const t = clockTick
  await update($, lastActivityTick, () => t)
  await clearSleepRemark($)
  await syncShownMood($)
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
      await $.store.set('isMuted', true)
      await update($, isMuted, () => true)
      return 'Mango is quiet now.'
    case 'unmute':
      await $.store.set('isMuted', false)
      await update($, isMuted, () => false)
      return 'Mango may speak again.'
    case 'still':
      await $.store.set('isStill', true)
      await update($, isStill, () => true)
      return 'Mango sits still.'
    case 'move':
      await $.store.set('isStill', false)
      await update($, isStill, () => false)
      return 'Mango moves again.'
    case 'off':
      await $.store.set('isOff', true)
      await update($, isOff, () => true)
      return 'Mango is away.'
    case 'on':
      await $.store.set('isOff', false)
      await update($, isOff, () => false)
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
  const line = remarkFor(m, t)
  timedRemark = line
  await update($, remark, () => line)
  await syncShownMood($)
}

// One period of the clock. Normal mode writes the tick every period. Still mode writes
// it only when the resolved mood differs from the one the stored tick would draw.
const advanceClock = async ($: EngineType) => {
  clockTick += 1
  const t = clockTick
  let s = await snapshot($, t)
  if ((s.mood === 'ruffled' || s.mood === 'proud') && t >= s.moodUntil) {
    // The timed mood is over: fall back to awake and drop its remark, once.
    await update($, mood, () => 'awake')
    if (timedRemark !== null && (await read($, remark)) === timedRemark) await update($, remark, () => null)
    timedRemark = null
    s = { ...s, mood: 'awake' }
  }
  const now = resolveMood(s)
  await showMood($, now)
  if (await read($, isStill)) {
    const stored = await read($, tick)
    if (now !== resolveMood({ ...s, tick: stored })) await update($, tick, () => t)
  } else {
    await update($, tick, () => t)
  }
  if (now === 'sleeping') {
    if (lastMood !== 'sleeping') {
      const line = remarkFor('sleeping', t)
      sleepRemark = line
      await update($, remark, () => line)
    }
  } else {
    await clearSleepRemark($)
  }
  lastMood = now
}

// Reads the context figure the way turn.complete does. Undefined when usage has no figure.
const readContextPercent = async ($: EngineType): Promise<number | undefined> => {
  const { context } = await $.session.usage()
  const percent =
    context.percent ??
    (context.window > 0 && context.tokens !== undefined ? (context.tokens / context.window) * 100 : undefined)
  return percent === undefined ? undefined : Math.round(percent)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The clock and the command come first: a failing store read must not leave Mango
    // frozen or /mango unregistered. The clock goes first of all, so a failed
    // registration still leaves her moving.
    clockTick = await read($, tick)
    clock?.cancel()
    clock = $.clock.every(TICK_MS, async () => {
      try {
        await advanceClock($)
      } catch {
        // The engine asks the next period either way and never awaits this promise, so
        // the catch only keeps a failed read or write from becoming an unhandled rejection.
      }
    })
    await $.command.register({
      name: 'mango',
      description: 'Pet Mango, or tell her to be still, quiet or away.',
      argumentHint: 'pet | mute | unmute | still | move | off | on | card',
    })

    const storedOff = flag(await $.store.get('isOff'))
    const storedMuted = flag(await $.store.get('isMuted'))
    const storedStill = flag(await $.store.get('isStill'))
    await update($, isOff, () => storedOff)
    await update($, isMuted, () => storedMuted)
    await update($, isStill, () => storedStill)

    if (!(await read($, isSessionCounted))) {
      await bump($, 'sessions')
      await update($, isSessionCounted, () => true)
    }
    try {
      // A resumed session may already be well into its context: show the real figure, no toast.
      const rounded = await readContextPercent($)
      if (rounded !== undefined) await update($, contextPercent, () => rounded)
      await syncShownMood($)
    } catch {
      // usage unavailable: keep the default
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'mango' }, async ($, e) => ({ text: await runCommand($, e.args) }))
    .catch(() => ({ text: 'Mango could not do that.' }))

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
      const rounded = await readContextPercent($)
      if (rounded !== undefined) {
        await update($, contextPercent, () => rounded)
        const over = rounded >= BUDGET_PERCENT
        const was = await read($, wasOverBudget)
        if (over && !was) {
          // Fire and forget: a failed toast fails in its own dispatch, never here.
          $.ui.toast(`Mango: context passed ${BUDGET_PERCENT} %`)
          await update($, remark, () => remarkFor('worried', clockTick))
        }
        if (!over && was) await update($, remark, () => null)
        await update($, wasOverBudget, () => over)
        await syncShownMood($)
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
    const isTerminal = e.surface === 'terminal'
    // Only the terminal reads the tick: its frames change with it. The picture surfaces
    // read the shown mood, so an idle clock period never redraws them.
    const t = isTerminal ? await read($, tick) : 0
    const shown = isTerminal ? resolveMood(await snapshot($, t)) : await read($, shownMood)
    const still = await read($, isStill)
    // In still mode the tick can sit on a blink frame (0 % 8), which would draw an awake
    // cat with closed eyes. Nudge by two so the tail and the z keep their parity.
    const drawTick = still && t % 8 === 0 ? t + 2 : t
    const said = await read($, remark)
    const muted = await read($, isMuted)
    const pose = e.props.isWorking ? 'working' : shown
    const isShort = e.props.maxRows < 3
    // The face is 5 columns wide, the two-row art ART_WIDTH. A band narrower than
    // the art draws the art with an empty line, never a negative slice.
    const room = Math.max(0, e.props.bodyColumns - (isShort ? FACE_WIDTH : ART_WIDTH) - GAP)
    const text = (said ?? `context ${await read($, contextPercent)} %`).slice(0, room)
    // A remark takes the mood's theme colour; the context figure stays dim.
    const tone = said === null ? {} : { color: toneFor(pose) }
    const speech = muted ? null : (
      <>
        <Text>{' '.repeat(GAP)}</Text>
        {/* Text has no `key` prop, so the key lives on the Box around it. */}
        <Box key="line"><Text dimColor={said === null} {...tone}>{text}</Text></Box>
      </>
    )
    if (!isTerminal) {
      // Surfaces that draw an Svg get the picture; a short band gets it at half size. The
      // markup follows the pose, never the tick, so her animations run on between periods.
      // An interactive frame is what lets CSS motion and hover play; still mode is an image.
      const { Svg } = $.ui.resolve(e)
      const scale = isShort ? 0.5 : 1
      return (
        <Box alignItems="center">
          <Box key="cat">
            <Svg source={drawingFor(pose, !still)} alt={altFor(pose)} width={DRAWING_WIDTH * scale} height={DRAWING_HEIGHT * scale} isInteractive={!still} />
          </Box>
          {speech}
        </Box>
      )
    }
    if (isShort) {
      return (
        <Box>
          <Box key="face"><Text>{faceFor(pose, drawTick)}</Text></Box>
          {speech}
        </Box>
      )
    }
    const [row1, row2] = frameFor(pose, drawTick)
    return (
      <Box flexDirection="column">
        <Box key="row1"><Text>{row1}</Text></Box>
        <Box>
          <Box key="row2"><Text>{row2}</Text></Box>
          {speech}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
