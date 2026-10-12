import type { Pose } from './cat'

// Mango as a picture for the surfaces that draw an Svg (desktop, editor, mobile). The
// terminal keeps the ASCII frames. Drawn on a 120 x 96 grid and shown at half that, so
// strokes stay crisp. She matches the README banner: long black coat, white ruff and
// paws, white whiskers, amber eyes.
//
// She moves by CSS inside the SVG, so the browser animates her smoothly and the markup
// changes only when her pose does. A frame that is redrawn restarts every animation, so
// nothing here may depend on the clock tick. Still mode and reduced motion draw her
// without motion.

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
const HEART = '#e5484d'

// Accent marks share the README mood card colours.
const SLEEP_MARK = '#b9a6ff'
const PROUD_MARK = '#ffc24d'
const RUFFLED_MARK = '#ff8a80'
const WORRIED_MARK = '#8ac7ff'

const DEFS = `<defs><radialGradient id="coat" cx="0.32" cy="0.28" r="0.85"><stop offset="0" stop-color="#3b2a26"/><stop offset="0.45" stop-color="#1a1418"/><stop offset="1" stop-color="#0d0a10"/></radialGradient></defs>`

// A raised tail for a proud cat, a low curl for every other mood.
const tail = (isRaised: boolean): string => {
  const d = isRaised ? 'M 78 82 C 100 82 112 70 108 54 C 106 46 100 44 96 46' : 'M 78 82 C 102 86 114 76 112 62 C 111 56 106 54 102 56'
  return `<g class="tail"><path d="${d}" stroke="${RIM}" stroke-width="13.4" stroke-linecap="round" fill="none" opacity="0.7"/><path d="${d}" stroke="${COAT}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#3b2a26" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/></g>`
}

const body = `<ellipse class="body" cx="52" cy="76" rx="32" ry="18" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>`

const paws = `<ellipse class="paw-l" cx="42" cy="90" rx="8" ry="4.5" fill="${WHITE}"/><ellipse class="paw-r" cx="62" cy="90" rx="8" ry="4.5" fill="${WHITE}"/>`

const ears = (isFlat: boolean): string => {
  const [l, r, li, ri] = isFlat
    ? ['M 30 32 L 18 18 L 42 20 Z', 'M 74 32 L 86 18 L 62 20 Z', 'M 30 27 L 23 20 L 37 21 Z', 'M 74 27 L 81 20 L 67 21 Z']
    : ['M 28 34 L 30 6 L 48 20 Z', 'M 76 34 L 74 6 L 56 20 Z', 'M 32 28 L 33 13 L 43 21 Z', 'M 72 28 L 71 13 L 61 21 Z']
  const ear = (side: string, outer: string, inner: string) =>
    `<g class="perk-${side}"><g class="ear-${side}"><path d="${outer}" fill="${COAT}" stroke="${RIM}" stroke-width="1.2" stroke-linejoin="round"/><path d="${inner}" fill="${EAR}"/></g></g>`
  return ear('l', l, li) + ear('r', r, ri)
}

// Long fur: the head is a circle with tufts at the cheeks.
const head = `<path d="M 28 46 L 20 50 L 28 54 L 24 60 L 34 60 Z M 76 46 L 84 50 L 76 54 L 80 60 L 70 60 Z" fill="${COAT}"/><circle cx="52" cy="42" r="25" fill="url(#coat)" stroke="${RIM}" stroke-width="1.2"/>`

const ruff = `<path d="M 36 62 L 32 70 L 40 68 L 38 77 L 46 72 L 48 80 L 52 73 L 56 80 L 58 72 L 66 77 L 64 68 L 72 70 L 68 62 Q 52 70 36 62 Z" fill="${WHITE}"/>`

const face = `<path d="M 49 49 L 55 49 L 52 52.5 Z" fill="${NOSE}"/><path d="M 52 52.5 Q 50 55 47.5 54 M 52 52.5 Q 54 55 56.5 54" stroke="${CLOSED}" stroke-width="1" fill="none" stroke-linecap="round"/><g stroke="${WHITE}" stroke-width="0.9" stroke-linecap="round" opacity="0.8"><path d="M 44 51 L 22 47"/><path d="M 44 53 L 21 54"/><path d="M 60 51 L 82 47"/><path d="M 60 53 L 83 54"/></g>`

type Eyes = 'open' | 'closed' | 'happy' | 'squint' | 'wide'

