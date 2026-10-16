# Mango Reacts to Coding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mango reacts to Claude's tool calls: she sniffs, watches, peers, waits, pounces and chases on a three-spot stage on desktop, with new faces in the terminal and a short line at notable moments.

**Architecture:** Two new pure modules. `hooks/activity.ts` maps tool calls to activities, spots, names and lines. `hooks/stage.ts` builds the desktop picture: the front view from `hooks/drawing.ts` on one of three spots, a walk between them, and a new side view. `hooks/register.tsx` keeps the timers in module state and writes one `stage` atom at most once per clock period. The terminal gets activity rows in `hooks/cat.ts`.

**Tech Stack:** Claude Code function hooks (TypeScript/TSX compiled by the engine), `claude plugin test` with `claude-code/testing`, `claude plugin validate`, `npx -p typescript tsc -p . --noEmit`. No npm dependencies. Browser checks in the `/tmp/mango-render` harness (Node 26 plus headless Brave over CDP).

**Spec:** `docs/superpowers/specs/2026-10-16-mango-reactions-design.md`

## Global Constraints

- No model calls, no network, no telemetry, ASCII only in the terminal, English text, no Buttons or Inputs in the band.
- Only a file's basename (Read, Edit, Write) and a web host (WebFetch) reach the band. Never full paths, Grep or Glob patterns, search queries, command text or output.
- A name is everything after the last `/` or `\`, then printable ASCII (`0x20` to `0x7e`, anything else becomes `?`), at most 32 characters (longer ends in `...`).
- An activity lasts 6 ticks (4.5 s) after its last call. At most one activity line per 14 ticks (about 10 s). Keep-watch needs more than 40 ticks (30 s).
- `stage` is written in one write, at most once per clock period, and only when it changes. The picture reads `stage`, `shownMood`, `motion`, `gait`, never `tick`.
- Stage: one Svg of 180 x 48 px drawn on a 360 x 96 grid; spots left (x 0), middle (x 120), right (x 240); a short band draws it at half size. The move takes 1.2 s.
- Every new hook ends in `.catch(($, e, next) => next(e))`. Bookkeeping around a tool call runs in a try/catch, so a failed write never blocks the call.
- Engine names come from `.claude-plugin/types/claude-code/index.d.ts`, never from memory. Atoms take a string-literal plugin name (`plugin: 'mango'`). `Text` has no `key`, so a test finds a `<Box key>` around it.
- Never ask Malin to turn on Windows animation effects. Motion is checked in the `/tmp/mango-render` harness only.
- Files that contain a backslash (Windows paths in tests) are written with the editor tool, never through a shell heredoc: the Bash tool collapses `\\`.
- No em dashes anywhere. Commits are plain sentences in my voice, in the repo's style ("Add ...", "Show ..."), with no AI attribution or Co-Authored-By line.
- Tests run with `claude plugin test .` (56 pass before Task 2). Types check with `npx -p typescript tsc -p . --noEmit`. Both stay green after every task.

## Review Focus

1. A Bash or Agent call that runs past two minutes: she must not fall asleep while it runs, and must not drop asleep the moment it ends (Task 9, "a long run never puts her to sleep").
2. A path with no file name (`C:\repo\`, `/`, an empty string) must give no line rather than a folder name or `Mango sniffs at .` (Task 3, `baseName` cases; Task 3, `callLine` with `/r/`).
3. A failed bookkeeping write (`state.set` throwing) during a Bash call must still run the tool exactly once and must not leave `runningWaits` above zero, which would keep her waiting forever (Task 9, "a failed bookkeeping write").
4. Stored settings with junk values (`motion: 'fast'`, `gait: 7`, `isStill: 'yes'`) must fall back to the defaults and never migrate a non-`true` still flag (Task 8, "junk falls back").
5. A Bash call that ends exactly at the keep-watch bound (40 ticks) must stay silent; only more than 40 ticks speaks (Task 10, "keeps watch").

---

### Task 1: Probe the hover heart over an image (Malin, by hand) (DONE 2026-10-16)

**Result:** the heart showed on hover, floated, went away and nothing blinked or shifted. But the desktop drew it in a small dark popover card above the band, not beside her head, and it was tiny. An absolute Box revealed by hover is placed as a card outside the band's rows. I dropped hover from this version (the spec's fallback); Tasks 5, 6 and 8 are updated to match. The steps below are kept as the record.

The swap probe is done (2026-10-16): a frame (`isInteractive: true`) blinks on every new source, and an image moves and swaps with no blink. So the stage is always an image, and the hover heart moves to its own picture in an absolute Box that a hover shows. This task checks that layering on the desktop before anything is built on it. All code here is throwaway.

**Files:**
- Throwaway, on branch `spike/hover-heart`: `hooks/register.tsx`
- Modify: `C:\Users\Nugget\.claude\projects\C--Users-Nugget-Documents-Development-GitHub-repos-mango-buddy\memory\reactions-design.md` (record the result)

**Interfaces:**
- Consumes: v1 `hooks/register.tsx` and `drawingFor`.
- Produces: a recorded yes or no. No code is kept.

- [ ] **Step 1: Build the probe on a throwaway branch**

```bash
git checkout -b spike/hover-heart
```

In `hooks/register.tsx`, in the desktop branch of the `ui.render` hook, replace the `<Box key="cat">...</Box>` element with:

```tsx
          <Box key="cat">
            <Svg source={drawingFor(pose, !still)} alt={altFor(pose)} width={DRAWING_WIDTH * scale} height={DRAWING_HEIGHT * scale} isInteractive={false} />
            {/* SPIKE: the hover heart as its own image over Mango. Throwaway. */}
            <Box position="absolute" top={0} left={0} display="none" hover={{ display: 'flex' }}>
              <Svg source={PROBE_HEART} alt="A heart floats over Mango." width={DRAWING_WIDTH * scale} height={DRAWING_HEIGHT * scale} isInteractive={false} />
            </Box>
          </Box>
```

and add above the `register` function:

```ts
// SPIKE: the v1 heart alone on the 120 x 96 grid, floating. No reduced-motion query, so
// it floats on Malin's system too. Throwaway.
const PROBE_HEART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96"><style>@keyframes love{0%{opacity:0;transform:translateY(4px) scale(0.6)}25%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-8px) scale(1)}}.heart{transform-origin:90px 16px;animation:love 1.8s ease-out infinite}</style><path class="heart" d="M 96 14 C 96 10 91 9 90 13 C 89 9 84 10 84 14 C 84 18 90 21 90 23 C 90 21 96 18 96 14 Z" fill="#e5484d"/></svg>'
```

The heart Box has no `key`: a hover applies while the pointer is over the nearest keyed Box, which here is `cat`, so the pointer on Mango shows it.

Run: `npx -p typescript tsc -p . --noEmit`
Expected: tsc prints nothing. Then commit, because the install copies a commit:

```bash
git add hooks/register.tsx
git commit -m "Spike: hover heart as its own image over Mango (throwaway)"
```

- [ ] **Step 2: Reinstall from the folder**

From the repo folder:

```bash
mkdir -p /tmp/mango-store-backup && cp "$USERPROFILE"/.claude/plugins/store/mango_mango-buddy-*.json /tmp/mango-store-backup/
claude plugin uninstall mango@mango-buddy --keep-data
claude plugin install mango@mango-buddy
```

Do not trust `/reload-plugins` or the "nothing to update" line of `claude plugin update`.

- [ ] **Step 3: Find the copy the engine loads**

The engine runs a cached copy, not the repo folder (project memory, cache trap).

```bash
grep -n -A10 '"mango@mango-buddy"' "$USERPROFILE/.claude/plugins/installed_plugins.json"
```

Note `installPath` and `gitCommitSha`. The SHA must be the commit just made (`git rev-parse HEAD`).

- [ ] **Step 4: Check the cache matches the repo's hooks**

Fill in the two values from Step 3 (use forward slashes in the path):

```bash
SHA=<gitCommitSha>
CACHE=<installPath>
for f in hooks/register.tsx hooks/cat.ts hooks/drawing.ts hooks/hooks.json .claude-plugin/plugin.json; do
  if diff <(git show "$SHA:$f" | tr -d '\r') <(tr -d '\r' < "$CACHE/$f") > /dev/null; then echo "same $f"; else echo "DIFFERENT $f"; fi
done
git diff --quiet "$SHA" HEAD -- hooks && echo "hooks unchanged since $SHA"
```

Expected: five `same` lines and `hooks unchanged since ...`. Also check the store file is still in `$USERPROFILE/.claude/plugins/store/`.

- [ ] **Step 5: Ask Malin to check the heart in a NEW session**

Guide her one step at a time and wait for each answer (she is new to probes):

1. Open a new Code-tab session (any folder) and find Mango in the band above the chat box.
2. Rest the mouse pointer on Mango. Does a red heart show beside her head, top right, and float up?
3. Move the pointer away. Does the heart go away?
4. Did anything blink, jump or shift when the heart came or went?

Her Windows animation effects stay off. Mango herself looks still on her system; the probe heart floats anyway because it has no reduced-motion query.

- [ ] **Step 6: Put her normal Mango back**

```bash
git checkout feat/reactions
```

Reinstall as in Step 2, then repeat Steps 3 and 4 with the SHA now the head of `feat/reactions`, and check `grep -c SPIKE "<installPath>/hooks/register.tsx"` prints `0`. Then delete the branch (never pushed):

```bash
git branch -D spike/hover-heart
```

- [ ] **Step 7: Record the answer and decide**

Write one dated line under a new `**Hover probe (date):**` heading in `reactions-design.md` with her words.

- The heart shows on hover, sits beside her head, floats, goes away and nothing jumps: tick this task and go on to Task 2.
- Anything else: **stop here.** Do not start Task 2. Tell Malin what she saw and offer the spec's fallback (drop hover for now) or a new probe. The plan below assumes the overlay works.

---

### Task 2: The activity contract and its pure core

**Files:**
- Modify: `types/index.d.ts`
- Create: `hooks/activity.ts`
- Test: `hooks/activity.test.ts`

**Interfaces:**
- Consumes: `Mood` from `types/index.d.ts`; `Pose` from `hooks/cat.ts`.
- Produces (later tasks rely on these exact names):
  - Types in `types/index.d.ts`: `Activity`, `Spot`, `Motion`, `Gait`, `Stage = { activity: Activity | null; from: Spot; to: Spot }`; `PluginState.mango` gains `stage: Stage`, `motion: Motion`, `gait: Gait` (`isStill` stays until Task 8).
  - `hooks/activity.ts`: `ACTIVITIES` (the six names), `ACTIVITY_TICKS = 6`, `REST: Stage`, `activityFor(tool: string): Activity | null`, `spotFor(activity: Activity, current: Spot): Spot`, `nextStage(shown: Stage, activity: Activity): Stage`, `restStage(s: Stage): Stage`, `sameStage(a: Stage, b: Stage): boolean`, `showing(mood: Mood, activity: Activity | null, isWorking: boolean): { pose: Pose; activity: Activity | null }`.

- [ ] **Step 1: Extend the contract**

Replace `types/index.d.ts` with:

```ts
export type Mood = 'awake' | 'sleeping' | 'ruffled' | 'proud' | 'worried'

// What Mango does while Claude works, layered over her mood.
export type Activity = 'sniffing' | 'watching' | 'peering' | 'waiting' | 'pouncing' | 'chasing'
// Her three places on the desktop stage.
export type Spot = 'left' | 'middle' | 'right'
// auto follows the system's reduced-motion setting; always ignores it; never is a still image.
export type Motion = 'auto' | 'always' | 'never'
export type Gait = 'walk' | 'slide'
// What the desktop picture shows. One atom, so a change is one write and one redraw.
export type Stage = { activity: Activity | null; from: Spot; to: Spot }

