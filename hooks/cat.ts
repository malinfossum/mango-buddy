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

// The theme colour a remark is drawn in, by the pose Mango shows. Theme keys follow the
// person's theme, so these stay readable in light and dark.
export const toneFor = (pose: Pose): string => {
  switch (pose) {
    case 'proud':
      return 'success'
    case 'ruffled':
      return 'error'
    case 'worried':
      return 'warning'
    case 'sleeping':
      return 'suggestion'
    case 'awake':
    case 'working':
      return 'claude'
  }
}

// Awake has no lines: an awake cat shows the context figure instead.
type Voice = Exclude<Mood, 'awake'> | 'purr' | 'yawn'

const REMARKS: Record<Voice, readonly string[]> = {
  sleeping: [
    'Mango is asleep. Type gently.', 'Mango dreams of warm laptops.', 'Mango curls up on the prompt.', 'Mango is off duty.',
    'Mango snores, very softly.', 'Mango tucks her white paws under.', 'Mango twitches. She is chasing a bug in her dreams.',
    'Mango is a loaf now.', 'Mango keeps one ear on the keyboard.', 'Mango sleeps on the warm side of the screen.',
  ],
  ruffled: [
    'Mango did not like that one.', 'Mango flattens her ears.', 'Mango knocks the error off the table.', 'Mango stares at the stack trace.', 'Mango will allow one retry.',
    'Mango fluffs up her ruff.', 'Mango hisses at the exit code.', 'Mango swats at the red text.',
    'Mango turns her back on the terminal.', 'Mango says read it again, slowly.', 'Mango blames the semicolon.',
  ],
  proud: [
    'Mango purrs at the green run.', 'Mango knew you would get it.', 'Mango stretches. Tests pass.', 'Mango sits taller now.', 'Mango is pleased.',
    'Mango slow-blinks at you.', 'Mango kneads in celebration.', 'Mango brings you a green tick.',
    'Mango flicks her tail. Well done.', 'Mango approves this commit.', 'Mango puffs out her white ruff.',
  ],
  worried: [
    'Mango eyes the context meter.', 'Mango thinks this is a lot of context.', 'Mango suggests saving and clearing soon.', 'Mango paces. The window is filling.',
    'Mango counts the tokens twice.', 'Mango says write it down before you forget.', 'Mango wants a fresh session soon.',
    'Mango sits on the memory file to keep it safe.', 'Mango taps the save key with one paw.', 'Mango thinks a recap would fit nicely here.',
  ],
  purr: [
    'Mango purrs.', 'Mango leans into your hand.', 'Mango closes her eyes and rumbles.', 'Mango headbutts the cursor.',
    'Mango rolls over. The belly is a trap.', 'Mango kneads your sleeve.', 'Mango slow-blinks. That means love.',
    'Mango tucks her head under your chin.', 'Mango purrs louder than the fans.', 'Mango lets you stroke her ruff.',
  ],
  yawn: [
    'Mango yawns. That was a long one.', 'Mango checks the clock. Still here.', 'Mango stretches after the long turn.', 'Mango wonders if you need a break too.',
    'Mango yawns and shows every tooth.', 'Mango stretched twice while that ran.', 'Mango thinks water and a stretch would help.',
    'Mango opens one eye. Is it done?', 'Mango groomed both paws while she waited.', 'Mango has counted every star on the ceiling.',
  ],
}

export const remarkFor = (mood: Voice, tick: number): string => {
  const lines = REMARKS[mood]
  return lines[Math.abs(tick) % lines.length] ?? ''
}

// A runner counts only at command position: the start of a line, or after &&, ;, |, ( or a
// backtick, with optional VAR=value prefixes. So `npm install -D vitest` and
// `cat jest.config.js` do not.
const TEST_COMMAND =
  /(^|&&|;|\||\n|\(|`)\s*(\w+=\S*\s+)*((npm|pnpm|yarn|bun)\s+(run\s+)?test|((npx|bunx|bun|npm\s+exec(\s+--)?|pnpm(\s+(exec|dlx))?|yarn(\s+(exec|dlx))?)\s+)?(vitest|jest)|dotnet\s+test)\b/

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
