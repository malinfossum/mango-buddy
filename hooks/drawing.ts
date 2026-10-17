import type { Activity } from '../types'
import type { Look, Pose } from './cat'

// Mango as a picture for the surfaces that draw an Svg (desktop, editor, mobile). The
// terminal keeps the ASCII frames. Drawn on a 120 x 96 grid and shown at half that, so
// strokes stay crisp. She is drawn from photos of the real Mango: a long black coat with
// a brown sheen, a white bib and mittens, long white whiskers and golden eyes.
//
// She moves by CSS inside the SVG, so the browser animates her smoothly and the markup
// changes only when her pose does. A frame that is redrawn restarts every animation, so
// nothing here may depend on the clock tick. Still mode and reduced motion draw her
// without motion.

export const DRAWING_WIDTH = 60
export const DRAWING_HEIGHT = 48

export const COAT = '#1a1210'
export const RIM = '#433632'
export const WHITE = '#f4efe6'
export const EYE = '#f0c040'
export const PUPIL = '#0d0a10'
const EAR = '#3a2219'
const TUFT = '#e0d6ca'
const LEG = '#150f0e'
const NOSE = '#0a0708'
const CLOSED = '#8a6f60'
const HEART = '#e5484d'

// Accent marks share the README mood card colours.
const SLEEP_MARK = '#b9a6ff'
const PROUD_MARK = '#ffc24d'
const RUFFLED_MARK = '#ff8a80'
const WORRIED_MARK = '#8ac7ff'

export const DEFS = `<defs><radialGradient id="coat" cx="0.32" cy="0.28" r="0.85"><stop offset="0" stop-color="#33231b"/><stop offset="0.45" stop-color="#141011"/><stop offset="1" stop-color="#09080a"/></radialGradient><radialGradient id="iris" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fde98e"/><stop offset="0.6" stop-color="${EYE}"/><stop offset="1" stop-color="#c0841c"/></radialGradient></defs>`

type Point = [number, number]

// Coordinates are rounded to one decimal, so a path is short and the same every time.
const r1 = (n: number): number => Math.round(n * 10) / 10
const P = (x: number, y: number): string => `${r1(x)} ${r1(y)}`