declare module 'claude-code' {
  interface PluginState {
    mango: {
      tick: number
      mood: Mood
      moodUntil: number
      lastActivityTick: number
      contextPercent: number
      remark: string | null
      isSessionCounted: boolean
      wasOverBudget: boolean
      isOff: boolean
      isMuted: boolean
      isStill: boolean
      shownMood: Mood
      stage: Stage
      motion: Motion
      gait: Gait
    }
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `hooks/activity.test.ts`:

```ts
import { expect, test } from 'claude-code/testing'
import { activityFor, nextStage, REST, restStage, sameStage, showing, spotFor } from './activity'

test('each tool maps to its activity, and every other tool to none', () => {
  const table = {
    Read: 'sniffing', Grep: 'sniffing', Glob: 'sniffing',
    Edit: 'watching', Write: 'watching',
    WebFetch: 'peering', WebSearch: 'peering',
    Bash: 'waiting', Agent: 'waiting',
  } as const
  for (const [tool, activity] of Object.entries(table)) expect(activityFor(tool), tool).toBe(activity)
  for (const tool of ['TodoWrite', 'NotebookEdit', 'ToolSearch', 'mcp__x__y', '']) expect(activityFor(tool), tool).toBeNull()
})

test('each activity takes her to its spot, and waiting keeps hers', () => {
  for (const from of ['left', 'middle', 'right'] as const) {
    expect(spotFor('sniffing', from)).toBe('left')
    expect(spotFor('peering', from)).toBe('right')
    expect(spotFor('watching', from)).toBe('middle')
    expect(spotFor('pouncing', from)).toBe('middle')
    expect(spotFor('chasing', from)).toBe('middle')
    expect(spotFor('waiting', from)).toBe(from)
  }
})

test('a new activity starts where she stands; the same one changes nothing', () => {
  const left = nextStage(REST, 'sniffing')
  expect(left).toEqual({ activity: 'sniffing', from: 'middle', to: 'left' })
  expect(nextStage(left, 'sniffing')).toBe(left)
  expect(nextStage(left, 'peering')).toEqual({ activity: 'peering', from: 'left', to: 'right' })
  expect(nextStage(left, 'waiting')).toEqual({ activity: 'waiting', from: 'left', to: 'left' })
})

test('an ended activity leaves her on the spot she reached', () => {
  expect(restStage({ activity: 'peering', from: 'left', to: 'right' })).toEqual({ activity: null, from: 'right', to: 'right' })
  expect(sameStage(REST, { ...REST })).toBe(true)
  expect(sameStage(REST, restStage(REST))).toBe(true)
  expect(sameStage(REST, { ...REST, from: 'left' })).toBe(false)
  expect(sameStage(REST, { ...REST, activity: 'waiting' })).toBe(false)
})

test('a timed mood beats an activity, which beats working and the resting mood', () => {
  expect(showing('ruffled', 'sniffing', true)).toEqual({ pose: 'ruffled', activity: null })
  expect(showing('proud', 'waiting', false)).toEqual({ pose: 'proud', activity: null })
  expect(showing('ruffled', null, true)).toEqual({ pose: 'ruffled', activity: null })
  expect(showing('sleeping', 'peering', false)).toEqual({ pose: 'sleeping', activity: 'peering' })
  expect(showing('worried', 'watching', true)).toEqual({ pose: 'working', activity: 'watching' })
  expect(showing('worried', null, true)).toEqual({ pose: 'working', activity: null })
  expect(showing('awake', null, false)).toEqual({ pose: 'awake', activity: null })
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL in `hooks/activity.test.ts` (the module `./activity` does not exist). The 56 existing tests still pass.

- [ ] **Step 4: Write the module**

Create `hooks/activity.ts`:

```ts
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
// the stage as it is, so a burst of Reads, or a second commit inside one window, draws
// nothing new and never restarts a walk.
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
```

- [ ] **Step 5: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all tests pass (56 old plus 5 new); tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add types/index.d.ts hooks/activity.ts hooks/activity.test.ts
git commit -m "Add the activity contract: what Mango does for each tool and where"
```

---

### Task 3: Names, lines and git steps

**Files:**
- Modify: `hooks/activity.ts`
- Test: `hooks/activity.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LINE_GAP_TICKS = 14`, `KEEP_WATCH_TICKS = 40`, `NAME_MAX = 32`, `cleanName(s: string): string`, `baseName(path: string): string | null`, `hostOf(url: string): string | null`, `type Topic = 'read' | 'edit' | 'web'`, `topicOf(tool: string): Topic | null`, `MOMENTS`, `type Moment`, `lineFor(moment: Moment, tick: number, name?: string): string`, `callLine(e: { tool: string; file_path?: string; url?: string }, tick: number): string | null`, `gitStepOf(command: string): 'commit' | 'push' | null`.

- [ ] **Step 1: Write the failing tests**

Write this with the editor tool (it holds backslashes). Change the import line of `hooks/activity.test.ts` to:

```ts
import { activityFor, baseName, callLine, gitStepOf, hostOf, lineFor, MOMENTS, nextStage, REST, restStage, sameStage, showing, spotFor, topicOf } from './activity'
```

Append:

```ts
test('a file shows by its own name only, never its folders', () => {
  expect(baseName('/home/a/x.ts')).toBe('x.ts')
  expect(baseName('C:\\Users\\someone\\x.ts')).toBe('x.ts')
  expect(baseName('C:/Users/someone\\mixed/y.md')).toBe('y.md')
  expect(baseName('x.ts')).toBe('x.ts')
  for (const p of ['/home/a/', 'C:\\repo\\', '', '/', '   ']) expect(baseName(p), JSON.stringify(p)).toBeNull()
})

test('names keep to printable ASCII and 32 characters', () => {
  expect(baseName('/r/caf\u00e9.ts')).toBe('caf?.ts')
  expect(baseName('/r/a\u0007b\nc.ts')).toBe('a?b?c.ts')
  expect(baseName('/r/\u{1F408}.md')).toBe('?.md')
  const long = baseName(`/r/${'a'.repeat(40)}.ts`) ?? ''
  expect(long).toHaveLength(32)
  expect(long.endsWith('...')).toBe(true)
  expect(baseName(`/r/${'b'.repeat(32)}`)).toBe('b'.repeat(32))
})

test('a web line shows the host only', () => {
  expect(hostOf('https://user:secret@docs.example.com:8443/a/b?q=1#h')).toBe('docs.example.com')
  expect(hostOf('https://b\u00fccher.de/')).toMatch(/^[ -~]+$/)
  for (const u of ['not a url', '', 'file:///C:/x/y.ts', 'mailto:a@b.c']) expect(hostOf(u), u).toBeNull()
})

test('each looking call says its own line, and other tools say nothing', () => {
  expect(callLine({ tool: 'Read', file_path: 'C:\\Users\\someone\\register.tsx' }, 0)).toBe('Mango sniffs at register.tsx.')
  expect(callLine({ tool: 'Edit', file_path: '/r/cat.ts' }, 0)).toBe('Mango watches you edit cat.ts.')
  expect(callLine({ tool: 'Write', file_path: '/r/' }, 0)).toBeNull()
  expect(callLine({ tool: 'WebFetch', url: 'https://github.com/x' }, 0)).toBe('Mango peers out at github.com.')
  expect(callLine({ tool: 'WebFetch', url: 'file:///C:/x' }, 0)).toBeNull()
  expect(callLine({ tool: 'Bash' }, 0)).toBeNull()
  expect(callLine({ tool: 'TodoWrite' }, 0)).toBeNull()
  expect([topicOf('Read'), topicOf('Grep'), topicOf('Glob')]).toEqual(['read', 'read', 'read'])
  expect([topicOf('Edit'), topicOf('Write')]).toEqual(['edit', 'edit'])
  expect([topicOf('WebFetch'), topicOf('WebSearch')]).toEqual(['web', 'web'])
  expect([topicOf('Bash'), topicOf('Agent'), topicOf('TodoWrite')]).toEqual([null, null, null])
})

test('search lines never carry a pattern or a query', () => {
  // Plain objects with extra fields, as the engine's events carry them.
  const grep = { tool: 'Grep', pattern: 'hunter2' }
  const glob = { tool: 'Glob', pattern: '**/secret*' }
  const search = { tool: 'WebSearch', query: 'my bank login' }
  for (const t of [0, 1, 2, 3, 4, 5]) {
    for (const c of [grep, glob, search]) {
      const line = callLine(c, t) ?? ''
      expect(line.startsWith('Mango '), c.tool).toBe(true)
      expect(line).not.toMatch(/hunter2|secret|bank/)
    }
  }
})

test('every moment has two or three lines, each starting with Mango, no em dash', () => {
  for (const moment of MOMENTS) {
    const seen = new Set<string>()
    for (let t = 0; t < 6; t++) {
      const line = lineFor(moment, t, 'x.ts')
      expect(line.startsWith('Mango '), moment).toBe(true)
      expect(line).not.toContain('\u2014')
      expect(line).toMatch(/^[ -~]+$/)
      seen.add(line)
    }
    expect(seen.size, moment).toBeGreaterThanOrEqual(2)
    expect(seen.size, moment).toBeLessThanOrEqual(3)
  }
  expect(lineFor('watch', 0, '42')).toBe('Mango kept watch for 42 s.')
  expect(lineFor('commit', 0)).toBe('Mango pounces on the commit.')
  expect(lineFor('push', 0)).toBe('Mango chases the push out the door.')
})

test('git commit and git push count at command position only', () => {
  for (const c of ['git commit -m "x"', 'cd repo && git commit -m x', 'GIT_EDITOR=true git commit', 'git -C repo commit -m x', 'git --no-pager commit', '(git commit -m x)', 'npm test && git commit -am x', '  git commit']) {
    expect(gitStepOf(c), c).toBe('commit')
  }
  for (const c of ['git push', 'git push -u origin feat', 'git commit -m x && git push', 'cd a; git push --force-with-lease']) {
    expect(gitStepOf(c), c).toBe('push')
  }
  for (const c of ['echo git commit', 'echo git push', 'git commit-tree abc', 'git log --grep commit', 'cat git-commit.md', 'cat git-push.md', 'gitk commit', 'git stash push', 'git pushd', 'ls']) {
    expect(gitStepOf(c), c).toBeNull()
  }
})

test('a long run of git options is read without stalling', () => {
  // With an option that reads two ways, each of these takes 2^40 steps and the test hangs.
  expect(gitStepOf(`git ${'--a '.repeat(40)}x`)).toBeNull()
  expect(gitStepOf(`git ${'-C -C '.repeat(20)}x`)).toBeNull()
  expect(gitStepOf(`git ${'-c a=1 '.repeat(40)}x`)).toBeNull()
  expect(gitStepOf(`git ${'--a '.repeat(40)}commit`)).toBe('commit')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL: `baseName`, `callLine`, `gitStepOf`, `hostOf`, `lineFor`, `MOMENTS` and `topicOf` are not exported.

- [ ] **Step 3: Add the names, lines and git steps**

Append to `hooks/activity.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add hooks/activity.ts hooks/activity.test.ts
git commit -m "Add Mango's activity lines, safe names and git steps"
```

---

### Task 4: Activity rows in the terminal

**Files:**
- Modify: `hooks/cat.ts`
- Test: `hooks/cat.test.ts`

**Interfaces:**
- Consumes: `Activity` from `types/index.d.ts`.
- Produces: `type Look = Pose | Activity` in `hooks/cat.ts`; `frameFor(look: Look, tick: number)`, `faceFor(look: Look, tick: number)`, `toneFor(look: Look)` accept every activity. Pose callers keep working unchanged.

- [ ] **Step 1: Write the failing tests**

In `hooks/cat.test.ts`, replace the first test (`frames are two rows of exactly ten columns...`) and the `faces are five columns` test with these, and append the tone test:

```ts
const LOOKS = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working', 'sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const

test('frames are two rows of exactly ten columns for every look and tick', () => {
  for (const look of LOOKS) {
    for (const t of [0, 1, 2, 3, 7, 8, 9, 16]) {
      const [a, b] = frameFor(look, t)
      expect(a.length, `${look} row1 at ${t}`).toBe(10)
      expect(b.length, `${look} row2 at ${t}`).toBe(10)
      expect(a).toMatch(/^[ -~]+$/)
      expect(b).toMatch(/^[ -~]+$/)
    }
  }
})

test('faces are five columns', () => {
  for (const look of LOOKS) expect(faceFor(look, 0).length, look).toBe(5)
})

test('each activity has its own rows, and the busy ones alternate', () => {
  expect(frameFor('sniffing', 0)[1]).toContain('( o.o )..')
  expect(frameFor('sniffing', 1)[1]).toContain('( o.o ).')
  expect(frameFor('watching', 0)[1]).toContain('(o.o  )')
  expect(frameFor('watching', 2)[1]).toContain('(  o.o)')
  expect(frameFor('peering', 0)[1]).toContain('( O.O ) >')
  expect(frameFor('waiting', 0)[1]).toContain('( -.- ) ~')
  expect(frameFor('waiting', 1)[1]).toContain('( -.- ) .')
  expect(frameFor('pouncing', 0)[1]).toContain('( ^o^ ) /')
  expect(frameFor('chasing', 0)[1]).toContain('( >o< )==')
  expect([faceFor('peering', 0), faceFor('waiting', 0), faceFor('pouncing', 0), faceFor('chasing', 0)]).toEqual(['(O.O)', '(-.-)', '(^o^)', '(>o<)'])
  for (const look of ['sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const) {
    expect(frameFor(look, 0)[0].trimEnd(), look).toBe(' /\\_/\\')
  }
})

test('activity lines speak in the claude colour, a pounce or chase in success', () => {
  for (const look of ['sniffing', 'watching', 'peering', 'waiting'] as const) expect(toneFor(look)).toBe('claude')
  expect(toneFor('pouncing')).toBe('success')
  expect(toneFor('chasing')).toBe('success')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL, and `npx -p typescript tsc -p . --noEmit` reports that `'sniffing'` is not assignable to `Pose`.

- [ ] **Step 3: Teach the frames, faces and tones the activities**

In `hooks/cat.ts`, change the first line and the `Pose` export to:

```ts
import type { Activity, Mood } from '../types'

export type Pose = Mood | 'working'
// What the band draws: a pose, or an activity over it.
export type Look = Pose | Activity
```

Change the signatures `frameFor = (pose: Pose, tick: number)`, `faceFor = (pose: Pose, tick: number)` and `toneFor = (pose: Pose)` to take `look: Look`, and rename `switch (pose)` to `switch (look)` in all three. Add these cases.

In `frameFor`, after `case 'working'`:

```ts
    case 'sniffing':
      return [pad(EARS), pad(tick % 2 === 0 ? '( o.o )..' : '( o.o ).')]
    case 'watching':
      // Her eyes follow the edit from side to side, two ticks each way.
      return [pad(EARS), pad(tick % 4 < 2 ? '(o.o  )' : '(  o.o)')]
    case 'peering':
      return [pad(EARS), pad('( O.O ) >')]
    case 'waiting':
      return [pad(EARS), pad(tick % 2 === 0 ? '( -.- ) ~' : '( -.- ) .')]
    case 'pouncing':
      return [pad(EARS), pad('( ^o^ ) /')]
    case 'chasing':
      return [pad(EARS), pad('( >o< )==')]
```

In `faceFor`, after `case 'working'`:

```ts
    case 'sniffing':
    case 'watching':
      return '(o.o)'
    case 'peering':
      return '(O.O)'
    case 'waiting':
      return '(-.-)'
    case 'pouncing':
      return '(^o^)'
    case 'chasing':
      return '(>o<)'
```

In `toneFor`, change the `proud` case and the last group to:

```ts
    case 'proud':
    case 'pouncing':
    case 'chasing':
      return 'success'
```

```ts
    case 'awake':
    case 'working':
    case 'sniffing':
    case 'watching':
    case 'peering':
    case 'waiting':
      return 'claude'
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add hooks/cat.ts hooks/cat.test.ts
git commit -m "Give each activity its own terminal rows and face"
```

---

### Task 5: Front-view looks for the activities

**Files:**
- Modify: `hooks/drawing.ts`
- Create: `hooks/stage.test.ts`
- Create (harness, outside the repo): `/tmp/mango-render/front-check.mjs`

**Interfaces:**
- Consumes: `Look`, `Pose` from `hooks/cat.ts`; `Activity` from `types/index.d.ts`; `ACTIVITIES` from `hooks/activity.ts` (tests only).
- Produces in `hooks/drawing.ts`: exported palette `COAT`, `RIM`, `EAR`, `WHITE`, `AMBER`, `PUPIL`, `NOSE`; `DEFS`; `REDUCED`; `tailStrokes(d: string): string`; `frontView(look: Look, isAnimated: boolean): string` (the drawing's inner markup, no `<svg>`, no style and no heart); `frontStyle(look: Look): string` (keyframes, origins, the look's motion; no hover and no reduced-motion query); `altFor(pose: Pose, activity?: Activity | null): string`. `drawingFor(pose, isAnimated)` keeps its exact output.

`drawing.ts` must keep importing types only: the harness scripts import it straight into Node, which cannot resolve suffix-less value imports.

- [ ] **Step 1: Save the current drawings for a byte check**

Create `/tmp/mango-render/front-check.mjs`:

```js
// Saves drawingFor's output for every pose, or compares it with the saved copy. The
// refactor for the stage must not change the single drawing by one byte (README art).
// Run: cd /tmp/mango-render && node front-check.mjs save   (before)  |  node front-check.mjs compare   (after)
import { drawingFor } from 'file:///C:/Users/Nugget/Documents/Development/GitHub/repos/mango-buddy/hooks/drawing.ts'
import { readFileSync, writeFileSync } from 'node:fs'

const POSES = ['awake', 'working', 'sleeping', 'proud', 'ruffled', 'worried']
const now = POSES.flatMap(p => [drawingFor(p, true), drawingFor(p, false)]).join('\n')
const file = new URL('./front-before.txt', import.meta.url)
if (process.argv[2] === 'save') {
  writeFileSync(file, now)
  console.log('saved', now.length, 'chars')
} else {
  const before = readFileSync(file, 'utf8')
  console.log(before === now ? 'IDENTICAL' : 'CHANGED')
  process.exit(before === now ? 0 : 1)
}
```

Run: `cd /tmp/mango-render && node front-check.mjs save`
Expected: `saved <n> chars`.

- [ ] **Step 2: Write the failing tests**

Create `hooks/stage.test.ts`:

```ts
import { expect, test } from 'claude-code/testing'
import { ACTIVITIES } from './activity'
import { altFor, frontStyle, frontView } from './drawing'

const POSES = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working'] as const
const LOOKS = [...POSES, ...ACTIVITIES]

test('altFor names each activity, and the mood when none shows', () => {
  expect(new Set(ACTIVITIES.map(a => altFor('awake', a))).size).toBe(ACTIVITIES.length)
  expect(altFor('awake', 'sniffing')).toBe('Mango, a black cat, sniffs around.')
  expect(altFor('working', 'peering')).toBe('Mango, a black cat, peers out at the web.')
  expect(altFor('sleeping', null)).toBe('Mango, a black cat, is asleep.')
  expect(altFor('proud')).toBe('Mango, a black cat, is proud.')
})

test('every look moves in its own way', () => {
  expect(new Set(LOOKS.map(frontStyle)).size).toBe(LOOKS.length)
  for (const look of LOOKS) {
    expect(frontStyle(look), look).toMatch(/@keyframes/)
    expect(frontStyle(look), look).not.toContain('prefers-reduced-motion')
    // The stage is drawn as an image, which gets no :hover, so its style carries none.
    expect(frontStyle(look), look).not.toContain(':hover')
  }
})

test('the activities show in the still picture too', () => {
  for (const look of LOOKS) {
    for (const isAnimated of [true, false]) {
      const view = frontView(look, isAnimated)
      expect(view, look).toMatch(/^[ -~]+$/)
      expect(view, look).not.toMatch(/<svg|<style|<script|<image|href=|on[a-z]+=/i)
      expect(view, look).not.toContain('class="heart"')
    }
  }
  expect(frontView('sniffing', false)).toContain('<g transform="translate(0 5)"><g class="head">')
  expect(frontView('peering', false)).not.toBe(frontView('awake', false))
  expect(frontView('waiting', false)).not.toContain('#f2a92e')
  expect(frontView('pouncing', false)).toBe(frontView('pouncing', true))
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL: `frontStyle` and `frontView` are not exported.

- [ ] **Step 4: Split the drawing into a front view and its style, and add the looks**

Edit `hooks/drawing.ts`:

1. Replace the import line with:

```ts
import type { Activity } from '../types'
import type { Look, Pose } from './cat'
```

2. Put `export` in front of `const COAT`, `RIM`, `EAR`, `WHITE`, `AMBER`, `PUPIL`, `NOSE`, `DEFS` and `REDUCED`. Leave `HEART`, the `heart` constant and the `love` keyframes as they are: only the single drawing uses them (the stage has no hover, hover probe 2026-10-16).

3. Replace `tail` with:

```ts
// The three strokes of a tail along a path: rim, coat and a faint highlight.
export const tailStrokes = (d: string): string =>
  `<path d="${d}" stroke="${RIM}" stroke-width="13.4" stroke-linecap="round" fill="none" opacity="0.7"/><path d="${d}" stroke="${COAT}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#3b2a26" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>`

// A raised tail for a proud cat or one on a chase, a low curl for every other look.
const tail = (isRaised: boolean): string => {
  const d = isRaised ? 'M 78 82 C 100 82 112 70 108 54 C 106 46 100 44 96 46' : 'M 78 82 C 102 86 114 76 112 62 C 111 56 106 54 102 56'
  return `<g class="tail">${tailStrokes(d)}</g>`
}
```

4. Replace `ears` with:

```ts
type Ears = 'up' | 'flat' | 'forward'

const EAR_PATHS: Record<Ears, readonly [string, string, string, string]> = {
  up: ['M 28 34 L 30 6 L 48 20 Z', 'M 76 34 L 74 6 L 56 20 Z', 'M 32 28 L 33 13 L 43 21 Z', 'M 72 28 L 71 13 L 61 21 Z'],
  flat: ['M 30 32 L 18 18 L 42 20 Z', 'M 74 32 L 86 18 L 62 20 Z', 'M 30 27 L 23 20 L 37 21 Z', 'M 74 27 L 81 20 L 67 21 Z'],
  // Pricked forward for a cat that peers: taller, narrower, turned in.
  forward: ['M 30 32 L 35 3 L 49 20 Z', 'M 74 32 L 69 3 L 55 20 Z', 'M 34 27 L 36 10 L 44 21 Z', 'M 70 27 L 68 10 L 60 21 Z'],
}

const ears = (kind: Ears): string => {
  const [l, r, li, ri] = EAR_PATHS[kind]
  const ear = (side: string, outer: string, inner: string) =>
    `<g class="perk-${side}"><g class="ear-${side}"><path d="${outer}" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/><path d="${inner}" fill="${EAR}"/></g></g>`
  return ear('l', l, li) + ear('r', r, ri)
}

const earsFor = (look: Look): Ears => (look === 'ruffled' ? 'flat' : look === 'peering' ? 'forward' : 'up')
```

5. Change `mark = (pose: Pose, isAnimated: boolean)` to `mark = (look: Look, isAnimated: boolean)` and `switch (pose)` to `switch (look)` (its `default` already returns `''` for the activities).

6. Replace `eyesFor` with:

```ts
const eyesFor = (look: Look): Eyes => {
  switch (look) {
    case 'awake':
    case 'working':
    case 'sniffing':
    case 'watching':
      return 'open'
    case 'sleeping':
    case 'waiting':
      return 'closed'
    case 'ruffled':
      return 'squint'
    case 'proud':
    case 'pouncing':
      return 'happy'
    case 'worried':
    case 'peering':
    case 'chasing':
      return 'wide'
  }
}
```

7. Add after `KEYFRAMES`:

```ts
// Keyframes only the activity looks use. Kept apart so the single drawing stays as it is.
const LOOK_KEYFRAMES = [
  '@keyframes sniff{0%,100%{transform:translateY(0)}50%{transform:translateY(1.5px)}}',
  '@keyframes follow{0%,100%{transform:translateX(-2.5px)}50%{transform:translateX(2.5px)}}',
  '@keyframes tap{0%,55%,100%{transform:rotate(0)}70%{transform:rotate(8deg)}85%{transform:rotate(-2deg)}}',
].join('')
```

8. Change `motionFor = (pose: Pose)` to `motionFor = (look: Look)`, `switch (pose)` to `switch (look)`, and add these cases after `worried`:

```ts
    case 'sniffing':
      // Head low, nose working: the head dips in quick small sniffs.
      return '.body{animation:breathe 3.2s ease-in-out infinite}.head{animation:sniff 0.6s ease-in-out infinite}' + tailMoves('sway', 4.4)
    case 'watching':
      return breath('breathe', 3.2) + tailMoves('sway', 4.4) + blink + '.pupil{animation:follow 2.4s ease-in-out infinite}'
    case 'peering':
      return breath('breathe', 2.6) + tailMoves('sway', 3) + '.ear-l{animation:twitch-l 3s ease-in-out infinite}.ear-r{animation:twitch-r 3.4s ease-in-out infinite}'
    case 'waiting':
      // She sits with her eyes closed; only the tail tip taps.
      return breath('breathe', 4) + '.tail{animation:tap 1.4s ease-in-out infinite}'
    case 'pouncing':
      return breath('breathe', 1.6) + tailMoves('flick', 0.9)
    case 'chasing':
      return breath('breathe', 1.2) + tailMoves('sway', 1)
```

9. Replace `styleFor`, `altFor` and `drawingFor` with:

```ts
// A look's style for the stage: everything but hover, which a picture drawn as an image
// never gets, and the reduced-motion query, which the stage adds or leaves out by the
// motion setting.
export const frontStyle = (look: Look): string => `${KEYFRAMES}${LOOK_KEYFRAMES}${ORIGINS}${motionFor(look)}`

// The front view's markup on the 120 x 96 grid, without the <svg> around it, a style or
// the heart (the stage has no hover).
// Sniffing lowers her head; everything else about a look is in its eyes, ears and motion.
export const frontView = (look: Look, isAnimated: boolean): string => {
  const headGroup = `<g class="head">${ears(earsFor(look))}${head}${ruff}${eyes(eyesFor(look))}${face}</g>`
  return (
    tail(look === 'proud' || look === 'chasing') +
    body +
    paws +
    (look === 'sniffing' ? `<g transform="translate(0 5)">${headGroup}</g>` : headGroup) +
    mark(look, isAnimated)
  )
}

// What a reader that cannot see the picture is told: the activity when one shows, else
// the same mood the ASCII shows.
export const altFor = (pose: Pose, activity: Activity | null = null): string => {
  switch (activity) {
    case 'sniffing':
      return 'Mango, a black cat, sniffs around.'
    case 'watching':
      return 'Mango, a black cat, watches the code change.'
    case 'peering':
      return 'Mango, a black cat, peers out at the web.'
    case 'waiting':
      return 'Mango, a black cat, sits and waits.'
    case 'pouncing':
      return 'Mango, a black cat, pounces on the commit.'
    case 'chasing':
      return 'Mango, a black cat, chases the push.'
    case null:
      break
  }
  switch (pose) {
    case 'awake':
      return 'Mango, a black cat, is awake.'
    case 'sleeping':
      return 'Mango, a black cat, is asleep.'
    case 'ruffled':
      return 'Mango, a black cat, is ruffled.'
    case 'proud':
      return 'Mango, a black cat, is proud.'
    case 'worried':
      return 'Mango, a black cat, is worried.'
    case 'working':
      return 'Mango, a black cat, kneads while Claude works.'
  }
}

// The single drawing, as the README art and v1 drew it, heart and hover included.
export const drawingFor = (pose: Pose, isAnimated: boolean): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96">` +
  DEFS +
  (isAnimated ? `<style>${KEYFRAMES}${ORIGINS}${motionFor(pose)}${HOVER}${REDUCED}</style>` : '') +
  frontView(pose, isAnimated) +
  heart +
  `</svg>`
```

- [ ] **Step 5: Check the single drawing did not change**

Run: `cd /tmp/mango-render && node front-check.mjs compare`
Expected: `IDENTICAL`. If it prints `CHANGED`, the refactor moved a byte: diff the two outputs and fix `drawing.ts` until it is identical. Do not update the saved copy.

- [ ] **Step 6: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 7: Commit**

```bash
git add hooks/drawing.ts hooks/stage.test.ts
git commit -m "Give Mango's front view a look for each activity"
```

---

### Task 6: The stage, with the slide gait

**Files:**
- Create: `hooks/stage.ts`
- Test: `hooks/stage.test.ts`

**Interfaces:**
- Consumes: `frontView`, `frontStyle`, `DEFS`, `REDUCED` from `hooks/drawing.ts`; `Look`, `Pose` from `hooks/cat.ts`; `Activity`, `Gait`, `Motion`, `Spot` from `types/index.d.ts`.
- Produces: `STAGE_WIDTH = 180`, `STAGE_HEIGHT = 48`, `type StageInput = { pose: Pose; activity: Activity | null; from: Spot; to: Spot; motion: Motion; gait: Gait }`, `stageFor(s: StageInput): string`. In this task both gaits move the front view (the slide); Task 7 gives `walk` its own drawing.

Markup, so later tasks and tests can rely on it: `<g class="spot" transform="translate(X 0)">` holds `<g class="act">`, which holds `<g class="front">` around a nested 120 x 96 `<svg>`. The nested viewport keeps every transform origin of the front view where it is on the single drawing.

- [ ] **Step 1: Write the failing tests**

Append to `hooks/stage.test.ts`, and add `import { stageFor } from './stage'` and `import type { StageInput } from './stage'` to its imports:

```ts
const BASE: StageInput = { pose: 'awake', activity: null, from: 'middle', to: 'middle', motion: 'auto', gait: 'slide' }

test('the stage is a self-contained ASCII picture, the same for the same inputs', () => {
  for (const motion of ['auto', 'always', 'never'] as const) {
    for (const activity of [null, ...ACTIVITIES]) {
      const svg = stageFor({ ...BASE, motion, activity, from: 'left', to: 'right' })
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" width="360" height="96">')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).not.toMatch(/<script|<image|href=|on[a-z]+=|url\((?!#coat\))/i)
      expect(svg).toMatch(/^[ -~]+$/)
      expect(svg).toBe(stageFor({ ...BASE, motion, activity, from: 'left', to: 'right' }))
    }
  }
})

test('she rests on her spot by its own attribute, and walks only when the spot changes', () => {
  for (const [to, x] of [['left', 0], ['middle', 120], ['right', 240]] as const) {
    const svg = stageFor({ ...BASE, from: to, to })
    expect(svg).toContain(`<g class="spot" transform="translate(${x} 0)">`)
    expect(svg).not.toContain('@keyframes move')
  }
  const moving = stageFor({ ...BASE, activity: 'peering', from: 'left', to: 'right' })
  expect(moving).toContain('<g class="spot" transform="translate(240 0)">')
  expect(moving).toContain('@keyframes move{from{transform:translateX(0px)}to{transform:translateX(240px)}}')
  expect(moving).toContain('.spot{animation:move 1.2s linear both}')
})

test('motion decides the style sheet and the reduced-motion query', () => {
  const never = stageFor({ ...BASE, motion: 'never', activity: 'peering', from: 'left', to: 'right' })
  expect(never).not.toContain('<style>')
  expect(never).toContain('<g class="spot" transform="translate(240 0)">')
  expect(stageFor({ ...BASE, motion: 'always' })).toContain('<style>')
  expect(stageFor({ ...BASE, motion: 'always' })).not.toContain('prefers-reduced-motion')
  expect(stageFor({ ...BASE, motion: 'auto' })).toContain('prefers-reduced-motion:reduce')
  for (const motion of ['auto', 'always', 'never'] as const) {
    expect(stageFor({ ...BASE, motion }), motion).not.toContain('class="heart"')
  }
})

test('a slide carries the front view with a bob and stepping paws', () => {
  const slide = stageFor({ ...BASE, motion: 'always', activity: 'sniffing', from: 'middle', to: 'left' })
  expect(slide).toContain('slide-bob 0.3s ease-in-out 0s 4')
  expect(slide).toContain('.paw-l{animation:knead 0.3s ease-in-out 0s 4}')
  expect(slide).toContain('.paw-r{animation:knead 0.3s ease-in-out 0.15s 4}')
  expect(stageFor({ ...BASE, motion: 'always', activity: 'sniffing', from: 'left', to: 'left' })).not.toContain('slide-bob 0.3s')
})

test('a pounce or a chase plays once, after the walk to the middle', () => {
  expect(stageFor({ ...BASE, motion: 'always', activity: 'pouncing' })).toContain('.act{animation:pounce 0.8s ease-out 0s both}')
  expect(stageFor({ ...BASE, motion: 'always', activity: 'pouncing', from: 'left' })).toContain('.act{animation:pounce 0.8s ease-out 1.2s both}')
  const chase = stageFor({ ...BASE, motion: 'always', activity: 'chasing', from: 'right' })
  expect(chase).toContain('@keyframes dash{0%,100%{transform:translateX(0)}50%{transform:translateX(120px)}}')
  expect(chase).toContain('.act{animation:dash 1.2s ease-in-out 1.2s both}')
  const still = stageFor({ ...BASE, motion: 'never', activity: 'pouncing', from: 'left' })
  expect(still).not.toContain('pounce')
  expect(still).toContain('<g class="spot" transform="translate(120 0)">')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL: the module `./stage` does not exist.

- [ ] **Step 3: Write the stage**

Create `hooks/stage.ts`:

```ts
import type { Activity, Gait, Motion, Spot } from '../types'
import type { Look, Pose } from './cat'
import { DEFS, frontStyle, frontView, REDUCED } from './drawing'

// Mango's stage on the picture surfaces: three spots, each as wide as she is, on a
// 360 x 96 grid shown at half that. A new picture walks her once from the spot she was
// on to the new one; without motion she simply stands on the new spot. Pure: the same
// inputs give the same string.

export const STAGE_WIDTH = 180
export const STAGE_HEIGHT = 48

export type StageInput = { pose: Pose; activity: Activity | null; from: Spot; to: Spot; motion: Motion; gait: Gait }

const SPOT_X: Record<Spot, number> = { left: 0, middle: 120, right: 240 }
const RIGHT_EDGE = 240

// Seconds.
const MOVE = 1.2
const DASH = 1.2
const POUNCE = 0.8
const BOB = 0.3

// Seconds as CSS writes them, rounded so 1.2 + 0.6 never prints as 1.7999999999999998s.
const sec = (n: number): string => `${Math.round(n * 100) / 100}s`

// Each view sits in a 120 x 96 viewport of its own, so the drawing's transform origins
// stay where they are on the single picture wherever the stage puts her.
const view = (inner: string): string => `<svg width="120" height="96" viewBox="0 0 120 96" overflow="visible">${inner}</svg>`

const STAGE_KEYFRAMES = [
  '@keyframes slide-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}',
  '@keyframes pounce{0%,100%{transform:translateY(0) scaleY(1)}25%{transform:translateY(0) scaleY(0.9)}55%{transform:translateY(-6px) scaleY(1.04)}80%{transform:translateY(0) scaleY(0.96)}}',
  // A crouch squashes her down onto the floor of the stage.
  '.act{transform-origin:0 96px}',
].join('')

const stageStyle = (s: StageInput): string => {
  const anims = new Map<string, string[]>()
  const add = (selector: string, animation: string) => anims.set(selector, [...(anims.get(selector) ?? []), animation])
  const rules = [STAGE_KEYFRAMES]

  // How she travels for `seconds` from `delay` on: the front view bobs and her paws step.
  const travel = (delay: number, seconds: number) => {
    const steps = Math.round(seconds / BOB)
    add('.front', `slide-bob ${sec(BOB)} ease-in-out ${sec(delay)} ${steps}`)
    add('.paw-l', `knead ${sec(BOB)} ease-in-out ${sec(delay)} ${steps}`)
    add('.paw-r', `knead ${sec(BOB)} ease-in-out ${sec(delay + BOB / 2)} ${steps}`)
  }

  let start = 0
  if (s.from !== s.to) {
    rules.push(`@keyframes move{from{transform:translateX(${SPOT_X[s.from]}px)}to{transform:translateX(${SPOT_X[s.to]}px)}}`)
    add('.spot', `move ${sec(MOVE)} linear both`)
    travel(0, MOVE)
    start = MOVE
  }
  // A pounce or a chase starts once she has reached her spot, and plays once.
  if (s.activity === 'pouncing') add('.act', `pounce ${sec(POUNCE)} ease-out ${sec(start)} both`)
  if (s.activity === 'chasing') {
    rules.push(`@keyframes dash{0%,100%{transform:translateX(0)}50%{transform:translateX(${RIGHT_EDGE - SPOT_X[s.to]}px)}}`)
    add('.act', `dash ${sec(DASH)} ease-in-out ${sec(start)} both`)
    travel(start, DASH)
  }
  for (const [selector, list] of anims) rules.push(`${selector}{animation:${list.join(',')}}`)
  return rules.join('')
}

export const stageFor = (s: StageInput): string => {
  const look: Look = s.activity ?? s.pose
  const isAnimated = s.motion !== 'never'
  const style = isAnimated ? `<style>${frontStyle(look)}${stageStyle(s)}${s.motion === 'auto' ? REDUCED : ''}</style>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" width="360" height="96">` +
    DEFS +
    style +
    `<g class="spot" transform="translate(${SPOT_X[s.to]} 0)"><g class="act">` +
    `<g class="front">${view(frontView(look, isAnimated))}</g>` +
    `</g></g></svg>`
  )
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add hooks/stage.ts hooks/stage.test.ts
git commit -m "Add Mango's three-spot stage, with a slide between spots"
```

---

### Task 7: The walk: a side view with a trot

**Files:**
- Modify: `hooks/stage.ts`
- Test: `hooks/stage.test.ts`
- Create (harness, outside the repo): `/tmp/mango-render/ts-ext.mjs`, `/tmp/mango-render/stage-check.mjs`

**Interfaces:**
- Consumes: `COAT`, `RIM`, `EAR`, `WHITE`, `AMBER`, `PUPIL`, `NOSE`, `tailStrokes` from `hooks/drawing.ts`.
- Produces: with `gait: 'walk'` and motion allowed, a moving or chasing stage holds `<g class="side-r" opacity="0">` and `<g class="side-l" opacity="0">` (the same side view, mirrored) beside `.front`. `.side-r`/`.side-l` show (`shown`) while she travels that way and `.front` hides (`hidden`) for the same time. A slide, a picture without a move or a chase, and `never` hold no side view.

- [ ] **Step 1: Write the failing tests**

Append to `hooks/stage.test.ts`:

```ts
test('walking shows the side view while she moves, facing her way, then the front again', () => {
  const right = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'peering', from: 'middle', to: 'right' })
  expect(right).toContain('<g class="side-r" opacity="0">')
  expect(right).toContain('<g class="side-l" opacity="0"><g transform="translate(120 0) scale(-1 1)">')
  expect(right).toContain('.side-r{animation:shown 1.2s linear 0s}')
  expect(right).toContain('.front{animation:hidden 1.2s linear 0s}')
  expect(right).not.toContain('.side-l{animation')
  expect(right).not.toContain('slide-bob 0.3s')
  const left = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'sniffing', from: 'middle', to: 'left' })
  expect(left).toContain('.side-l{animation:shown 1.2s linear 0s}')
  expect(left).not.toContain('.side-r{animation')
})

test('a walking chase runs right, turns and comes back', () => {
  const chase = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'chasing' })
  expect(chase).toContain('.side-r{animation:shown 0.6s linear 0s}')
  expect(chase).toContain('.side-l{animation:shown 0.6s linear 0.6s}')
  expect(chase).toContain('.front{animation:hidden 0.6s linear 0s,hidden 0.6s linear 0.6s}')
  const after = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'chasing', from: 'left' })
  expect(after).toContain('.side-r{animation:shown 1.2s linear 0s,shown 0.6s linear 1.2s}')
  expect(after).toContain('.side-l{animation:shown 0.6s linear 1.8s}')
})

