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
