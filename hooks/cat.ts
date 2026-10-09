import type { Mood } from '../types'

export type Pose = Mood | 'working'

export const TICK_MS = 750
export const SLEEP_AFTER_TICKS = 160
export const RUFFLED_TICKS = 8
export const PROUD_TICKS = 12
export const BUDGET_PERCENT = 20
export const ART_WIDTH = 10
export const GAP = 2

const EARS = ' /\\_/\\'

const pad = (s: string): string => (s + '          ').slice(0, ART_WIDTH)

export const frameFor = (pose: Pose, tick: number): [string, string] => {
  switch (pose) {
    case 'awake': {
      const eyes = tick % 8 === 0 ? '( -.- )' : '( o.o )'
      const tail = tick % 2 === 1 ? ' ~' : '  '
      return [pad(EARS), pad(eyes + tail)]
    }
    case 'sleeping':
      return [pad(EARS), pad('( -.- )' + (tick % 2 === 0 ? ' z' : 'zz'))]
    case 'ruffled':
      return [pad(' \\/_\\/'), pad('( >.< ) !')]
    case 'proud':
      return [pad(EARS), pad('( ^.^ ) *')]
    case 'worried':
      return [pad(EARS), pad('( O.O )')]
    case 'working':
      return [pad(EARS), pad(tick % 2 === 0 ? '( o.o )nn' : '( o.o ) nn')]
  }
}

export const faceFor = (pose: Pose, tick: number): string => {
  switch (pose) {
    case 'awake':
      return tick % 8 === 0 ? '(-.-)' : '(o.o)'
    case 'sleeping':
      return '(-.-)'
    case 'ruffled':
      return '(>.<)'
    case 'proud':
      return '(^.^)'
    case 'worried':
      return '(O.O)'
    case 'working':
      return '(o.o)'
  }
}

const REMARKS: Record<Mood | 'purr' | 'yawn', readonly string[]> = {
  awake: ['Mango is watching.', 'Mango sits on the keyboard, just a little.', 'Mango blinks slowly at you.', 'Mango approves of this tab.', 'Mango is here.'],
  sleeping: ['Mango is asleep. Type gently.', 'Mango dreams of warm laptops.', 'Mango curls up on the prompt.', 'Mango is off duty.'],
  ruffled: ['Mango did not like that one.', 'Mango flattens her ears.', 'Mango knocks the error off the table.', 'Mango stares at the stack trace.', 'Mango will allow one retry.'],
  proud: ['Mango purrs at the green run.', 'Mango knew you would get it.', 'Mango stretches. Tests pass.', 'Mango sits taller now.', 'Mango is pleased.'],
  worried: ['Mango eyes the context meter.', 'Mango thinks this is a lot of context.', 'Mango suggests saving and clearing soon.', 'Mango paces. The window is filling.'],
  purr: ['Mango purrs.', 'Mango leans into your hand.', 'Mango closes her eyes and rumbles.', 'Mango headbutts the cursor.'],
  yawn: ['Mango yawns. That was a long one.', 'Mango checks the clock. Still here.', 'Mango stretches after the long turn.', 'Mango wonders if you need a break too.'],
}

export const remarkFor = (mood: Mood | 'purr' | 'yawn', tick: number): string => {
  const lines = REMARKS[mood]
  return lines[Math.abs(tick) % lines.length]
}

const TEST_COMMAND = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(vitest|jest)\b|\bdotnet\s+test\b/

export const isTestCommand = (command: string): boolean => TEST_COMMAND.test(command.trim())

export const resolveMood = (s: {
  mood: Mood
  moodUntil: number
  tick: number
  lastActivityTick: number
  contextPercent: number
}): Mood => {
  const isTimed = s.mood === 'ruffled' || s.mood === 'proud'
  if (isTimed && s.tick < s.moodUntil) return s.mood
  if (s.contextPercent >= BUDGET_PERCENT) return 'worried'
  if (s.tick - s.lastActivityTick >= SLEEP_AFTER_TICKS) return 'sleeping'
  return 'awake'
}