test('only a walk that moves or chases draws the side view', () => {
  const moving = { ...BASE, activity: 'peering', from: 'middle', to: 'right' } as const
  expect(stageFor({ ...moving, gait: 'slide', motion: 'always' })).not.toContain('class="side-')
  expect(stageFor({ ...moving, gait: 'walk', motion: 'never' })).not.toContain('class="side-')
  expect(stageFor({ ...BASE, gait: 'walk', motion: 'always' })).not.toContain('class="side-')
  expect(stageFor({ ...moving, gait: 'walk', motion: 'auto' })).toContain('prefers-reduced-motion:reduce')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL: no `side-r` in the markup.

- [ ] **Step 3: Draw the side view and swap it in while she walks**

In `hooks/stage.ts`:

1. Change the drawing import to:

```ts
import { AMBER, COAT, DEFS, EAR, frontStyle, frontView, NOSE, PUPIL, REDUCED, RIM, tailStrokes, WHITE } from './drawing'
```

2. Add after `view`:

```ts
// Mango from the side, facing right, on the front view's 120 x 96 grid: long black coat
// with the same rim and gradient, white ruff, four legs with white paws, an amber eye and
// a raised tail. The legs trot in diagonal pairs: leg-a is the near hind and far fore,
// leg-b the far hind and near fore. The far legs sit behind the body, a shade darker.
const leg = (pair: 'a' | 'b', x: number, isFar: boolean): string =>
  `<g class="leg-${pair}"${isFar ? ' opacity="0.75"' : ''}><path d="M ${x - 3.5} 64 L ${x - 3.5} 84 Q ${x} 88 ${x + 3.5} 84 L ${x + 3.5} 64 Z" fill="${COAT}" stroke="${RIM}" stroke-width="1.2"/><ellipse cx="${x}" cy="86" rx="5" ry="3" fill="${WHITE}"/></g>`

const SIDE =
  `<g class="side-tail">${tailStrokes('M 34 60 C 16 58 10 40 16 26 C 19 20 25 21 25 27')}</g>` +
  leg('b', 36, true) +
  leg('a', 76, true) +
  `<g class="side-trunk">` +
  `<ellipse cx="58" cy="62" rx="30" ry="14" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>` +
  `<path d="M 78 52 L 90 60 L 84 62 L 90 70 L 80 68 L 76 60 Z" fill="${WHITE}"/>` +
  `<path d="M 80 34 L 82 16 L 92 28 Z" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<circle cx="90" cy="44" r="15" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>` +
  `<path d="M 88 32 L 94 14 L 100 32 Z" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/><path d="M 91 29 L 94 19 L 97 29 Z" fill="${EAR}"/>` +
  `<ellipse cx="97" cy="42" rx="3.4" ry="3" fill="${AMBER}"/><ellipse cx="97.6" cy="42" rx="1" ry="2.6" fill="${PUPIL}"/>` +
  `<path d="M 104 47 L 106 49.5 L 103 50 Z" fill="${NOSE}"/>` +
  `<g stroke="${WHITE}" stroke-width="0.9" stroke-linecap="round" opacity="0.8"><path d="M 100 49 L 116 46"/><path d="M 100 51 L 115 53"/></g>` +
  `</g>` +
  leg('b', 82, false) +
  leg('a', 42, false)

// One trot cycle is two steps.
const STEP = 0.5
const SIDE_STYLE = [
  '@keyframes shown{from,to{opacity:1}}',
  '@keyframes hidden{from,to{opacity:0}}',
  '@keyframes trot{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-14deg)}}',
  '@keyframes step-bob{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-1.2px)}}',
  '.leg-a,.leg-b{transform-box:fill-box;transform-origin:50% 0}',
  '.side-tail{transform-origin:34px 60px}',
  `.leg-a{animation:trot ${sec(STEP)} linear infinite}.leg-b{animation:trot ${sec(STEP)} linear ${sec(-STEP / 2)} infinite}`,
  `.side-trunk{animation:step-bob ${sec(STEP)} ease-in-out infinite}.side-tail{animation:sway 1s ease-in-out infinite}`,
].join('')

// The side view, both ways. Each is hidden by its own attribute, so a picture without
// its style sheet (or with motion reduced) never shows it, as with the heart.
const SIDES = `<g class="side-r" opacity="0">${view(SIDE)}</g><g class="side-l" opacity="0"><g transform="translate(120 0) scale(-1 1)">${view(SIDE)}</g></g>`

const hasSide = (s: StageInput): boolean => s.motion !== 'never' && s.gait === 'walk' && (s.from !== s.to || s.activity === 'chasing')
```

3. In `stageStyle`, replace `travel` and the move block with:

```ts
  // How she travels for `seconds` from `delay` on, facing `dir`. Walking swaps the front
  // view for the side view that way; sliding carries the front view with a bob and paws.
  const travel = (dir: 'r' | 'l', delay: number, seconds: number) => {
    if (s.gait === 'walk') {
      add(`.side-${dir}`, `shown ${sec(seconds)} linear ${sec(delay)}`)
      add('.front', `hidden ${sec(seconds)} linear ${sec(delay)}`)
      return
    }
    const steps = Math.round(seconds / BOB)
    add('.front', `slide-bob ${sec(BOB)} ease-in-out ${sec(delay)} ${steps}`)
    add('.paw-l', `knead ${sec(BOB)} ease-in-out ${sec(delay)} ${steps}`)
    add('.paw-r', `knead ${sec(BOB)} ease-in-out ${sec(delay + BOB / 2)} ${steps}`)
  }

  let start = 0
  if (s.from !== s.to) {
    rules.push(`@keyframes move{from{transform:translateX(${SPOT_X[s.from]}px)}to{transform:translateX(${SPOT_X[s.to]}px)}}`)
    add('.spot', `move ${sec(MOVE)} linear both`)
    travel(SPOT_X[s.to] > SPOT_X[s.from] ? 'r' : 'l', 0, MOVE)
    start = MOVE
  }
```

and in the chasing block replace `travel(start, DASH)` with:

```ts
    travel('r', start, DASH / 2)
    travel('l', start + DASH / 2, DASH / 2)
```

and change `const rules = [STAGE_KEYFRAMES]` to:

```ts
  const rules = [STAGE_KEYFRAMES, hasSide(s) ? SIDE_STYLE : '']
```

4. In `stageFor`, change the front line to:

```ts
    `<g class="front">${view(frontView(look, isAnimated))}</g>` +
    (hasSide(s) ? SIDES : '') +
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 5: Let Node load the plugin's suffix-less imports**

`stage.ts` imports `./drawing` without a suffix, which Node cannot resolve on its own. Create `/tmp/mango-render/ts-ext.mjs`:

```js
// Lets Node load the plugin's TypeScript files, which import each other without a suffix.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        // not a .ts file: resolve it as written
      }
    }
    return nextResolve(specifier, context)
  },
})
```

- [ ] **Step 6: Check the stage in a real browser**

Create `/tmp/mango-render/stage-check.mjs`:

```js
// Checks Mango's stage in headless Brave: the front view's parts turn about the same
// points as on the single drawing, the side view shows only while she travels, and at
// every moment exactly one view of her is visible. Saves walk frames to look at.
// Run: cd /tmp/mango-render && node --import ./ts-ext.mjs stage-check.mjs
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drawingFor } from 'file:///C:/Users/Nugget/Documents/Development/GitHub/repos/mango-buddy/hooks/drawing.ts'
import { stageFor } from 'file:///C:/Users/Nugget/Documents/Development/GitHub/repos/mango-buddy/hooks/stage.ts'

