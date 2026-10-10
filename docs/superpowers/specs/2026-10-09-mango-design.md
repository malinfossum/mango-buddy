# Mango: a fluffy black cat above the prompt

Design spec, 2026-10-09. Status: approved in chat, written for the implementation plan.

## Purpose

A companion for Claude Code, in memory of my cat Mango. She sits in the band above the prompt, reacts to what the session is doing, and never costs me tokens, network calls or telemetry. Built as a Claude Code mod (a plugin of function hooks), so it runs in the desktop Code tab and the terminal alike.

## Constraints

- No model calls (`$.model.*`), no `$.http`, no `$.process`, no `telemetry.*` hooks. The mod only reads session events and draws.
- Stays under the budget rules I already run: one atom write per animation tick and nothing in the transcript.
- Pure ASCII art and plain English text so every terminal renders the same width.
- Requires Claude Code 2.1.287 or newer (function hooks). The API is early access; pin behaviour to the types bundled with the installed build, not to docs.
- The band renders constant strings only. No tool input, tool output, command text, file path or prompt text ever reaches the band, a toast or a command reply.
- The band holds no Buttons or Inputs, so it never takes focus and arms no hotkeys.

## Shape

One plugin, `mango`, version 0.1.0:

```
mango/
  .claude-plugin/plugin.json      name, version, description, "types": "./types/index.d.ts"
  .claude-plugin/marketplace.json one-file marketplace so /plugin install works
  hooks/hooks.json                { "modules": ["./register.tsx"] }
  hooks/register.tsx              the hooks module
  hooks/mango.test.ts             behaviour tests for `claude plugin test`
  types/index.d.ts                PluginState contract for every $.state value
  README.md, LICENSE (MIT)
```

The band is drawn by a `ui.render` hook on `{ component: 'AbovePrompt' }`. It yields (`next(e)`) when `e.props.hasSurvey` is true or Mango is off. Otherwise it returns a `Box` with two `Text` rows of cat and one `Text` row of speech or stats, about 12 columns of art plus the line.

## State

Session values (`$.state`, declared in `types/index.d.ts` under `mango`):

| Key | Type | Meaning |
|---|---|---|
| `tick` | number | Incremented every 750 ms by the clock; drives frames and remark rotation |
| `mood` | `'awake' \| 'working' \| 'sleeping' \| 'ruffled' \| 'proud' \| 'worried'` | Current mood |
| `moodUntil` | number | Tick after which a timed mood (ruffled, proud) falls back |
| `lastActivityTick` | number | Last tick with a prompt, tool call or turn end; sleep starts 160 ticks (about two minutes) later |
| `contextPercent` | number | From `$.session.usage().context.percent`, read on `turn.complete` |
| `remark` | string \| null | The speech line shown; null shows the stats line |
| `isSessionCounted` | boolean | True once this session has been added to `sessions`; `$.state` survives a hot reload, so a reload does not count again |
| `wasOverBudget` | boolean | True while `contextPercent >= 20`; the toast fires only on a false-to-true change |

Persistent values (`$.store`, JSON, survive restarts): `isOff`, `isMuted`, `isStill`, `pets`, `errorsSurvived`, `sessions`. Flags are read once in `session.start` into atoms and written on change. Counters are read-modify-write at the moment they change (`Number(await $.store.get(key)) || 0`, then `+ 1`, then `set`), never written from a cached total, so two open sessions lose at most one increment to each other. Every store read is coerced: numbers through `Number(x) || 0`, flags through `x === true`; a corrupt or missing value falls back to its default.

## Moods and transitions

| Mood | Frame cue | Enters when | Leaves when |
|---|---|---|---|
| awake | blink every 8 ticks, tail flick on odd ticks | session start, turn complete, any timed mood ends | see others |
| working | kneading paws, two-frame loop | `e.props.isWorking` is true at render (no state write needed) | the turn ends |
| sleeping | eyes closed, `zzz` | 160 ticks without activity | next prompt or tool call |
| ruffled | ears back, `!` | a Bash `tool.call` result has `isError: true` | 8 ticks later |
| proud | eyes up, `*` | a Bash command matching the test regex resolves without error | 12 ticks later |
| worried | wide eyes | `contextPercent >= 20` after a turn | `contextPercent < 20` after a later turn |

Priority when several apply: working is drawn whenever `isWorking` is true, regardless of mood. Otherwise ruffled and proud (timed) beat worried, and worried beats awake and sleeping.

Test regex, applied to the trimmed Bash command and anchored to command position (the start of the line, or after `&&`, `;` or `|`, with optional `VAR=value` prefixes), so `npm install -D vitest` and `cat jest.config.js` do not count: `/(^|&&|;|\|)\s*(\w+=\S*\s+)*((npm|pnpm|yarn|bun)\s+(run\s+)?test|(npx\s+|pnpm\s+exec\s+)?(vitest|jest)|dotnet\s+test)\b/`.

## Hooks