// Mirrors every point in a path around her centre line at x 52.
const flipPath = (d: string): string => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${r1(104 - Number(x))} ${y}`)

// A fur outline around an ellipse: tufts with pointed tips. depth(a) is the tuft length
// at angle a (degrees, 0 = right, 90 = down).
const fluff = (cx: number, cy: number, rx: number, ry: number, n: number, depth: number | ((a: number) => number), lean = 0.15): string => {
  const pt = (a: number, k: number): Point => {
    const t = (a * Math.PI) / 180
    return [cx + Math.cos(t) * (rx + k), cy + Math.sin(t) * (ry + k)]
  }
  const step = 360 / n
  let d = `M ${P(...pt(0, 0))}`
  for (let i = 0; i < n; i++) {
    const a = i * step
    const k = typeof depth === 'function' ? depth(a + step / 2) : depth
    d += ` Q ${P(...pt(a + step * 0.3, k * 0.1))} ${P(...pt(a + step * (0.5 + lean), k))}`
    d += ` Q ${P(...pt(a + step * 0.8, k * 0.25))} ${P(...pt(a + step, 0))}`
  }
  return `${d} Z`
}

// A bushy plume along a cubic Bezier: w wide at its fullest, n tufts down each edge.
const plume = (p0: Point, p1: Point, p2: Point, p3: Point, w: number, n: number, tuft: number): string => {
  const at = (t: number) => {
    const u = 1 - t
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
    const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
    const l = Math.hypot(dx, dy) || 1
    return { x, y, nx: -dy / l, ny: dx / l, tx: dx / l, ty: dy / l }
  }
  const width = (t: number) => w * (0.42 + 0.78 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)))
  const side = (s: number): Point[] => {
    const pts: Point[] = []
    for (let i = 0; i <= n * 2; i++) {
      const t = i / (n * 2)
      const c = at(t)
      const isTip = i % 2 === 1
      const half = width(t) / 2 + (isTip ? tuft : 0)
      // Tips lean back toward the base, like fur.
      const back = isTip ? -1.6 : 0
      pts.push([c.x + c.nx * half * s + c.tx * back, c.y + c.ny * half * s + c.ty * back])
    }
    return pts
  }
  const left = side(1)
  const right = side(-1).reverse()
  const end = at(1)
  const tip: Point = [end.x + end.tx * (width(1) / 2 + 3), end.y + end.ty * (width(1) / 2 + 3)]
  // Each tuft bulges out to its tip, then sweeps back in to the next valley. lead is how
  // the edge is reached: a move for the first, a curve round the tip for the second.
  const trace = (lead: string, pts: Point[]): string => {
    let d = ''
    let prev: Point | null = null
    for (const [i, [bx, by]] of pts.entries()) {
      if (prev === null) d += `${lead} ${P(bx, by)}`
      else {
        const [ax, ay] = prev
        d += i % 2 === 1 ? ` Q ${P(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.75)} ${P(bx, by)}` : ` Q ${P(ax + (bx - ax) * 0.75, ay + (by - ay) * 0.25)} ${P(bx, by)}`
      }
      prev = [bx, by]
    }
    return d
  }
  return `${trace('M', left)}${trace(` Q ${P(...tip)}`, right)} Z`
}

// The low plume starts under her body and curls up along the floor; the raised one stands
// up behind her for a proud cat or one on a chase.
const TAIL_LOW = `<path d="${plume([60, 88], [88, 89], [108, 86], [106, 68], 10, 6, 2.2)}" fill="url(#coat)" stroke="${RIM}" stroke-width="1"/>`
const TAIL_UP = `<path d="${plume([74, 86], [100, 84], [112, 60], [102, 40], 11, 7, 2.6)}" fill="url(#coat)" stroke="${RIM}" stroke-width="1"/>`

const tail = (isRaised: boolean): string => (isRaised ? `<g class="tail tail-up">${TAIL_UP}</g>` : `<g class="tail">${TAIL_LOW}</g>`)

// Sitting tall: a fluffy body, smooth along the floor, with her front legs before it.
const LEGS = `<path d="M 38.5 70 L 38.5 90 L 48.5 90 L 48.5 72 Z M 65.5 70 L 65.5 90 L 55.5 90 L 55.5 72 Z" fill="${LEG}" stroke="${RIM}" stroke-width="0.8" stroke-linejoin="round"/>`
const BODY = `<g class="body"><path d="${fluff(52, 79, 26, 16, 16, a => (Math.sin((a * Math.PI) / 180) > 0.6 ? 0.4 : 2.8))}" fill="url(#coat)" stroke="${RIM}" stroke-width="1"/>${LEGS}</g>`

// White mittens over the toes.
const mitten = (cx: number, cy: number): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="5.6" ry="3.4" fill="${WHITE}"/><path d="M ${cx - 1.8} ${cy - 1} L ${cx - 1.8} ${cy + 2.6} M ${cx + 1.8} ${cy - 1} L ${cx + 1.8} ${cy + 2.6}" stroke="#cfc6ba" stroke-width="0.6"/>`
const PAWS = `<g class="paw-l">${mitten(43.5, 91)}</g><g class="paw-r">${mitten(60.5, 91)}</g>`

type Ears = 'up' | 'flat' | 'forward'

// The left ear of each kind; the right one is its mirror image.
const EAR_SHAPES: Record<Ears, { outer: string; inner: string; tufts: string[] }> = {
  up: { outer: 'M 29 33 L 31 6 L 48 22 Z', inner: 'M 33 28 L 34 13 L 43 22 Z', tufts: ['M 35 27 Q 34 21 35 15', 'M 37 27 Q 37 21 38 17', 'M 39 26 Q 40 22 41 19'] },
  flat: { outer: 'M 30 32 L 17 18 L 43 21 Z', inner: 'M 30 27 L 23 20.5 L 38 22 Z', tufts: ['M 31 26 Q 27 23.5 24.5 21.5', 'M 33 25 Q 30 23 27.5 21.8'] },
  // Pricked forward for a cat that peers: taller, narrower, turned in.
  forward: { outer: 'M 30 32 L 35 3 L 49 21 Z', inner: 'M 34 27 L 36 10 L 44 22 Z', tufts: ['M 36 26 Q 36 19 37 13', 'M 38 26 Q 39 20 40 16', 'M 40 25 Q 41 22 42 19'] },
}

const earShape = (outer: string, inner: string, tufts: string[]): string =>
  `<path d="${outer}" fill="${COAT}" stroke="${RIM}" stroke-width="1" stroke-linejoin="round"/><path d="${inner}" fill="${EAR}"/><g stroke="${TUFT}" stroke-width="0.6" stroke-linecap="round" opacity="0.85">${tufts.map(t => `<path d="${t}"/>`).join('')}</g>`

const EARS = Object.fromEntries(
  (Object.keys(EAR_SHAPES) as Ears[]).map(kind => {
    const { outer, inner, tufts } = EAR_SHAPES[kind]
    const side = (s: string, shape: string) => `<g class="perk-${s}"><g class="ear-${s}">${shape}</g></g>`
    return [kind, side('l', earShape(outer, inner, tufts)) + side('r', earShape(flipPath(outer), flipPath(inner), tufts.map(flipPath)))]
  }),
) as Record<Ears, string>