const dir = mkdtempSync(join(tmpdir(), 'stage-'))
const page = (name, svg) => {
  const file = join(dir, `${name}.svg`)
  writeFileSync(file, svg)
  return pathToFileURL(file).href
}
// motion: always, so the check never depends on the system's reduced-motion setting.
const base = { pose: 'awake', activity: null, from: 'right', to: 'right', motion: 'always', gait: 'walk' }
const urls = {
  single: page('single', drawingFor('awake', true).replace('prefers-reduced-motion:reduce', 'min-width:99999px')),
  rest: page('rest', stageFor(base)),
  walk: page('walk', stageFor({ ...base, activity: 'peering', from: 'left' })),
  chase: page('chase', stageFor({ ...base, activity: 'chasing', from: 'middle', to: 'middle' })),
}

const browser = spawn('C:/Program Files/BraveSoftware/Brave-Origin/Application/brave.exe', ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bv-'))}`, '--remote-debugging-port=0', 'about:blank'])
const ws = await new Promise(r => browser.stderr.on('data', d => { const m = /ws:\/\/\S+/.exec(String(d)); if (m) r(m[0]) }))
const sock = new WebSocket(ws)
await new Promise(r => { sock.onopen = r })
let id = 0
const pending = {}
sock.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pending[j.id]) { pending[j.id](j.result); delete pending[j.id] } }
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pending[i] = r; sock.send(JSON.stringify({ id: i, method, params, sessionId })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 120, deviceScaleFactor: 2, mobile: false }, sessionId)
await send('Page.enable', {}, sessionId)