- `session.start`: load store flags into atoms; if `isSessionCounted` is false, increment `sessions` and set it true; register the `/mango` command; start `$.clock.every(750, tick)`. The tick handler skips the atom write while `isStill` is true and the mood is unchanged, so still mode redraws only on a mood change.
- `prompt.submit`: mark activity, clear the remark, then `next(e)` unchanged.
- `tool.call` with `{ tool: 'Bash' }`: `await next(e)`; on `isError` set ruffled, bump `errorsSurvived`, pick a ruffled remark; on a test command without error set proud with a proud remark. Never deny or rewrite.
- `turn.complete`: mark activity; read `$.session.usage()`; store `context.percent` (fall back to `tokens / window * 100` when `percent` is absent and `window > 0`, else leave the previous value); if `wasOverBudget` flips from false to true, `$.ui.toast('Mango: context passed 20 %')` and set worried; if `durationMs > 120000`, remark a yawn line.
- `ui.render` on `AbovePrompt`: described above, with two size guards. When `e.props.maxRows < 3` draw one row: the face `(-.-)` and the speech line. The speech line is cut to `e.props.bodyColumns - 12` characters (ten columns of art plus a two column gap), or `e.props.bodyColumns - 7` in the one-row form (five columns of face plus the gap), so it never wraps. A band narrower than the art draws the art with an empty line.
- `command.run` with `{ command: 'mango' }`: dispatch on the first word of `e.args`.

## Command

`/mango <sub>`:

| Sub | Effect | Reply text |
|---|---|---|
| `pet` (default when empty) | `pets += 1`, remark a purr line | `Mango purrs.` |
| `mute` / `unmute` | toggle `isMuted`; muted hides the speech row and keeps the cat | `Mango is quiet now.` / `Mango may speak again.` |
| `still` / `move` | toggle `isStill`; still freezes the tick animation (a reduced-motion switch, and quieter for screen readers that re-read the band) while mood changes still redraw | `Mango sits still.` / `Mango moves again.` |
| `off` / `on` | toggle `isOff`; off hides the whole band | `Mango is away.` / `Mango is back.` |
| `card` | stats | `Mango · sessions N · pets N · errors survived N · context P %` |
| anything else | help | one line listing the subcommands |

## Remarks

Short English one-liners, four to six per mood, held in a const table keyed by mood. The line shown is `lines[tick % lines.length]` at the moment the mood is entered, stored in `remark` so it does not flicker. The stats row (shown when `remark` is null and not muted) reads `context P %` dimmed, so the budget is always one glance away.

## Error handling

Every hook carries a `.catch` that falls through to `next(e)` when the hook has not yet called it: Mango never blocks a tool, a prompt or a turn. A failed store read falls back to defaults. A usage read that rejects leaves `contextPercent` unchanged.

## Testing

`hooks/mango.test.ts`, run by `claude plugin test`:

1. A Bash call that resolves with `isError: true` sets mood ruffled and increments `errorsSurvived`.
2. A Bash `npm test` that resolves cleanly sets mood proud; `ls` does not.
3. `turn.complete` with usage at 25 % sets worried and toasts once; a later turn at 10 % returns to awake with no second toast.
4. 160 ticks without activity sleep; a prompt wakes.
5. `/mango pet` increments `pets` and replies `Mango purrs.`; `/mango off` hides the band (render yields to `next`).
6. The test regex rejects `npm install`, `echo test`, `ls`, `npm install -D vitest`, `cat jest.config.js` and `rm vitest.config.ts` and accepts `npm test`, `pnpm run test`, `dotnet test`, `npx vitest`.
7. A Bash hook body that throws after `next` still returns the tool's result once (the `.catch` replays `next`), and the band still draws.
8. `session.start` run twice in one session (a hot reload) increments `sessions` once.
9. With `isStill` true, 20 ticks produce no atom write; a mood change produces one.
10. `turn.complete` with `percent` absent and `window: 0` leaves `contextPercent` unchanged.

Plus `claude plugin validate <folder>` clean and `tsc -p <folder>` clean once the engine has laid the types.

Visual check: after the first hot reload I look at the band myself and confirm the art lines up (two art rows share the left edge, the speech row sits on the same baseline as the second art row). I cannot screenshot this session's own band from inside it.

## Repo and dev loop

- Repo `Development\GitHub\repos\mango-buddy`, GitHub `malinfossum/mango-buddy`, public, MIT. The plugin name and the command stay `mango`; only the repo is `mango-buddy`.
- The session's `~/.claude/dev-mods/<session>/mango` is a directory junction to the repo so hot reload and git see the same files.
- Install line for the README: `/plugin install mango --marketplace malinfossum/mango-buddy`.
- README carries one line: contributions are licensed under the repo's MIT licence.
- Telemetry: the mod registers no `telemetry.*` hooks and sends nothing. The existing `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` stays.

## Out of scope for v1

Hatching or rarity, sounds, a pane, Norwegian remarks, replacing my shell `context-budget` hook, any `$.model` use.

> Stress-tested 2026-10-09 (skill a06dd56) — 9 applied, 0 adapted, 0 decided by me.