const ears = (kind: Ears): string => EARS[kind]

const earsFor = (look: Look): Ears => (look === 'ruffled' ? 'flat' : look === 'peering' ? 'forward' : 'up')

// Long fur: the ruff stands out widest at the cheeks, and the crown stays short.
const HEAD = `<path d="${fluff(
  52,
  40,
  20,
  17.5,
  18,
  a => {
    const c = Math.abs(Math.cos((a * Math.PI) / 180))
    const s = Math.sin((a * Math.PI) / 180)
    return s < -0.4 ? 1.2 : 2 + 6 * c * c * (s > -0.1 ? 1 : 0.5) + 2 * Math.max(0, s)
  },
  0.3,
)}" fill="url(#coat)" stroke="${RIM}" stroke-width="0.8"/>`

// A big white bib from under her chin to a point on her chest. Each tuft down the left
// edge is the valley it starts from and its tip; it bulges out to the tip and snaps back
// in a straight line to the next valley, like a lock of fur. The last valley is the point.
const BIB_TUFTS: [Point, Point][] = [[[38, 57], [30, 62]], [[34, 64], [30, 70]], [[36, 70], [34, 76]], [[41, 75], [42, 81]], [[46, 80], [49, 85]]]

const BIB = (() => {
  let down = ''
  let up = ''
  let next: Point = [52, 84]
  for (const [[vx, vy], [tx, ty]] of [...BIB_TUFTS].reverse()) {
    const [nx, ny] = next
    down = ` Q ${P(vx + (tx - vx) * 0.2, vy + (ty - vy) * 0.8)} ${P(tx, ty)} L ${P(nx, ny)}${down}`
    // The right edge mirrors it on the way back up: tip first, then the valley.
    const [mtx, mvx] = [104 - tx, 104 - vx]
    up += ` L ${P(mtx, ty)} Q ${P(mvx + (mtx - mvx) * 0.2, vy + (ty - vy) * 0.8)} ${P(mvx, vy)}`
    next = [vx, vy]
  }
  return (
    `<path d="M ${P(38, 57)}${down}${up} Q 64 53.5 60 56.5 Q 56 53.5 52 56 Q 48 53.5 44 56.5 Q 40 53.5 38 57 Z" fill="${WHITE}"/>` +
    `<g stroke="#cfc5b8" stroke-width="0.6" fill="none" stroke-linecap="round" opacity="0.9"><path d="M 44 61 Q 45 67 47 72"/><path d="M 60 61 Q 59 67 57 72"/><path d="M 52 62 L 52 80"/><path d="M 37 61 Q 38 65 40 68"/><path d="M 67 61 Q 66 65 64 68"/><path d="M 49 74 Q 50 78 51 81"/><path d="M 55 74 Q 54 78 53 81"/></g>`
  )
})()

// A black nose, the mouth, three long whiskers a cheek and two brow whiskers above each eye.
const FACE =
  `<path d="M 49 47.6 Q 52 46.8 55 47.6 Q 54 50.2 52 51.2 Q 50 50.2 49 47.6 Z" fill="${NOSE}" stroke="#4a3a34" stroke-width="0.6"/><ellipse cx="51" cy="48.2" rx="1" ry="0.45" fill="#7a6a64" opacity="0.7"/>` +
  `<path d="M 52 51.2 L 52 52.6 Q 50 54.6 47.8 53.8 M 52 52.6 Q 54 54.6 56.2 53.8" stroke="#5a4842" stroke-width="0.8" fill="none" stroke-linecap="round"/>` +
  `<g stroke="${WHITE}" stroke-width="0.75" fill="none" stroke-linecap="round" opacity="0.9">` +
  `<path d="M 46 50.5 Q 32 45.8 19.5 44.2"/><path d="M 46 52 Q 32 50.8 17.5 52"/><path d="M 46 53.5 Q 32 55.6 20.5 59"/>` +
  `<path d="M 58 50.5 Q 72 45.8 84.5 44.2"/><path d="M 58 52 Q 72 50.8 86.5 52"/><path d="M 58 53.5 Q 72 55.6 83.5 59"/>` +
  `<path d="M 38.5 32.8 Q 34 30.8 30 30"/><path d="M 40.5 32.2 Q 36.5 30 33 29.2"/><path d="M 65.5 32.8 Q 70 30.8 74 30"/><path d="M 63.5 32.2 Q 67.5 30 71 29.2"/></g>`

type Eyes = 'open' | 'closed' | 'happy' | 'squint' | 'wide'