const open = async url => { await send('Page.navigate', { url }, sessionId); await new Promise(r => setTimeout(r, 800)) }
// Pauses every animation at `ms` and reads where things are and what shows.
const at = async ms => (await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
  document.getAnimations().forEach(a => { a.pause(); a.currentTime = ${ms} })
  const box = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(n => Math.round(n)) }
  const shown = s => { const e = document.querySelector(s); return e ? Number(getComputedStyle(e).opacity) : 0 }
  return { tail: box('.tail'), ear: box('.ear-l'), front: shown('.front'), r: shown('.side-r'), l: shown('.side-l'), spot: box('.front') }
})()` }, sessionId)).result.value

let failed = 0
const check = (label, ok, detail) => { if (!ok) failed += 1; console.log(ok ? 'PASS' : 'FAIL', label, ok ? '' : JSON.stringify(detail)) }
const near = (a, b) => a !== null && b !== null && a.every((n, i) => Math.abs(n - (b[i] ?? 0)) <= 1)

// 1. Origins: at the right spot (x 240) the tail and ear sit and turn as on the single drawing.
for (const ms of [0, 700, 1900, 3100]) {
  await open(urls.single); const one = await at(ms)
  await open(urls.rest); const staged = await at(ms)
  const shift = b => b && [b[0] - 240, ...b.slice(1)]
  check(`tail at ${ms} ms`, near(shift(staged.tail), one.tail), { staged: staged.tail, single: one.tail })
  check(`ear at ${ms} ms`, near(shift(staged.ear), one.ear), { staged: staged.ear, single: one.ear })
}

// 2. A walk to the right: the side view while she moves, the front once she is there.
await open(urls.walk)
for (const ms of [0, 600, 1199]) { const s = await at(ms); check(`walk at ${ms} ms shows the side view`, s.r === 1 && s.l === 0 && s.front === 0, s) }
const arrived = await at(1250)
// The front view's left edge is her coat, about 20 units into her 120-wide spot.
check('walk ends on the front view at the right spot', arrived.front === 1 && arrived.r === 0 && arrived.spot !== null && arrived.spot[0] >= 240 && arrived.spot[0] < 300, arrived)

// 3. A chase: out facing right, back facing left, never two views or none.
await open(urls.chase)
for (const ms of [0, 300, 599, 600, 601, 900, 1199, 1200, 1201, 1300]) {
  const s = await at(ms)
  check(`chase at ${ms} ms shows one view`, s.front + s.r + s.l === 1, s)
}

// 4. Frames of the walk to look at, every 150 ms.
await open(urls.walk)
for (const ms of [0, 150, 300, 450, 600, 750, 900, 1050, 1300]) {
  await at(ms)
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  writeFileSync(new URL(`./walk-${ms}.png`, import.meta.url), Buffer.from(data, 'base64'))
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`, '| frames: walk-*.png')
browser.kill()
process.exit(failed === 0 ? 0 : 1)
```

Run: `cd /tmp/mango-render && node --import ./ts-ext.mjs stage-check.mjs`
Expected: `ALL PASS`. If a tail or ear check fails, the nested viewport is not acting as the transform reference: fix the markup in `stage.ts` (not the check) and rerun. If the chase check shows two views at a boundary, adjust the timings so one ends where the next begins.

- [ ] **Step 7: Look at the walk, then show Malin**

Open the `walk-*.png` frames (the image hook needs an `allow-read:` per PNG path). Check: four legs that trot in diagonal pairs, white paws, the body bobs, the tail sways, she faces right, nothing is clipped at the stage edge, and the side view's size and colours match the front view. Fix what is off in `SIDE` (two rounds at most), rerun Step 6, then show Malin the frames and ask whether the walk looks like Mango. Change only what she asks for. Never ask her to turn on animation effects to see it.

- [ ] **Step 8: Commit**

```bash
git add hooks/stage.ts hooks/stage.test.ts
git commit -m "Let Mango walk between spots in a side view of her own"
```

---

### Task 8: Motion and gait settings, and the stage in the band

**Files:**
- Modify: `types/index.d.ts` (drop `isStill`)
- Modify: `hooks/register.tsx`
- Test: `hooks/mango.test.ts`

**Interfaces:**
- Consumes: `REST`, `showing` from `hooks/activity.ts`; `stageFor`, `STAGE_WIDTH`, `STAGE_HEIGHT` from `hooks/stage.ts`; `altFor` from `hooks/drawing.ts`; `Look` via `frameFor`/`faceFor`/`toneFor` from `hooks/cat.ts`.
- Produces: atoms `stage` (default `REST`), `motion` (default `'auto'`), `gait` (default `'walk'`) in `register.tsx`; the `isStill` atom is gone. `/mango still | move | auto | walk | slide`. The desktop draws `stageFor(...)` at 180 x 48 (90 x 24 short), always as an image (`isInteractive: false`), with no hover; the terminal draws `frameFor(look)` where `look` follows `showing(...)`.

Behaviour change from v1, by the spec's priority: a timed mood (ruffled, proud) now beats working, so a failed command shows ruffled during the turn instead of after it.

- [ ] **Step 1: Write the failing tests**

In `hooks/mango.test.ts`:

1. In `the desktop draws a picture of Mango and a line, no ASCII rows`, change `expect(cat?.props.width).toBe(60)` to:

```ts
  expect(cat?.props.width).toBe(180)
  expect(cat?.props.height).toBe(48)
  expect(String(cat?.props.source)).toContain('<g class="spot" transform="translate(120 0)">')
