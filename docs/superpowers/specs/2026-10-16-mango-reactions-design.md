# Mango reacts to coding

Design spec, 2026-10-16. Status: approved in chat, written for the implementation plan. Builds on [the v1 spec](2026-10-09-mango-design.md).

## Purpose

Mango should feel like she is in the room while Claude works. When Claude reads, she sniffs around. When it edits, she watches. When it goes to the web, she peers out. She pounces on a commit and chases a push. She does this with her body on desktop and with new faces in the terminal, and she speaks only at notable moments.

## What changes from v1

- **v1 rule revised:** "No tool input ... file path ... ever reaches the band." Activity lines now show a file's basename (Read, Edit, Write) and a web host (WebFetch). Nothing else from tool input or output reaches the band: no full paths, no Grep or Glob patterns, no search queries, no command text, no output. `/mango mute` hides these lines like every other remark.
- **`/mango still` and `move` change meaning:** see [Motion](#motion). A stored `isStill: true` migrates to `motion: never`.
- Every other v1 constraint stands: no model calls, no network, no telemetry, ASCII only in the terminal, English text, no Buttons or Inputs in the band.

## Activities

An activity is a short layer over her mood. Each tool call that maps to one sets it and restarts its timer of 6 ticks (4.5 s). When the timer runs out the activity ends and she stays on the spot where she is.

- **Waiting holds while the work runs.** A module counter `runningWaits` goes up when a Bash or Agent call starts and down when it returns (in a `finally`). The timer never expires while it is above zero, and each return restarts it. So a two-minute build keeps her waiting the whole time, and parallel calls are counted correctly.
- **Subagents count.** Tool calls made inside an Agent run fire the same hooks, so she sniffs and watches along with a subagent.
- **Parallel calls coalesce.** A tool call sets `pendingStage` in module state, not the atom. The next clock period writes `stage` once, if `pendingStage` differs from what is showing. Five parallel Reads, or a Read and a WebFetch in the same moment, cost one redraw (the last call wins), and she shows the change within 750 ms.

| Trigger | Activity | Spot |
|---|---|---|
| Read, Grep, Glob | sniffing | left |
| Edit, Write | watching | middle |
| WebFetch, WebSearch | peering | right |
| Bash, while it runs | waiting | where she is |
| Agent, while it runs | waiting | where she is |
| Bash that succeeds with `git commit` at command position | pouncing | middle |
| Bash that succeeds with `git push` at command position | chasing | middle (runs to the right edge and back) |

Every other tool (TodoWrite and the rest) does nothing. "Command position" means the same thing as in `isTestCommand`: the start of a line or after `&&`, `;`, `|`, `(` or a backtick, with optional `VAR=value` prefixes.

**Priority, highest first:** a timed mood (ruffled, proud), then an activity, then working (`isWorking`), then the resting mood (awake, sleeping, worried). An activity counts as activity for sleep: it wakes her the way any tool call does today.

Pouncing and chasing play once per picture. Two commits inside one activity window do not replay the pounce, because the stage does not change. When she has to move to the middle first, the pounce or chase starts once the move ends (an `animation-delay` of the move's length). A chase uses the current gait. Without motion she shows the activity's face at the middle and does not hop or run.

## Lines

She speaks at notable moments only. Each line has two or three variants, picked by tick the way `remarkFor` picks.

| Moment | Example |
|---|---|
| First Read of a turn | `Mango sniffs at register.tsx.` |
| First Grep or Glob of a turn, if no Read came first | `Mango sniffs around the files.` (no pattern) |
| First Edit or Write of a turn | `Mango watches you edit cat.ts.` |
| First WebFetch of a turn | `Mango peers out at github.com.` |
| First WebSearch of a turn | `Mango peers out the window.` (no query) |
| Successful `git commit` | `Mango pounces on the commit.` |
| Successful `git push` | `Mango chases the push out the door.` |
| Bash over 30 s that succeeds | `Mango kept watch for 42 s.` |

- **Names:** a basename is everything after the last `/` or `\`, so a Windows path never shows its folders or the user name in them. It is then cut to printable ASCII (`0x20` to `0x7e`; anything else becomes `?`) and at most 32 characters (longer ends in `...`). A host comes from `new URL(url).hostname`, which is already ASCII; a URL that does not parse, or has an empty hostname (`file:`), gives no line.
- **First of turn:** one flag each for read, edit and web; `prompt.submit` resets them. A hook checks and sets its flag before its first `await`, so two parallel Reads cannot both claim it.
- **Rate:** at most one activity line per 14 ticks (about 10 s).
- **What a line may replace:** an empty remark, the sleep remark or an older activity line. It never replaces a purr, yawn, worried or timed-mood line. The activity line is tracked like `timedRemark`, so expiry clears only that line.
- **Duration:** measured in clock ticks between the call and its result, so the test kit can drive it. Rounded to whole seconds.
- **Tone:** activity lines use the `claude` theme colour; pouncing and chasing use `success`.

## Stage and drawing (desktop)

- **Stage:** one Svg of 180 x 48 px, drawn on a 360 x 96 grid. Three spots, each as wide as Mango: left (x 0), middle (x 120), right (x 240). Her line starts right after the stage, so the text never moves when she does. A short band draws the stage at half size.
- **Builder:** `stageFor({ pose, activity, from, to, motion, gait })` in `hooks/stage.ts`, a pure function returning the SVG string. Same inputs, same string. It reuses the front-view drawing from `drawing.ts`.
- **Resting place:** the front view sits at `to` by its own transform attribute. With no animation at all, she is simply at her new spot.
- **The move:** when `from` differs from `to`, the picture walks her once from `from` to `to` in about 1.2 s (`animation-fill-mode: both`). Same spot, no move.
- **Activity looks** (front view, at the spot):
  - Sniffing: head lowered, nose twitch.
  - Watching: pupils follow left and right.
  - Peering: ears forward, wide eyes.
  - Waiting: sits, tail tip taps.
  - Pouncing: crouch, hop, land, once.
  - Chasing: dashes to the right edge and back, once.
- **Timed moods and resting moods** draw as today, at her current spot.
- **Hover heart and interactivity** stay as in v1 whenever motion is allowed.
- **Alt text:** `altFor(pose, activity)` names the activity when one shows (`Mango, a black cat, sniffs around.`), and the mood otherwise, as today.

### Gait

`gait` is `walk` (default) or `slide`, stored.

- **Walk:** a new side-view drawing in `stage.ts`. Long black coat with the same rim and gradient, white ruff, four legs with white paws, amber eye, raised tail. The legs trot in diagonal pairs (two steps per 0.5 s), the body bobs slightly, the tail sways. She faces the way she walks; walking left is the same drawing mirrored. During the move the side view is shown and the front view hidden; at the end they swap. The side view is hidden by its own `opacity="0"` attribute, so a picture without its style sheet never shows it (the same trick as the heart).
- **Slide:** the front view itself moves, with a small bob and alternating paws.

### Motion

`motion` is `auto` (default), `always` or `never`, stored.

| Setting | Command | Picture |
|---|---|---|
| auto | `/mango auto` | Moves, with the reduced-motion media query: a system that asks for reduced motion sees her still |
| always | `/mango move` | Moves, and the media query is left out |
| never | `/mango still` | No style sheet, a plain image (`isInteractive: false`) as in v1 still mode |

Still, in every form, means she is drawn at `to` with no move.

## Terminal

No stage and no walking. Each activity gets its own two rows within `ART_WIDTH`, and the short band gets a matching face. Proposed glyphs, tuned in the plan:

| Activity | Row 2 | Face |
|---|---|---|
| sniffing | `( o.o )..` / `( o.o ).` | `(o.o)` |
| watching | `( o.o ) ?` | `(o.o)` |
| peering | `( O.O ) >` | `(O.O)` |
| waiting | `( -.- ) ~` / `( -.- ) .` | `(-.-)` |
| pouncing | `( ^o^ ) /` | `(^o^)` |
| chasing | `( >o< )==` | `(>o<)` |

Ears stay ` /\_/\`. Frames that alternate use the tick, as today.

## State

Session values, added to `types/index.d.ts` under `mango`:

| Key | Type | Meaning |
|---|---|---|
| `stage` | `{ activity: Activity \| null; from: Spot; to: Spot }` | What the picture shows. Written in one write, and only when it changes |
| `motion` | `'auto' \| 'always' \| 'never'` | Replaces `isStill` |
| `gait` | `'walk' \| 'slide'` | Walk or slide |

`Activity` is `'sniffing' | 'watching' | 'peering' | 'waiting' | 'pouncing' | 'chasing'`. `Spot` is `'left' | 'middle' | 'right'`, starting at `middle`.

- **One atom, one write:** the engine redraws the band on every write to an atom the picture read, and each desktop redraw rebuilds the frame (the v1 blink). So activity, from and to live in one atom, and a burst of Reads writes it once.
- **What the picture reads:** `stage`, `shownMood`, `motion`, `gait`, never `tick`.
- **Module state, not atoms:** `pendingStage`, `activityUntil` (a clock tick), `runningWaits`, the three first-of-turn flags, `lastLineTick` and `activityRemark`. None of these redraw anything. A Bash call's start tick is a local inside its own hook call, so parallel calls never overwrite each other's.
- **Stored (`$.store`):** `motion` and `gait`, read once in `session.start` into atoms and written on change. If `motion` is missing and `isStill` is `true`, `motion` becomes `never` and is written back; `isStill` is no longer read after that.

## Hooks

- **`tool.call`**, one hook per tool group (Read/Grep/Glob, Edit/Write, WebFetch/WebSearch, Agent, and the existing Bash hook). Before `next`: mark activity (as today), set `pendingStage`, restart the timer, maybe write a line. Bash and Agent also raise `runningWaits`. After `next`, for Bash: the existing ruffled and proud logic runs first, and a timed mood wins. Then, on success, a git commit or push sets pouncing or chasing, and a run of more than 40 ticks (30 s) writes the keep-watch line. For Agent: restart the timer when it returns, so waiting lasts until the agent ends plus 6 ticks.
- **Clock period:** after the mood logic, if `runningWaits` is 0 and `clockTick >= activityUntil`, set `pendingStage` to `activity: null` with `from = to`, and clear `activityRemark` if it is still the line showing. Then write `stage` once if `pendingStage` differs from it.
- **`prompt.submit`:** reset the first-of-turn flags (it already clears the remark).
- **`ui.render`:** desktop draws `stageFor(...)` in place of the single drawing, sized 180 x 48 (or half). Terminal picks activity rows over mood rows by the priority above.
- **Errors:** every new hook gets the same `.catch(($, e, next) => next(e))` as v1. A failed activity write never blocks a tool call: the bookkeeping runs inside a try/catch, and `next(e)` is always called exactly once.

## Command

`/mango` learns `auto`, `walk` and `slide`; `still` and `move` change meaning.

| Word | Reply |
|---|---|
| `still` | `Mango sits still.` |
| `move` | `Mango always moves.` |
| `auto` | `Mango follows your system.` |
| `walk` | `Mango walks.` |
| `slide` | `Mango slides.` |

The help line and `argumentHint` list all words.

## Testing

Written before the code, in `hooks/activity.test.ts`, `hooks/stage.test.ts` and `hooks/mango.test.ts`.

**Pure:**
- Tool to activity and spot, for every row of the table; TodoWrite gives none.
- Lines: Read shows the basename only, never the directory, for both `/home/a/x.ts` and `C:\Users\someone\x.ts`; non-ASCII and control characters become `?`; long names are cut. WebFetch shows the host only, never userinfo, port or path; a bad URL or a `file:` URL gives no line. Grep, Glob and WebSearch lines never contain their pattern or query.
- `git commit` and `git push` count at command position only: `echo git commit` and `cat git-push.md` do not.
- `altFor` names each activity.
- `stageFor`: `from === to` has no move; `never` has no `<style>`; `always` has no `prefers-reduced-motion`; `auto` has it; `walk` contains the side view, `slide` does not; the side view and heart carry `opacity="0"`. Same inputs give the same string.

**Kit (`mango.test.ts`):**
- A Read moves her left and shows `Mango sniffs at x.ts.`; a second Read in the same turn shows no new line; after `prompt.submit` the next Read does.
- A burst of five Reads writes `stage` once (the `state.set` log guard from the blink test). A Read and a WebFetch before the same period write it once, as peering.
- A Bash that runs 20 ticks keeps her waiting the whole time; two parallel Bash calls keep her waiting until both return.
- The activity ends after 6 ticks and she keeps her spot.
- A failed Bash during an activity shows ruffled, not the activity.
- Two lines inside 14 ticks: the second is dropped. An activity line never replaces a purr.
- A Bash that runs 41 ticks and succeeds shows `Mango kept watch for 31 s.`
- A successful `git commit` sets pouncing; a failed one ruffles her.
- `still`, `move`, `auto`, `walk` and `slide` store their values and redraw; a stored `isStill: true` with no `motion` loads as `never` and writes `motion`.
- Terminal: an activity draws its rows; a timed mood beats it.

**By hand, first task of the plan:** in a new session, trigger a picture swap (a failing command, then a Read) and check whether the band flashes. If it does, stop and redesign before building on top: activities swap the picture far more often than moods do.

**After the build:** rerun `/tmp/mango-render/readme-art.mjs` if the front view changed, and check the stage in the motion harness (`poses.mjs`), never by asking for Windows animation effects.

## Out of scope

- Walking in the terminal.
- Side views for moods other than the walk.
- Keeping her exact position when a new picture starts mid-walk: she restarts from the last `to`, which can look like a small jump.
- Replaying a pounce or chase inside one activity window.
- Activities for tools outside the table.

## Considered and rejected

- **Filenames on a shared screen.** A basename shows in the band, so a screen share shows it too. Accepted: it is only the basename, she says it once per turn, and `/mango mute` hides it.
- **Writing the line in the same period as the stage.** A remark write redraws the band just as it does in v1 (purr, yawn). Lines are capped at one per 10 s, so batching them with the stage write would add code for no visible gain.
- **A per-call id to replay a pounce.** Replaying would need a changing value in the picture source. Two commits inside 4.5 s are rare, so it stays out.

> Stress-tested 2026-10-16 (skill 1b85fca): 8 applied, 1 adapted, 0 decided by me.
