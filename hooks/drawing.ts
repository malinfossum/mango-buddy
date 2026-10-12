import type { Pose } from './cat'

// Mango as a picture for the surfaces that draw an Svg (desktop, editor, mobile). The
// terminal keeps the ASCII frames. Drawn on a 120 x 96 grid and shown at half that, so
// strokes stay crisp. She matches the README banner: long black coat, white ruff and
// paws, white whiskers, amber eyes.

export const DRAWING_WIDTH = 60
export const DRAWING_HEIGHT = 48

const COAT = '#1a1217'
const RIM = '#4a3a36'
const EAR = '#3a2219'
const WHITE = '#f4efe6'
const AMBER = '#f2a92e'
const PUPIL = '#0d0a10'
const NOSE = '#e58a9a'
const CLOSED = '#8a6f60'

// Accent marks share the README mood card colours.
const SLEEP_MARK = '#b9a6ff'
const PROUD_MARK = '#ffc24d'
const RUFFLED_MARK = '#ff8a80'
const WORRIED_MARK = '#8ac7ff'

const DEFS = `<defs><radialGradient id="coat" cx="0.32" cy="0.28" r="0.85"><stop offset="0" stop-color="#3b2a26"/><stop offset="0.45" stop-color="#1a1418"/><stop offset="1" stop-color="#0d0a10"/></radialGradient></defs>`

const tail = (swish: boolean): string => {
  const d = swish ? 'M 78 82 C 100 82 112 70 108 54 C 106 46 100 44 96 46' : 'M 78 82 C 102 86 114 76 112 62 C 111 56 106 54 102 56'
  return `<path d="${d}" stroke="${RIM}" stroke-width="13.4" stroke-linecap="round" fill="none" opacity="0.7"/><path d="${d}" stroke="${COAT}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#3b2a26" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>`
}

const body = `<ellipse cx="52" cy="76" rx="32" ry="18" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>`

const ears = (flat: boolean): string => {
  const [l, r, li, ri] = flat
    ? ['M 30 32 L 18 18 L 42 20 Z', 'M 74 32 L 86 18 L 62 20 Z', 'M 30 27 L 23 20 L 37 21 Z', 'M 74 27 L 81 20 L 67 21 Z']
    : ['M 28 34 L 30 6 L 48 20 Z', 'M 76 34 L 74 6 L 56 20 Z', 'M 32 28 L 33 13 L 43 21 Z', 'M 72 28 L 71 13 L 61 21 Z']
  return `<path d="${l}" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/><path d="${r}" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/><path d="${li}" fill="${EAR}"/><path d="${ri}" fill="${EAR}"/>`
}

// Long fur: the head is a circle with tufts at the cheeks.
const head = `<path d="M 28 46 L 20 50 L 28 54 L 24 60 L 34 60 Z M 76 46 L 84 50 L 76 54 L 80 60 L 70 60 Z" fill="${COAT}"/><circle cx="52" cy="42" r="25" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>`

const ruff = `<path d="M 36 62 L 32 70 L 40 68 L 38 77 L 46 72 L 48 80 L 52 73 L 56 80 L 58 72 L 66 77 L 64 68 L 72 70 L 68 62 Q 52 70 36 62 Z" fill="${WHITE}"/>`

const paws = (kneading: boolean, tick: number): string => {
  const lift = kneading ? (tick % 2 === 0 ? [4, 0] : [0, 4]) : [0, 0]
  return `<ellipse cx="42" cy="${90 - (lift[0] ?? 0)}" rx="8" ry="4.5" fill="${WHITE}"/><ellipse cx="62" cy="${90 - (lift[1] ?? 0)}" rx="8" ry="4.5" fill="${WHITE}"/>`
}

const face = `<path d="M 49 49 L 55 49 L 52 52.5 Z" fill="${NOSE}"/><path d="M 52 52.5 Q 50 55 47.5 54 M 52 52.5 Q 54 55 56.5 54" stroke="${CLOSED}" stroke-width="1" fill="none" stroke-linecap="round"/><g stroke="${WHITE}" stroke-width="0.9" stroke-linecap="round" opacity="0.8"><path d="M 44 51 L 22 47"/><path d="M 44 53 L 21 54"/><path d="M 60 51 L 82 47"/><path d="M 60 53 L 83 54"/></g>`

type Eyes = 'open' | 'closed' | 'happy' | 'squint' | 'wide'

const eyes = (kind: Eyes): string => {
  const pair = (draw: (cx: number) => string) => draw(42) + draw(62)
  switch (kind) {
    case 'open':
      return pair(cx => `<ellipse cx="${cx}" cy="40" rx="6.5" ry="5.5" fill="${AMBER}"/><ellipse cx="${cx}" cy="40" rx="1.6" ry="4.6" fill="${PUPIL}"/><circle cx="${cx + 2}" cy="38" r="1.2" fill="${WHITE}"/>`)
    case 'wide':
      return pair(cx => `<circle cx="${cx}" cy="40" r="7" fill="${AMBER}"/><circle cx="${cx}" cy="40" r="2.2" fill="${PUPIL}"/><circle cx="${cx + 2.4}" cy="37.6" r="1.3" fill="${WHITE}"/>`)
    case 'closed':
      return pair(cx => `<path d="M ${cx - 6} 40 Q ${cx} 45 ${cx + 6} 40" stroke="${CLOSED}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`)
    case 'happy':
      return pair(cx => `<path d="M ${cx - 6} 43 Q ${cx} 35 ${cx + 6} 43" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`)
    case 'squint':
      return `<path d="M 36 36 L 47 40 L 36 44" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 36 L 57 40 L 68 44" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  }
}

const zMark = (x: number, y: number, s: number): string =>
  `<path d="M ${x} ${y} h ${s} l ${-s} ${s * 1.1} h ${s}" stroke="${SLEEP_MARK}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

const mark = (pose: Pose, tick: number): string => {
  switch (pose) {
    case 'sleeping':
      return tick % 2 === 0 ? zMark(88, 20, 7) : zMark(84, 26, 6) + zMark(98, 10, 8)
    case 'proud':
      return `<path d="M 100 14 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 Z" fill="${PROUD_MARK}"/>`
    case 'ruffled':
      return `<path d="M 102 8 L 102 24" stroke="${RUFFLED_MARK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="102" cy="31" r="2" fill="${RUFFLED_MARK}"/>`
    case 'worried':
      return `<path d="M 82 18 Q 78 25 82 28 Q 86 25 82 18 Z" fill="${WORRIED_MARK}"/>`
    default:
      return ''
  }
}

const eyesFor = (pose: Pose, tick: number): Eyes => {
  switch (pose) {
    case 'awake':
      return tick % 8 === 0 ? 'closed' : 'open'
    case 'sleeping':
      return 'closed'
    case 'ruffled':
      return 'squint'
    case 'proud':
      return 'happy'
    case 'worried':
      return 'wide'
    case 'working':
      return 'open'
  }
}

// What a reader that cannot see the picture is told: the same mood the ASCII shows.
export const altFor = (pose: Pose): string => {
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

export const drawingFor = (pose: Pose, tick: number): string => {
  // Awake swishes her tail on odd ticks, as the ASCII tail flicks; asleep it lies still.
  const swish = pose === 'awake' && tick % 2 === 1
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96">` +
    DEFS +
    tail(swish) +
    body +
    paws(pose === 'working', tick) +
    ears(pose === 'ruffled') +
    head +
    ruff +
    eyes(eyesFor(pose, tick)) +
    face +
    mark(pose, tick) +
    `</svg>`
  )
}