```

2. In `a short desktop band draws the picture at half size`, change the two expectations to `toBe(90)` and `toBe(24)`.

2b. In `the desktop picture keeps its markup across ticks and changes with the mood`, change `expect(before?.props.isInteractive).toBe(true)` to `toBe(false)` and the comment below it to `// A changed source would restart her animations.` Then add:

```ts
test('the desktop draws Mango as one image, with no hover', async ($, on) => {
  mock.clock(on)
  memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const svgs = await ui.findAll({ type: 'Svg' })
  expect(svgs).toHaveLength(1)
  expect(svgs[0]?.props.isInteractive).toBe(false)
  expect(svgs[0]?.props.width).toBe(180)
  expect(svgs[0]?.props.height).toBe(48)
  expect(String(svgs[0]?.props.source)).not.toContain('class="heart"')
  // A hover Box drawn absolute shows as a popover card above the band (hover probe, 2026-10-16).
  const boxes = await ui.findAll({ type: 'Box' })
  expect(boxes.some(b => b.props.position === 'absolute' || b.props.hover !== undefined)).toBe(false)
})
```

3. Replace the test `/mango still and move toggle the flag` with:

```ts
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

test('/mango walk and slide store her gait', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on)
  answerStart(on)
  await $.session.start(START)
  expect((await run($, 'slide')).text).toBe('Mango slides.')
  expect(data.get('gait')).toBe('slide')
  expect((await run($, 'walk')).text).toBe('Mango walks.')
  expect(data.get('gait')).toBe('walk')
})

test('an old isStill: true loads as never and is written as motion once', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { isStill: true })
  answerStart(on)
  await $.session.start(START)
  expect(data.get('motion')).toBe('never')
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await ui.find({ type: 'Svg' }))?.props.isInteractive).toBe(false)
})

test('a stored motion wins over an old isStill, and junk falls back to the defaults', async ($, on) => {
  mock.clock(on)
  const kept = memoryStore(on, { isStill: true, motion: 'always' })
  answerStart(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'mango', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).not.toContain('prefers-reduced-motion')
  expect(kept.get('motion')).toBe('always')
})

test('junk stored settings fall back to auto and walk, and a non-true isStill never migrates', async ($, on) => {
  mock.clock(on)
  const data = memoryStore(on, { motion: 'fast', gait: 7, isStill: 'yes' })
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
```

`failBash` is declared further down the file. That is fine: a test body runs only after the whole file has loaded.

4. In `/mango card reports stats; unknown words get help`, add after the `dance` line:

```ts
  expect((await run($, 'dance')).text).toBe('Mango knows: pet, mute, unmute, still, move, auto, walk, slide, off, on, card.')
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL on the width, the new command words, the migration and the timed-mood test.

- [ ] **Step 3: Drop isStill from the contract**

In `types/index.d.ts`, delete the line `      isStill: boolean`.

- [ ] **Step 4: Add the settings and draw the stage**

In `hooks/register.tsx`:

1. Replace the imports with:

```ts
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'
import type { Gait, Mood, Motion } from '../types'
import { REST, showing } from './activity'
import { ART_WIDTH, BUDGET_PERCENT, faceFor, frameFor, GAP, isTestCommand, PROUD_TICKS, remarkFor, resolveMood, RUFFLED_TICKS, TICK_MS, toneFor } from './cat'
import { altFor } from './drawing'
import { STAGE_HEIGHT, STAGE_WIDTH, stageFor } from './stage'
```

2. Replace `export const isStill = ...` with:

```ts
// How she moves and walks, stored. Read once in session.start, written on change.
export const motion = atom({ plugin: 'mango', key: 'motion' } as const, 'auto' as Motion)
export const gait = atom({ plugin: 'mango', key: 'gait' } as const, 'walk' as Gait)
// What the desktop picture shows: activity, from and to in one atom, so a change is one
// write and one redraw.
export const stage = atom({ plugin: 'mango', key: 'stage' } as const, REST)
```

3. Add after `const flag = ...`:

```ts
const motionOf = (x: unknown): Motion | undefined => (x === 'auto' || x === 'always' || x === 'never' ? x : undefined)
const gaitOf = (x: unknown): Gait | undefined => (x === 'walk' || x === 'slide' ? x : undefined)
```

4. Replace `HELP` and add the two setters below it:

```ts
const HELP = 'Mango knows: pet, mute, unmute, still, move, auto, walk, slide, off, on, card.'

// Stores how she moves and redraws her with it.
const setMotion = async ($: EngineType, value: Motion): Promise<void> => {
  await $.store.set('motion', value)
  await update($, motion, () => value)
}

const setGait = async ($: EngineType, value: Gait): Promise<void> => {
  await $.store.set('gait', value)
  await update($, gait, () => value)
}
```

5. In `runCommand`, replace the `still` and `move` cases with:

```ts
    case 'still':
      await setMotion($, 'never')
      return 'Mango sits still.'
    case 'move':
      await setMotion($, 'always')
      return 'Mango always moves.'
    case 'auto':
      await setMotion($, 'auto')
      return 'Mango follows your system.'
    case 'walk':
      await setGait($, 'walk')
      return 'Mango walks.'
    case 'slide':
      await setGait($, 'slide')
      return 'Mango slides.'
