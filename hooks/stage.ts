import type { Activity, Gait, Motion, Spot } from '../types'
import type { Look, Pose } from './cat'
import { AMBER, COAT, DEFS, EAR, frontStyle, frontView, NOSE, PUPIL, REDUCED, RIM, tailStrokes, WHITE } from './drawing'

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
// Her paws stand 5 units lower than the drawn side view, on the floor the front view's do.
const SIDE_VIEW = view(`<g transform="translate(0 5)">${SIDE}</g>`)
const SIDES = `<g class="side-r" opacity="0">${SIDE_VIEW}</g><g class="side-l" opacity="0"><g transform="translate(120 0) scale(-1 1)">${SIDE_VIEW}</g></g>`

const hasSide = (s: StageInput): boolean => s.motion !== 'never' && s.gait === 'walk' && (s.from !== s.to || s.activity === 'chasing')

const STAGE_KEYFRAMES = [
  '@keyframes slide-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}',
  '@keyframes pounce{0%,100%{transform:translateY(0) scaleY(1)}25%{transform:translateY(0) scaleY(0.9)}55%{transform:translateY(-6px) scaleY(1.04)}80%{transform:translateY(0) scaleY(0.96)}}',
  // A crouch squashes her down onto the floor of the stage.
  '.act{transform-origin:0 96px}',
].join('')

const stageStyle = (s: StageInput): string => {
  const anims = new Map<string, string[]>()
  const add = (selector: string, animation: string) => anims.set(selector, [...(anims.get(selector) ?? []), animation])
  const rules = [STAGE_KEYFRAMES, hasSide(s) ? SIDE_STYLE : '']

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
  // A pounce or a chase starts once she has reached her spot, and plays once.
  if (s.activity === 'pouncing') add('.act', `pounce ${sec(POUNCE)} ease-out ${sec(start)} both`)
  if (s.activity === 'chasing') {
    rules.push(`@keyframes dash{0%,100%{transform:translateX(0)}50%{transform:translateX(${RIGHT_EDGE - SPOT_X[s.to]}px)}}`)
    add('.act', `dash ${sec(DASH)} ease-in-out ${sec(start)} both`)
    travel('r', start, DASH / 2)
    travel('l', start + DASH / 2, DASH / 2)
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
    (hasSide(s) ? SIDES : '') +
    `</g></g></svg>`
  )
}