const eyeShapes = (kind: Eyes): string => {
  const pair = (draw: (cx: number) => string) => draw(42) + draw(62)
  switch (kind) {
    case 'open':
      return pair(cx => `<circle cx="${cx}" cy="40" r="6.6" fill="url(#iris)" stroke="#5a3a10" stroke-width="0.8"/><g class="pupil"><ellipse cx="${cx}" cy="40" rx="2.3" ry="4.9" fill="${PUPIL}"/><circle cx="${cx + 2.3}" cy="37.6" r="1.4" fill="${WHITE}"/></g>`)
    case 'wide':
      return pair(cx => `<circle cx="${cx}" cy="40" r="7.2" fill="url(#iris)" stroke="#5a3a10" stroke-width="0.8"/><g class="pupil"><circle cx="${cx}" cy="40" r="3.1" fill="${PUPIL}"/><circle cx="${cx + 2.5}" cy="37.4" r="1.5" fill="${WHITE}"/></g>`)
    case 'closed':
      return pair(cx => `<path d="M ${cx - 5.5} 40 Q ${cx} 44.5 ${cx + 5.5} 40" stroke="${CLOSED}" stroke-width="2" fill="none" stroke-linecap="round"/>`)
    case 'happy':
      return pair(cx => `<path d="M ${cx - 5.5} 42.5 Q ${cx} 34.5 ${cx + 5.5} 42.5" stroke="${EYE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`)
    case 'squint':
      return `<g stroke="${EYE}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M 37 36 L 47 40 L 37 44"/><path d="M 67 36 L 57 40 L 67 44"/></g>`
  }
}

// Two groups: the outer one widens on hover, the inner one blinks.
const eyes = (kind: Eyes): string => `<g class="look"><g class="eyes">${eyeShapes(kind)}</g></g>`

const zMark = (x: number, y: number, s: number, cls = ''): string =>
  `<path${cls === '' ? '' : ` class="${cls}"`} d="M ${x} ${y} h ${s} l ${-s} ${s * 1.1} h ${s}" stroke="${SLEEP_MARK}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

const mark = (look: Look, isAnimated: boolean): string => {
  switch (look) {
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

// Keyframes only the activity looks use. Kept apart so the single drawing stays as it is.
const LOOK_KEYFRAMES = [
  '@keyframes sniff{0%,100%{transform:translateY(0)}50%{transform:translateY(1.5px)}}',
  '@keyframes follow{0%,100%{transform:translateX(-2.5px)}50%{transform:translateX(2.5px)}}',
  '@keyframes tap{0%,55%,100%{transform:rotate(0)}70%{transform:rotate(8deg)}85%{transform:rotate(-2deg)}}',
].join('')

const ORIGINS = [
  '.body{transform-origin:52px 94px}',
  // The low plume lies along the floor and turns about a point low by her haunch, where a
  // sway keeps every tuft off the floor; the raised one turns about its base.
  '.tail{transform-origin:82px 92px}',
  '.tail-up{transform-origin:74px 86px}',
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
export const REDUCED = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.z2{transform:translate(7px,-8px)}.z3{transform:translate(14px,-16px)}}'

const motionFor = (look: Look): string => {
  const breath = (name: string, seconds: number) => `.body{animation:${name} ${seconds}s ease-in-out infinite}.head{animation:${name === 'deep' ? 'sink' : 'bob'} ${seconds}s ease-in-out infinite}`
  const tailMoves = (name: string, seconds: number, timing = 'ease-in-out') => `.tail{animation:${name} ${seconds}s ${timing} infinite}`
  const blink = '.eyes{animation:blink 6.8s linear infinite}'
  const earTwitch = '.ear-l{animation:twitch-l 9s ease-in-out infinite}.ear-r{animation:twitch-r 11s ease-in-out infinite}'
  switch (look) {
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
  }
}

// A look's style for the picture: no hover rules, which a picture drawn as an image never
// gets, and no reduced-motion query, which the picture adds or leaves out by the motion
// setting. The heart's keyframes and origin ride along unused: drawingFor shares them.
export const frontStyle = (look: Look): string => `${KEYFRAMES}${LOOK_KEYFRAMES}${ORIGINS}${motionFor(look)}`

// The front view's markup on the 120 x 96 grid, without the <svg> around it, a style or
// the heart (the picture has no hover).
// Sniffing lowers her head over her chest and leaves the bib where it is; everything else
// about a look is in its eyes, ears and motion.
export const frontView = (look: Look, isAnimated: boolean): string => {
  const face = `${eyes(eyesFor(look))}${FACE}`
  const earPair = ears(earsFor(look))
  return (
    tail(look === 'proud' || look === 'chasing') +
    BODY +
    PAWS +
    (look === 'sniffing'
      ? `${BIB}<g transform="translate(0 11)"><g class="head">${earPair}${HEAD}${face}</g></g>`
      : `<g class="head">${earPair}${HEAD}${BIB}${face}</g>`) +
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
