import type { Activity, Mood, Spot, Stage } from '../types'
import type { Pose } from './cat'

// What Mango does while Claude works, and where on her stage she does it. Pure: the
// hooks in register.tsx keep the timers and write the atoms.

export const ACTIVITIES = ['sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const satisfies readonly Activity[]

// An activity lasts this many clock ticks after the call that set it (4.5 s).
export const ACTIVITY_TICKS = 6

export const REST: Stage = { activity: null, from: 'middle', to: 'middle' }

// What each tool sets her doing. A git commit or push is read from a Bash command once
// it has succeeded (gitStepOf), so Bash itself only waits.
export const activityFor = (tool: string): Activity | null => {
  switch (tool) {
    case 'Read':
    case 'Grep':
    case 'Glob':
      return 'sniffing'
    case 'Edit':
    case 'Write':
      return 'watching'
    case 'WebFetch':
    case 'WebSearch':
      return 'peering'
    case 'Bash':
    case 'Agent':
      return 'waiting'
    default:
      return null
  }
}

// Where an activity takes her from the spot she is on. Waiting keeps her there.
export const spotFor = (activity: Activity, current: Spot): Spot => {
  switch (activity) {
    case 'sniffing':
      return 'left'
    case 'peering':
      return 'right'
    case 'waiting':
      return current
    case 'watching':
    case 'pouncing':
    case 'chasing':
      return 'middle'
  }
}

// The stage an activity asks for, starting from where she stands. The same activity keeps
// the stage as it is, so a burst of Reads, or a second commit that returns within one
// clock period, draws nothing new and never restarts a walk.
export const nextStage = (shown: Stage, activity: Activity): Stage =>
  shown.activity === activity ? shown : { activity, from: shown.to, to: spotFor(activity, shown.to) }

// The stage once an activity ends: she stays on the spot she reached.
export const restStage = (s: Stage): Stage => ({ activity: null, from: s.to, to: s.to })

export const sameStage = (a: Stage, b: Stage): boolean => a.activity === b.activity && a.from === b.from && a.to === b.to

// What the band shows. Priority, highest first: a timed mood, an activity, working, the
// resting mood. Under a timed mood no activity shows.
export const showing = (mood: Mood, activity: Activity | null, isWorking: boolean): { pose: Pose; activity: Activity | null } => {
  if (mood === 'ruffled' || mood === 'proud') return { pose: mood, activity: null }
  return { pose: isWorking ? 'working' : mood, activity }
}