```

6. In `advanceClock`, change `if (await read($, isStill)) {` to `if ((await read($, motion)) === 'never') {`.

7. In `session.start`, change the `argumentHint` to `'pet | mute | unmute | still | move | auto | walk | slide | off | on | card'`, and replace the three stored-flag lines and their three updates with:

```ts
    const storedOff = flag(await $.store.get('isOff'))
    const storedMuted = flag(await $.store.get('isMuted'))
    // An old still flag becomes motion: never, written once; isStill is not read after that.
    let storedMotion = motionOf(await $.store.get('motion'))
    if (storedMotion === undefined && flag(await $.store.get('isStill'))) {
      storedMotion = 'never'
      await $.store.set('motion', storedMotion)
    }
    const storedGait = gaitOf(await $.store.get('gait'))
    const moves = storedMotion ?? 'auto'
    await update($, isOff, () => storedOff)
    await update($, isMuted, () => storedMuted)
    await update($, motion, () => moves)
    await update($, gait, () => storedGait ?? 'walk')
```

8. Replace the body of the `ui.render` hook, from `const shown = ...` to the end of the hook, with:

```tsx
    const shown = isTerminal ? resolveMood(await snapshot($, t)) : await read($, shownMood)
    const st = await read($, stage)
    const moves = await read($, motion)
    const still = moves === 'never'
    // Still, the tick can sit on a blink frame (0 % 8), which would draw an awake cat with
    // closed eyes. Nudge by two so the tail and the z keep their parity.
    const drawTick = still && t % 8 === 0 ? t + 2 : t
    const said = await read($, remark)
    const muted = await read($, isMuted)
    // Priority, highest first: a timed mood, an activity, working, the resting mood.
    const now = showing(shown, st.activity, e.props.isWorking)
    const look = now.activity ?? now.pose
    const isShort = e.props.maxRows < 3
    // The face is 5 columns wide, the two-row art ART_WIDTH. A band narrower than
    // the art draws the art with an empty line, never a negative slice.
    const room = Math.max(0, e.props.bodyColumns - (isShort ? FACE_WIDTH : ART_WIDTH) - GAP)
    const text = (said ?? `context ${await read($, contextPercent)} %`).slice(0, room)
    // A remark takes the look's theme colour; the context figure stays dim.
    const tone = said === null ? {} : { color: toneFor(look) }
    const speech = muted ? null : (
      <>
        <Text>{' '.repeat(GAP)}</Text>
        {/* Text has no `key` prop, so the key lives on the Box around it. */}
        <Box key="line"><Text dimColor={said === null} {...tone}>{text}</Text></Box>
      </>
    )
    if (!isTerminal) {
      // Surfaces that draw an Svg get the stage; a short band gets it at half size. The
      // markup follows the stage, pose, motion and gait, never the tick, so her animations
      // run on between periods. Always an image: a frame reloads, and blinks, on every new
      // source. An image gets no :hover, so she has no hover heart for now.
      const { Svg } = $.ui.resolve(e)
      const scale = isShort ? 0.5 : 1
      const source = stageFor({ pose: now.pose, activity: now.activity, from: st.from, to: st.to, motion: moves, gait: await read($, gait) })
      return (
        <Box alignItems="center">
          <Box key="cat">
            <Svg source={source} alt={altFor(now.pose, now.activity)} width={STAGE_WIDTH * scale} height={STAGE_HEIGHT * scale} isInteractive={false} />
          </Box>
          {speech}
        </Box>
      )
    }
    if (isShort) {
      return (
        <Box>
          <Box key="face"><Text>{faceFor(look, drawTick)}</Text></Box>
          {speech}
        </Box>
      )
    }
    const [row1, row2] = frameFor(look, drawTick)
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
```

Keep the lines before `const shown` (the `hasSurvey`/`isOff` guard, `Box`/`Text`, `isTerminal`, `t` and the comment about the tick) as they are.

- [ ] **Step 5: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass, including every v1 test that stores `isStill: true` (they now run through the migration) and `an idle desktop band is not redrawn on every tick`; tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add types/index.d.ts hooks/register.tsx hooks/mango.test.ts
git commit -m "Draw Mango's stage in the band, with motion and gait settings"
```

---

### Task 9: Activities from tool calls

**Files:**
- Modify: `hooks/register.tsx`
- Test: `hooks/mango.test.ts`

**Interfaces:**
- Consumes: `ACTIVITY_TICKS`, `activityFor`, `gitStepOf`, `nextStage`, `restStage`, `sameStage` from `hooks/activity.ts`.
- Produces: module state `shownStage`, `pendingStage`, `activityUntil`, `runningWaits`; helpers `setActivity(a)`, `quietly(work)`, `whileWaiting($, run)`, `writeStage($)`; one hook for Read/Grep/Glob/Edit/Write/WebFetch/WebSearch, one for Agent, and a rewritten Bash hook. Task 10 adds lines to these same hooks.

The spec asks for one hook per tool group. This plan uses one hook for the seven looking tools, driven by `activityFor`, so the tool table lives in one place. The behaviour is the same.

- [ ] **Step 1: Write the failing tests**

In `hooks/mango.test.ts`, change the testing imports to:

```ts
import { expect, mock, test } from 'claude-code/testing'
import type { MockClock, TestBody } from 'claude-code/testing'
import type { On } from 'claude-code'
import { ACTIVITY_TICKS } from './activity'
import { TICK_MS, SLEEP_AFTER_TICKS, RUFFLED_TICKS, PROUD_TICKS, remarkFor } from './cat'
```

Append (write it with the editor tool):

```ts
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

test('a Read walks her left to sniff, and she stays there when it ends', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/home/a/x.ts', tool_use_id: 'a1' })
  await clock.advance(TICK_MS)
  let cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe(SNIFFING)
  expect(String(cat?.props.source)).toContain('<g class="spot" transform="translate(0 0)">')
  expect(String(cat?.props.source)).toContain('@keyframes move')
  await clock.advance(TICK_MS * (ACTIVITY_TICKS - 2))
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe(SNIFFING)
  await clock.advance(TICK_MS)
  cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe(AWAKE)
  expect(String(cat?.props.source)).toContain('<g class="spot" transform="translate(0 0)">')
  expect(String(cat?.props.source)).not.toContain('@keyframes move')
})

// Counts writes of the stage atom, the guard against extra redraws (each one blinks).
const countStageWrites = (on: On) => {
  const count = { writes: 0 }
  on('state.set', (_$, e, next) => { if (e.key === 'stage') count.writes += 1; return next(e) })
  return count
}

test('a burst of five Reads writes the stage once', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countStageWrites(on)
  answerTools(on, clock)
  await $.session.start(START)
  await desktop($)
  await Promise.all(['a', 'b', 'c', 'd', 'e'].map(n => $.tool.call({ tool: 'Read', file_path: `/r/${n}.ts`, tool_use_id: `b-${n}` })))
  await clock.advance(TICK_MS * 3)
  expect(count.writes).toBe(1)
})

test('a Read and a WebFetch before one period write the stage once, as peering', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countStageWrites(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/r/f.ts', tool_use_id: 'p1' })
  await $.tool.call({ tool: 'WebFetch', url: 'https://example.com/', prompt: 'p', tool_use_id: 'p2' })
  await clock.advance(TICK_MS)
  expect(count.writes).toBe(1)
  const cat = await ui.find({ type: 'Svg' })
  expect(cat?.props.alt).toBe('Mango, a black cat, peers out at the web.')
  expect(String(cat?.props.source)).toContain('<g class="spot" transform="translate(240 0)">')
  expect(String(cat?.props.source)).toContain('translateX(120px)}to{transform:translateX(240px)')
})

test('a new activity mid-walk starts from the spot the last one was heading for', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/r/f.ts', tool_use_id: 'm1' })
  await clock.advance(TICK_MS)
  await $.tool.call({ tool: 'WebSearch', query: 'cats', tool_use_id: 'm2' })
  await clock.advance(TICK_MS)
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('translateX(0px)}to{transform:translateX(240px)')
})

test('TodoWrite and other tools leave her be', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  const count = countStageWrites(on)
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

test('a git commit that succeeds makes her pounce in the middle; a failed one ruffles her', async ($, on) => {
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
  expect(String(cat?.props.source)).toContain('<g class="spot" transform="translate(120 0)">')
  expect(String(cat?.props.source)).toContain('pounce 0.8s ease-out 1.2s both')
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
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('Mango, a black cat, chases the push.')
})

test('the gait shows on her next walk: walk draws the side view, slide does not', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await run($, 'move')
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'g2' })
  await clock.advance(TICK_MS)
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('class="side-l"')
  await run($, 'slide')
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).not.toContain('class="side-')
  await run($, 'walk')
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('class="side-l"')
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL in the new tests (no hook sets an activity yet). Every older test still passes.

- [ ] **Step 3: Keep the activity in module state and write it once per period**

In `hooks/register.tsx`:

1. Change the activity and type imports to:

```ts
import type { Activity, Gait, Mood, Motion, Stage } from '../types'
import { ACTIVITY_TICKS, activityFor, gitStepOf, nextStage, REST, restStage, sameStage, showing } from './activity'
```

2. Add after `let lastMood: Mood = 'awake'`:

```ts
// The stage the picture shows (the last one written) and the one the next clock period
// writes. Tool calls set only the pending stage, so a burst of them costs one redraw.
let shownStage: Stage = REST
let pendingStage: Stage = REST

// The clock tick the activity ends on, unless a Bash or Agent call still runs.
let activityUntil = 0
let runningWaits = 0

// Sets what she does next and restarts its timer. The clock writes it.
const setActivity = (a: Activity) => {
  pendingStage = nextStage(shownStage, a)
  activityUntil = clockTick + ACTIVITY_TICKS
}

// Bookkeeping around a tool call never blocks it: a failed read or write is dropped.
const quietly = async (work: () => Promise<unknown>): Promise<void> => {
  try {
    await work()
  } catch {
    // the call goes on
  }
}

// Writes the pending stage once, and only when it differs from the one showing. A failed
// write is tried again on the next period.
const writeStage = async ($: EngineType) => {
  const s = pendingStage
  if (sameStage(s, shownStage)) return
  await update($, stage, () => s)
  shownStage = s
}
```

3. Add after `markActivity`:

```ts
// Runs a Bash or Agent call while she waits for it. The count keeps the activity from
// ending while any such call runs, and each return restarts the timer. The count is
// raised and lowered around nothing but the call, so it always comes back down.
const whileWaiting = async <T,>($: EngineType, run: () => Promise<T>): Promise<T> => {
  runningWaits += 1
  try {
    setActivity('waiting')
    return await run()
  } finally {
    runningWaits -= 1
    activityUntil = clockTick + ACTIVITY_TICKS
    // A long run must not leave her asleep the moment it ends.
    await quietly(() => markActivity($))
  }
}
```

(`<T,>` keeps the TSX parser from reading `<T>` as a tag.)

4. In `advanceClock`, change `let s = await snapshot($, t)` to:

```ts
  let s = await snapshot($, t)
  // While a Bash or Agent call runs she is busy waiting, so she does not fall asleep.
  if (runningWaits > 0) s = { ...s, lastActivityTick: t }
```

and add at the end of `advanceClock`, after `lastMood = now`:

```ts
  if (runningWaits === 0 && t >= activityUntil && pendingStage.activity !== null) {
    pendingStage = restStage(pendingStage)
  }
  await writeStage($)
```

5. In `session.start`, add right after the `await $.command.register({...})` call, so a failed read can never keep the clock or the command from starting:

```ts
    // A repeated session.start picks up the stage the picture already shows.
    await quietly(async () => {
      shownStage = await read($, stage)
      pendingStage = shownStage
    })
```

6. Replace the Bash hook with these three hooks:

```ts
  // Reading, editing and the web: she sniffs, watches or peers.
  on('tool.call', { tool: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'WebFetch', 'WebSearch'] }, async ($, e, next) => {
    const a = activityFor(e.tool)
    if (a !== null) setActivity(a)
    await quietly(() => markActivity($))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) =>
    whileWaiting($, async () => {
      await quietly(() => markActivity($))
      return next(e)
    }),
  ).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const isTest = isTestCommand(e.command)
    const step = gitStepOf(e.command)
    const ran = await whileWaiting($, async () => {
      await quietly(() => markActivity($))
      return next(e)
    })
    if (ran.deny !== undefined) return ran
    if (ran.isError === true) {
      await setTimedMood($, 'ruffled', RUFFLED_TICKS)
      await bump($, 'errorsSurvived')
      return ran
    }
    if (isTest) await setTimedMood($, 'proud', PROUD_TICKS)
    // A commit or push that went through: she pounces on it, or chases it out.
    if (step !== null) setActivity(step === 'push' ? 'chasing' : 'pouncing')
    return ran
  }).catch(($, e, next) => next(e))
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass, including `an idle desktop band is not redrawn on every tick` and `the Bash hook throwing after next still returns the result once`; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add hooks/register.tsx hooks/mango.test.ts
git commit -m "Let Mango sniff, watch, peer, wait, pounce and chase as Claude works"
```

---

### Task 10: Activity lines

**Files:**
- Modify: `hooks/register.tsx`
- Test: `hooks/mango.test.ts`

**Interfaces:**
- Consumes: `callLine`, `KEEP_WATCH_TICKS`, `LINE_GAP_TICKS`, `lineFor`, `topicOf`, `Topic` from `hooks/activity.ts`; `setActivity`, `quietly`, `whileWaiting` from Task 9.
- Produces: module state `activityRemark`, `lastLineTick`, `namedThisTurn`; helpers `say($, line)` and `clearActivityRemark($)`.

- [ ] **Step 1: Write the failing tests**

Change the `./activity` import in `hooks/mango.test.ts` to `import { ACTIVITY_TICKS, LINE_GAP_TICKS } from './activity'`, then append (with the editor tool):

```ts
const lineOf = async (ui: { find: (q: { key: string }) => Promise<{ text?: string } | undefined> }) => (await ui.find({ key: 'line' }))?.text ?? ''

test('a Read names the file once per turn, and a new prompt lets her say it again', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  on('prompt.submit', (_$, e) => e)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: 'C:\\Users\\someone\\x.ts', tool_use_id: 'l1' })
  expect(await lineOf(ui)).toBe('Mango sniffs at x.ts.')
  await clock.advance(TICK_MS * LINE_GAP_TICKS)
  await $.tool.call({ tool: 'Read', file_path: '/home/a/y.ts', tool_use_id: 'l2' })
  expect(await lineOf(ui)).toContain('context 0 %')
  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Read', file_path: '/home/a/z.ts', tool_use_id: 'l3' })
  expect(await lineOf(ui)).toContain('z.ts')
  expect(await lineOf(ui)).not.toContain('home')
})

