import type { Activity, Motion } from '../types'
import type { Look, Pose } from './cat'
import { DEFS, frontStyle, frontView, LASH_KEYFRAMES, REDUCED } from './drawing'

// Mango's picture on the desktop: the front view on its 120 x 96 grid, drawn at 60 x 48
// where the single drawing sits. She stays in place; a pounce hops and a chase bounces
// there, once per picture. Pure: the same inputs give the same string.

export type PictureInput = { pose: Pose; activity: Activity | null; motion: Motion }

const ACT_KEYFRAMES = [
  '@keyframes pounce{0%,100%{transform:translateY(0) scaleY(1)}25%{transform:translateY(0) scaleY(0.9)}55%{transform:translateY(-4px) scaleY(1)}80%{transform:translateY(0) scaleY(0.96)}}',
  // Three quick hops on the spot.
  '@keyframes bounce{0%,30%,60%,100%{transform:translateY(0)}15%,45%,75%{transform:translateY(-3px)}}',
  // A crouch squashes her down onto the floor under her paws.
  '.act{transform-origin:52px 94px}',
].join('')

// Only a pounce or a chase moves her whole body. A chase is four lashes of the tail long
// (4 x 0.3 s = 1.2 s); after it the tail sways on as the chasing look has it.
const actStyle = (activity: Activity | null): string => {
  switch (activity) {
    case 'pouncing':
      return `${ACT_KEYFRAMES}.act{animation:pounce 0.8s ease-out both}`
    case 'chasing':
      return `${ACT_KEYFRAMES}${LASH_KEYFRAMES}.act{animation:bounce 1.2s ease-in-out both}.tail{animation:lash 0.3s ease-in-out 4,sway 1s ease-in-out 1.2s infinite}`
    default:
      return ''
  }
}

export const pictureFor = (p: PictureInput): string => {
  const look: Look = p.activity ?? p.pose
  const isAnimated = p.motion !== 'never'
  const style = isAnimated ? `<style>${frontStyle(look)}${actStyle(p.activity)}${p.motion === 'auto' ? REDUCED : ''}</style>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96">${DEFS}${style}<g class="act">${frontView(look, isAnimated)}</g></svg>`
}