const eyeShapes = (kind: Eyes): string => {
  const pair = (draw: (cx: number) => string) => draw(42) + draw(62)
  switch (kind) {
    case 'open':
      return pair(cx => `<ellipse cx="${cx}" cy="40" rx="6.5" ry="5.5" fill="${AMBER}"/><g class="pupil"><ellipse cx="${cx}" cy="40" rx="1.6" ry="4.6" fill="${PUPIL}"/><circle cx="${cx + 2}" cy="38" r="1.2" fill="${WHITE}"/></g>`)
    case 'wide':
      return pair(cx => `<circle cx="${cx}" cy="40" r="7" fill="${AMBER}"/><g class="pupil"><circle cx="${cx}" cy="40" r="2.2" fill="${PUPIL}"/><circle cx="${cx + 2.4}" cy="37.6" r="1.3" fill="${WHITE}"/></g>`)
    case 'closed':
      return pair(cx => `<path d="M ${cx - 6} 40 Q ${cx} 45 ${cx + 6} 40" stroke="${CLOSED}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`)
    case 'happy':
      return pair(cx => `<path d="M ${cx - 6} 43 Q ${cx} 35 ${cx + 6} 43" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`)
    case 'squint':
      return `<path d="M 36 36 L 47 40 L 36 44" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 36 L 57 40 L 68 44" stroke="${AMBER}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  }
}

// Two groups: the outer one widens on hover, the inner one blinks.
const eyes = (kind: Eyes): string => `<g class="look"><g class="eyes">${eyeShapes(kind)}</g></g>`

const zMark = (x: number, y: number, s: number, cls = ''): string =>
  `<path${cls === '' ? '' : ` class="${cls}"`} d="M ${x} ${y} h ${s} l ${-s} ${s * 1.1} h ${s}" stroke="${SLEEP_MARK}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

const mark = (pose: Pose, isAnimated: boolean): string => {
  switch (pose) {
    case 'sleeping':
      // Moving, three small z drift up from the same spot in turn; still, two sit apart.
      return isAnimated ? zMark(84, 24, 6, 'z z1') + zMark(84, 24, 6, 'z z2') + zMark(84, 24, 6, 'z z3') : zMark(84, 26, 6) + zMark(98, 10, 8)
    case 'proud':
      return `<path class="mark" d="M 100 14 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 Z" fill="${PROUD_MARK}"/>`
    case 'ruffled':
      return `<g class="mark"><path d="M 102 8 L 102 24" stroke="${RUFFLED_MARK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="102" cy="31" r="2" fill="${RUFFLED_MARK}"/></g>`
    case 'worried':
      return `<path class="mark" d="M 82 18 Q 78 25 82 28 Q 86 25 82 18 Z" fill="${WORRIED_MARK}"/>`
    default:
      return ''
  }
}

// Shown only while a pointer rests on her. Hidden by its own attribute, so a picture
// without the style sheet never shows it.
const heart = `<path class="heart" opacity="0" d="M 96 14 C 96 10 91 9 90 13 C 89 9 84 10 84 14 C 84 18 90 21 90 23 C 90 21 96 18 96 14 Z" fill="${HEART}"/>`

const eyesFor = (pose: Pose): Eyes => {
  switch (pose) {
    case 'awake':
    case 'working':
      return 'open'
    case 'sleeping':
      return 'closed'
    case 'ruffled':
      return 'squint'
    case 'proud':
      return 'happy'
    case 'worried':
      return 'wide'
  }
}

// Keyframes every pose may use. Transform origins are in the 120 x 96 grid.
const KEYFRAMES = [
  '@keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.035)}}',
  '@keyframes deep{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.06)}}',
  '@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.8px)}}',
  '@keyframes sink{0%,100%{transform:translateY(0)}50%{transform:translateY(1.2px)}}',
  '@keyframes blink{0%,44%,48%,86%,89%,92%,100%{transform:scaleY(1)}46%,87.5%,90.5%{transform:scaleY(0.1)}}',
  '@keyframes sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(7deg)}}',
  '@keyframes flick{0%,100%{transform:rotate(0)}25%{transform:rotate(16deg)}55%{transform:rotate(-8deg)}}',
  '@keyframes shiver{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}',
  '@keyframes twitch-l{0%,58%,66%,100%{transform:rotate(0)}61%{transform:rotate(-14deg)}}',
  '@keyframes twitch-r{0%,22%,30%,100%{transform:rotate(0)}25%{transform:rotate(14deg)}}',
  '@keyframes knead{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
  '@keyframes drift{0%{opacity:0;transform:translate(0,3px)}25%{opacity:1}100%{opacity:0;transform:translate(14px,-18px)}}',
  '@keyframes twinkle{0%,100%{opacity:0.6;transform:scale(0.75) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(25deg)}}',
  '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}',
  '@keyframes drip{0%{opacity:0;transform:translateY(-2px)}20%{opacity:1}100%{opacity:0;transform:translateY(7px)}}',
  '@keyframes glance{0%,20%,90%,100%{transform:translateX(0)}30%,50%{transform:translateX(-2px)}60%,80%{transform:translateX(2px)}}',
  '@keyframes love{0%{opacity:0;transform:translateY(4px) scale(0.6)}25%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-8px) scale(1)}}',
].join('')

const ORIGINS = [
  '.body{transform-origin:52px 94px}',
  '.tail{transform-origin:78px 82px}',
  '.eyes,.look{transform-origin:52px 40px}',
  '.ear-l,.perk-l{transform-origin:38px 30px}',
  '.ear-r,.perk-r{transform-origin:66px 30px}',
  '.mark{transform-origin:103px 22px}',
  '.heart{transform-origin:90px 16px}',
  '.perk-l,.perk-r,.look{transition:transform 0.25s ease-out}',
].join('')

// A pointer on her perks her ears, widens her eyes and floats a heart.
const HOVER = 'svg:hover .perk-l{transform:rotate(6deg) translateY(-1px)}svg:hover .perk-r{transform:rotate(-6deg) translateY(-1px)}svg:hover .look{transform:scale(1.08)}svg:hover .heart{animation:love 1.8s ease-out infinite}'

// Without motion the three z would sit on one spot, so they spread out as a still picture.
const REDUCED = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.z2{transform:translate(7px,-8px)}.z3{transform:translate(14px,-16px)}}'

const motionFor = (pose: Pose): string => {
  const breath = (name: string, seconds: number) => `.body{animation:${name} ${seconds}s ease-in-out infinite}.head{animation:${name === 'deep' ? 'sink' : 'bob'} ${seconds}s ease-in-out infinite}`
  const tailMoves = (name: string, seconds: number, timing = 'ease-in-out') => `.tail{animation:${name} ${seconds}s ${timing} infinite}`
  const blink = '.eyes{animation:blink 6.8s linear infinite}'
  const earTwitch = '.ear-l{animation:twitch-l 9s ease-in-out infinite}.ear-r{animation:twitch-r 11s ease-in-out infinite}'
  switch (pose) {
    case 'awake':
      return breath('breathe', 3.2) + tailMoves('sway', 4.4) + blink + earTwitch
    case 'working':
      return (
        breath('breathe', 3.2) + tailMoves('sway', 2.6) + blink + earTwitch +
        '.paw-l{animation:knead 0.9s ease-in-out infinite}.paw-r{animation:knead 0.9s ease-in-out -0.45s infinite}'
      )
    case 'sleeping':
      // Asleep she keeps one ear on the keyboard.
      return (
        breath('deep', 5) + '.ear-r{animation:twitch-r 13s ease-in-out infinite}' +
        '.z{animation:drift 3.6s ease-out infinite}.z2{animation-delay:-1.2s}.z3{animation-delay:-2.4s}'
      )
    case 'proud':
      return breath('breathe', 3.2) + tailMoves('sway', 3.6) + '.mark{animation:twinkle 1.6s ease-in-out infinite}'
    case 'ruffled':
      return breath('breathe', 1.6) + tailMoves('flick', 0.9) + '.mark{animation:pulse 0.6s ease-in-out infinite}'
    case 'worried':
      return (
        breath('breathe', 2.2) + tailMoves('shiver', 1.2) + blink +
        '.pupil{animation:glance 4s ease-in-out infinite}.mark{animation:drip 2.4s ease-in infinite}'
      )
  }
}

const styleFor = (pose: Pose): string => `<style>${KEYFRAMES}${ORIGINS}${motionFor(pose)}${HOVER}${REDUCED}</style>`

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

export const drawingFor = (pose: Pose, isAnimated: boolean): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96">` +
  DEFS +
  (isAnimated ? styleFor(pose) : '') +
  tail(pose === 'proud') +
  body +
  paws +
  `<g class="head">` +
  ears(pose === 'ruffled') +
  head +
  ruff +
  eyes(eyesFor(pose)) +
  face +
  `</g>` +
  mark(pose, isAnimated) +
  heart +
  `</svg>`