test('a Grep names no pattern, and a WebFetch names only the host', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Grep', pattern: 'hunter2', tool_use_id: 'l4' })
  expect(await lineOf(ui)).toBe('Mango sniffs around the files.')
  await clock.advance(TICK_MS * LINE_GAP_TICKS)
  await $.tool.call({ tool: 'WebFetch', url: 'https://user:secret@docs.example.com:8443/a?b=1', prompt: 'p', tool_use_id: 'l5' })
  expect(await lineOf(ui)).toBe('Mango peers out at docs.example.com.')
})

test('a second line inside fourteen ticks is dropped, and the line goes when the activity ends', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'l6' })
  await clock.advance(TICK_MS * 3)
  await $.tool.call({ tool: 'Edit', file_path: '/r/cat.ts', old_string: 'a', new_string: 'b', tool_use_id: 'l7' })
  expect(await lineOf(ui)).toBe('Mango sniffs at x.ts.')
  await clock.advance(TICK_MS * (ACTIVITY_TICKS - 1))
  expect(await lineOf(ui)).toBe('Mango sniffs at x.ts.')
  await clock.advance(TICK_MS)
  expect(await lineOf(ui)).toContain('context 0 %')
})

test('an activity line never replaces a purr, and its end leaves the purr', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await run($, 'pet')
  const purr = remarkFor('purr', 0)
  await $.tool.call({ tool: 'Read', file_path: '/r/x.ts', tool_use_id: 'l8' })
  expect(await lineOf(ui)).toBe(purr)
  await clock.advance(TICK_MS * (ACTIVITY_TICKS + 1))
  expect(await lineOf(ui)).toBe(purr)
})

test('a Bash run of more than forty ticks that succeeds says she kept watch; forty does not', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock, e => ({ ticks: e.command === 'long' ? 41.5 : 40.5 }))
  await $.session.start(START)
  const ui = await desktop($)
  const short = $.tool.call({ tool: 'Bash', command: 'short', tool_use_id: 'l9' })
  await clock.advance(TICK_MS * 41)
  await short
  expect(await lineOf(ui)).toContain('context 0 %')
  const long = $.tool.call({ tool: 'Bash', command: 'long', tool_use_id: 'l10' })
  await clock.advance(TICK_MS * 42)
  await long
  expect(await lineOf(ui)).toMatch(/^Mango .*\b31 s\.$/)
})

test('a successful commit or push speaks in the success colour', async ($, on) => {
  const clock = mock.clock(on)
  memoryStore(on)
  answerStart(on)
  answerTools(on, clock)
  await $.session.start(START)
  const ui = await desktop($)
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'l11' })
  expect(await lineOf(ui)).toBe('Mango pounces on the commit.')
  await clock.advance(TICK_MS)
  expect((await ui.find({ type: 'Text', text: 'Mango pounces on the commit.' }))?.props.color).toBe('success')
  await clock.advance(TICK_MS * LINE_GAP_TICKS)
  await $.tool.call({ tool: 'Bash', command: 'git push', tool_use_id: 'l12' })
  expect(await lineOf(ui)).toMatch(/^Mango (chases|runs after) the push/)
})
```

If `lineOf`'s parameter type does not accept the mounted drawing, inline `(await ui.find({ key: 'line' }))?.text ?? ''` in each test instead of loosening the type with `any`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `claude plugin test .`
Expected: FAIL in the new tests (no lines yet).

- [ ] **Step 3: Say the lines**

In `hooks/register.tsx`:

1. Change the activity import to:

```ts
import { ACTIVITY_TICKS, activityFor, callLine, gitStepOf, KEEP_WATCH_TICKS, LINE_GAP_TICKS, lineFor, nextStage, REST, restStage, sameStage, showing, topicOf } from './activity'
import type { Topic } from './activity'
```

2. Add after `runningWaits`:

```ts
// The activity line showing, kept so the end of an activity clears only that line.
let activityRemark: string | null = null
// The tick of the last activity line; one per LINE_GAP_TICKS at most.
let lastLineTick = -LINE_GAP_TICKS
// What she has named this turn: one line each for reading, editing and the web.
const namedThisTurn = new Set<Topic>()
```

3. Add after `writeStage`:

```ts
// Shows an activity line: one per LINE_GAP_TICKS at most, and only over an empty remark,
// the sleep remark or an older activity line, never over a purr, yawn, worried or
// timed-mood line. The slot is claimed before the first await, so two parallel calls
// cannot both speak; a line that may not show gives it back.
const say = async ($: EngineType, line: string) => {
  const t = clockTick
  if (t - lastLineTick < LINE_GAP_TICKS) return
  const before = lastLineTick
  lastLineTick = t
  const current = await read($, remark)
  if (current !== null && current !== sleepRemark && current !== activityRemark) {
    lastLineTick = before
    return
  }
  activityRemark = line
  await update($, remark, () => line)
}

// Clears the activity line if it is still the one showing. The end of an activity calls this.
const clearActivityRemark = async ($: EngineType) => {
  if (activityRemark === null) return
  const line = activityRemark
  activityRemark = null
  if ((await read($, remark)) === line) await update($, remark, () => null)
}
```

4. In `advanceClock`, change the expiry block to:

```ts
  if (runningWaits === 0 && t >= activityUntil && pendingStage.activity !== null) {
    pendingStage = restStage(pendingStage)
    await clearActivityRemark($)
  }
```

5. In the looking hook, replace its body with:

```ts
    const a = activityFor(e.tool)
    if (a !== null) setActivity(a)
    // The first-of-turn flag is spent before the first await, so two parallel calls
    // cannot both claim it. A call with nothing to name spends it too.
    let line: string | null = null
    const topic = topicOf(e.tool)
    if (topic !== null && !namedThisTurn.has(topic)) {
      namedThisTurn.add(topic)
      line = callLine(e, clockTick)
    }
    await quietly(() => markActivity($))
    if (line !== null) {
      const said = line
      await quietly(() => say($, said))
    }
    return next(e)
```

6. In the Bash hook, add `const started = clockTick` as its first line, and replace the last two statements (`if (step !== null) ...` and `return ran`) with:

```ts
    // A commit or push that went through: she pounces on it, or chases it out.
    if (step !== null) {
      setActivity(step === 'push' ? 'chasing' : 'pouncing')
      await quietly(() => say($, lineFor(step, clockTick)))
    }
    // Measured in clock ticks between the call and its result, so tests can drive it.
    const ticks = clockTick - started
    if (ticks > KEEP_WATCH_TICKS) {
      const seconds = String(Math.round((ticks * TICK_MS) / 1000))
      await quietly(() => say($, lineFor('watch', clockTick, seconds)))
    }
    return ran
```

7. In the `prompt.submit` hook, add as its first line:

```ts
    namedThisTurn.clear()
```

- [ ] **Step 4: Run the tests and the type check**

Run: `claude plugin test .` then `npx -p typescript tsc -p . --noEmit`
Expected: all pass; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add hooks/register.tsx hooks/mango.test.ts
git commit -m "Let Mango say a short line at notable moments while Claude works"
```

---

### Task 11: Docs, version and the final checks

**Files:**
- Modify: `README.md`
- Modify: `.claude-plugin/plugin.json`
- Modify: `C:\Users\Nugget\.claude\projects\C--Users-Nugget-Documents-Development-GitHub-repos-mango-buddy\memory\MEMORY.md` and `reactions-design.md` (status)

**Interfaces:**
- Consumes: everything above.
- Produces: v0.2.0 on `feat/reactions`, a PR, and Malin's check in a new session.

- [ ] **Step 1: Update the README**

In `README.md`:

1. After the first paragraph of "Meet Mango", add:

```markdown
She follows along while Claude works, too. She sniffs at the files it reads, watches it edit, peers out when it goes to the web and waits with you through a long build. She pounces on a commit and chases a push out the door.
```

2. Replace the `/mango still` / `move` row of the commands table with:

```markdown
| `/mango still` | She stays on her spot without moving (calmer for screen readers) |
| `/mango move` | She always moves, even when your system asks for reduced motion |
| `/mango auto` | She follows your system's reduced-motion setting (the default) |
| `/mango walk` / `slide` | She walks between spots on four paws, or slides there (walk is the default) |
```

3. In "Gentle by design", change the end of the "She is alive on desktop" bullet to `She holds still when your system asks for reduced motion, unless you tell her `/mango move`.` and add after "She never phones home":

```markdown
- **She only glances at names.** She may say the name of a file Claude reads or edits, or the site it visits, and nothing more: never a folder, a search, a command or its output. `/mango mute` keeps her quiet.
```

- [ ] **Step 2: Bump the version**

In `.claude-plugin/plugin.json`, change `"version": "0.1.3"` to `"version": "0.2.0"`.

- [ ] **Step 3: Run every check**

```bash
claude plugin validate .
claude plugin test .
npx -p typescript tsc -p . --noEmit
grep -rn $'\xe2\x80\x94' hooks types README.md docs/superpowers/plans/2026-10-16-mango-reactions.md || echo "no em dashes"
cd /tmp/mango-render && node front-check.mjs compare && node --import ./ts-ext.mjs stage-check.mjs
```

Expected: validate reports no errors; every test passes (read the count off the output, do not assume it); tsc prints nothing; `no em dashes`; `IDENTICAL`; `ALL PASS`. The front view of the six moods did not change, so `readme-art.mjs` does not need a rerun: say so in the PR.

- [ ] **Step 4: Ask a fresh reviewer**

Dispatch a fresh-context code reviewer (superpowers:requesting-code-review) on `main...feat/reactions` with the spec and this plan. Fold in what it finds, rerun Step 3, and commit the fixes.

- [ ] **Step 5: Commit, push and open the PR**

```bash
git add README.md .claude-plugin/plugin.json
git commit -m "Describe Mango's reactions in the README and bump to 0.2.0"
git push
```

Open the PR from `feat/reactions` to `main` with this title and body:

```text
Mango reacts to coding
```

```markdown
Mango now reacts to Claude's tool calls. She sniffs at reads (walking left), watches edits, peers out at the web (walking right), waits through Bash and Agent runs, pounces on a commit and chases a push. On desktop she moves across a small three-spot stage, walking in a new side view or sliding. In the terminal she gets new faces. She says a short line at notable moments, at most one every 10 seconds.

- New pure modules: `hooks/activity.ts` (tools to activities, spots, names, lines, git steps) and `hooks/stage.ts` (the stage picture).
- One `stage` atom, written at most once per clock period, so a burst of tool calls costs one redraw.
- `/mango still | move | auto` set motion (never, always, follow the system); `/mango walk | slide` set the gait. A stored `isStill: true` migrates to `never`.
- Only a file's basename or a web host ever shows. No paths, patterns, queries, commands or output.
- The six mood drawings are byte-identical, so the README art needs no rebuild.

Spec: `docs/superpowers/specs/2026-10-16-mango-reactions-design.md`. Plan: `docs/superpowers/plans/2026-10-16-mango-reactions.md`.
```

Then bind the PR with the ccd_pr tools and read its CI. Ward's node job skips (there is no `package.json`), so CI does not run the plugin tests: the local run in Step 3 is the test evidence.

- [ ] **Step 6: Merge, release and reinstall, each only with Malin's yes**

Ask Malin before each: merging the PR, then the v0.2.0 release on the merge commit (draft notes in the repo's style and show them first). After the merge, reinstall the way Task 1 Step 2 does it, verify the cache with Task 1 Steps 3 and 4 against the merge commit, and ask her to open a NEW session to look. Her system asks for reduced motion, so with the default `auto` she will see Mango still: tell her `/mango move` shows the walk, and `/mango auto` puts it back.

- [ ] **Step 7: Update memory**

Add a dated status line to the project `MEMORY.md` (what merged, the release, the cache commit) and close the open pointer in `reactions-design.md`. Then say whether it is safe to `/clear`.

---

## Considered and rejected

- **Background Agent and Bash calls.** A call with `run_in_background` returns at once, so she waits only 6 ticks and keep-watch never fires. Following a background run needs task events the spec does not use; the table says "while it runs", and the call itself has stopped running.
- **A Read during a running Bash replaces waiting.** She sniffs, and stays sniffing until the Bash ends plus 6 ticks. The last call wins by the spec's coalescing rule; going back to waiting would add a stack of activities for little gain.
- **First-of-turn flags across turns that no prompt starts.** Only `prompt.submit` resets them, so a turn started by a background notification keeps the old flags. She simply names less, never more.
- **Durations in clock ticks.** If clock periods lag, keep-watch under-reports. The spec chose ticks so the test kit can drive them.

> Stress-tested 2026-10-16 (skill 1b85fca): 2 applied, 1 adapted, 0 decided by me.
