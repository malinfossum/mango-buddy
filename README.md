<p align="center">
  <img src="assets/banner.svg" alt="Mango, a long-haired black cat with a white ruff, white paws and amber eyes, lies in a loaf on a blue knitted cushion in front of a glowing orange moon." width="100%">
</p>

<p align="center">
  <b>A fluffy black cat who lives above your Claude Code prompt.</b><br>
  <i>In loving memory of my Mango, the most amazing cat who ever lived.</i> 🧡
</p>

---

## 🐈‍⬛ Meet Mango

Mango sits in the little band above the prompt and keeps you company while you work. She blinks, flicks her tail and kneads while Claude thinks. She naps when you go quiet, flattens her ears at a failed command, purrs at a green test run and gets a little worried when your context window fills up.

```text
 /\_/\
( o.o ) ~   Mango blinks slowly at you.
```

She is small, she is soft, and she is always there.

## 🌙 Her moods

<p align="center">
  <img src="assets/moods.svg" alt="Six mood cards. Awake: just being here. Working: kneads while Claude works. Proud: purrs at green test runs. Sleeping: naps when you go quiet. Ruffled: after a failed command. Worried: when context passes 20 percent." width="100%">
</p>

Every mood comes with something to say, like *"Mango knocks the error off the table."* or *"Mango dreams of warm laptops."* Pet her and she leans into your hand.

## 🧺 Bring her home

You need Claude Code 2.1.287 or newer. Type this at the prompt in a terminal session:

```text
/plugin install mango --marketplace malinfossum/mango-buddy
```

Say `y` to add the marketplace, then pick **user** scope so she follows you into every project.

## 🐾 Talk to her

| Command | What happens |
|---|---|
| `/mango` or `/mango pet` | You pet her. She purrs. |
| `/mango card` | Your story together: sessions, pets, errors survived, context |
| `/mango mute` / `unmute` | She stays, but keeps her thoughts to herself |
| `/mango still` / `move` | She sits perfectly still (calmer for screen readers and reduced motion) |
| `/mango off` / `on` | She hides, or comes back. She remembers this between sessions. |

## 🌸 Gentle by design

- **She never phones home.** No network, no model calls, no telemetry, no dependencies.
- **She is made of text.** Her art is plain ASCII, so she fits any terminal.
- **She makes room.** On a narrow or short band she curls up into a single line.
- **She works everywhere.** The terminal and the desktop Code tab alike.

## 🛠️ For tinkerers

She is a Claude Code mod (function hooks) written in TypeScript.

```bash
claude plugin validate .
claude plugin test .
```

The `.claude-plugin/types/` folder that `tsconfig.json` extends is laid by the engine after the first `claude plugin validate .` or load, so run that before `tsc`.

Contributions are welcome and come in under this repo's MIT licence.

## 🧡 Why she exists

Mango was my cat. A fluffy black cat, the most amazing cat who ever lived, and I miss her every single day. I built this so a small part of her can sit with me while I code, and maybe keep you company too.

<p align="center"><i>Made with love, for Mango.</i> 🐈‍⬛🥭</p>
