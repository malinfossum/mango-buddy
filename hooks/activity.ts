import type { Activity, Mood } from '../types'
import type { Pose } from './cat'

// What Mango does while Claude works. Pure: the hooks in register.tsx keep the timers and
// write the atoms.

export const ACTIVITIES = ['sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const satisfies readonly Activity[]

// An activity lasts this many clock ticks after the call that set it (4.5 s).
export const ACTIVITY_TICKS = 6

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

// What the band shows. Priority, highest first: a timed mood, an activity, working, the
// resting mood. Under a timed mood no activity shows.
export const showing = (mood: Mood, activity: Activity | null, isWorking: boolean): { pose: Pose; activity: Activity | null } => {
  if (mood === 'ruffled' || mood === 'proud') return { pose: mood, activity: null }
  return { pose: isWorking ? 'working' : mood, activity }
}

// At most one activity line per this many ticks (about 10 s).
export const LINE_GAP_TICKS = 14
// A Bash call longer than this many ticks (30 s) that succeeds gets a keep-watch line.
export const KEEP_WATCH_TICKS = 40

export const NAME_MAX = 32

// What a name may show as: printable ASCII only, at most NAME_MAX characters.
export const cleanName = (s: string): string => {
  const ascii = Array.from(s, ch => (ch >= ' ' && ch <= '~' ? ch : '?')).join('')
  return ascii.length > NAME_MAX ? `${ascii.slice(0, NAME_MAX - 3)}...` : ascii
}

// A file's own name: everything after the last / or \, so no folder shows, and no user
// name inside one. A path with no file name gives none.
export const baseName = (path: string): string | null => {
  const name = cleanName(path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1))
  return name.trim() === '' ? null : name
}

// A web address's host only: never the user, password, port, path or query. A URL that
// does not parse, or has no host (file:, mailto:), gives none.
export const hostOf = (url: string): string | null => {
  try {
    const host = new URL(url).hostname
    return host === '' ? null : cleanName(host)
  } catch {
    return null
  }
}

// Each topic has its own first-of-turn line: reading, editing and the web.
export type Topic = 'read' | 'edit' | 'web'

export const topicOf = (tool: string): Topic | null => {
  switch (tool) {
    case 'Read':
    case 'Grep':
    case 'Glob':
      return 'read'
    case 'Edit':
    case 'Write':
      return 'edit'
    case 'WebFetch':
    case 'WebSearch':
      return 'web'
    default:
      return null
  }
}

export const MOMENTS = ['read', 'search', 'edit', 'fetch', 'websearch', 'commit', 'push', 'watch'] as const
export type Moment = (typeof MOMENTS)[number]

// Two or three lines per moment, picked by tick as remarkFor picks. `name` is a basename,
// a host or a number of seconds, already cleaned.
const LINES: Record<Moment, readonly ((name: string) => string)[]> = {
  read: [n => `Mango sniffs at ${n}.`, n => `Mango noses through ${n}.`, n => `Mango gives ${n} a good sniff.`],
  search: [() => 'Mango sniffs around the files.', () => 'Mango follows a scent through the files.', () => 'Mango noses along the folders.'],
  edit: [n => `Mango watches you edit ${n}.`, n => `Mango keeps an eye on ${n}.`, n => `Mango watches ${n} change.`],
  fetch: [n => `Mango peers out at ${n}.`, n => `Mango spots ${n} through the window.`],
  websearch: [() => 'Mango peers out the window.', () => 'Mango watches the web go by.'],
  commit: [() => 'Mango pounces on the commit.', () => 'Mango catches the commit in her paws.'],
  push: [() => 'Mango chases the push out the door.', () => 'Mango runs after the push.'],
  watch: [n => `Mango kept watch for ${n} s.`, n => `Mango sat with you for all ${n} s.`],
}

export const lineFor = (moment: Moment, tick: number, name = ''): string => {
  const lines = LINES[moment]
  const pick = lines[Math.abs(tick) % lines.length]
  return pick === undefined ? '' : pick(name)
}

// The first-of-turn line a looking call may say. Only a Read, Edit or Write file name and
// a WebFetch host are named; Grep and Glob patterns and search queries never are.
export const callLine = (e: { tool: string; file_path?: string; url?: string }, tick: number): string | null => {
  switch (e.tool) {
    case 'Read': {
      const name = baseName(e.file_path ?? '')
      return name === null ? null : lineFor('read', tick, name)
    }
    case 'Grep':
    case 'Glob':
      return lineFor('search', tick)
    case 'Edit':
    case 'Write': {
      const name = baseName(e.file_path ?? '')
      return name === null ? null : lineFor('edit', tick, name)
    }
    case 'WebFetch': {
      const host = hostOf(e.url ?? '')
      return host === null ? null : lineFor('fetch', tick, host)
    }
    case 'WebSearch':
      return lineFor('websearch', tick)
    default:
      return null
  }
}

// A git step counts only at command position, as isTestCommand reads it: the start of a
// line, or after &&, ;, |, ( or a backtick, with optional VAR=value prefixes. git's own
// options may come first (git -C repo commit). So `echo git commit` and `git commit-tree`
// do not count. Each option reads one way only (an -c or -C value never starts with a
// dash, and a word char follows the dashes), so a long run of options cannot make the
// match backtrack exponentially and stall the Bash call.
const GIT_COMMIT = /(^|&&|;|\||\n|\(|`)\s*(\w+=\S*\s+)*git\s+((-[cC]\s+[^\s-]\S*|-{1,2}\w[\w-]*(=\S*)?)\s+)*commit(?![\w-])/
const GIT_PUSH = /(^|&&|;|\||\n|\(|`)\s*(\w+=\S*\s+)*git\s+((-[cC]\s+[^\s-]\S*|-{1,2}\w[\w-]*(=\S*)?)\s+)*push(?![\w-])/

// A command that commits and then pushes counts as the push, its last step.
export const gitStepOf = (command: string): 'commit' | 'push' | null => {
  const c = command.trim()
  if (GIT_PUSH.test(c)) return 'push'
  return GIT_COMMIT.test(c) ? 'commit' : null
}
