# Mango

A fluffy black cat who lives above the prompt in Claude Code. She blinks, flicks her tail, kneads while Claude works, sleeps when I go quiet, gets ruffled by failed commands, purrs at green test runs and worries when my context passes 20 %. I built her in memory of my cat Mango.

Stack: a Claude Code mod (function hooks) in TypeScript. No dependencies, no network, no model calls, no telemetry. She runs in the terminal and in the desktop Code tab alike.

## Install

Claude Code 2.1.287 or newer.

```text
/plugin install mango --marketplace malinfossum/mango-buddy
```

## Use

| Command | What it does |
|---|---|
| `/mango` or `/mango pet` | Pet her |
| `/mango card` | Sessions together, pets, errors survived, context |
| `/mango mute` / `unmute` | Keep the cat, drop the speech line |
| `/mango still` / `move` | Freeze the animation (quieter for screen readers) |
| `/mango off` / `on` | Hide or show her |

## Develop

```bash
claude plugin validate .
claude plugin test .
```

The `.claude-plugin/types/` folder that `tsconfig.json` extends is laid by the engine after the first `claude plugin validate .` or load, so run that before `tsc`.

Contributions are welcome and come in under this repo's MIT licence.
