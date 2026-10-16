import { expect, test } from 'claude-code/testing'
import { ACTIVITIES } from './activity'
import { altFor, frontStyle, frontView } from './drawing'
import { stageFor } from './stage'
import type { StageInput } from './stage'

const POSES = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working'] as const
const LOOKS = [...POSES, ...ACTIVITIES]

test('altFor names each activity, and the mood when none shows', () => {
  expect(new Set(ACTIVITIES.map(a => altFor('awake', a))).size).toBe(ACTIVITIES.length)
  expect(altFor('awake', 'sniffing')).toBe('Mango, a black cat, sniffs around.')
  expect(altFor('working', 'peering')).toBe('Mango, a black cat, peers out at the web.')
  expect(altFor('sleeping', null)).toBe('Mango, a black cat, is asleep.')
  expect(altFor('proud')).toBe('Mango, a black cat, is proud.')
})

test('every look moves in its own way', () => {
  expect(new Set(LOOKS.map(frontStyle)).size).toBe(LOOKS.length)
  for (const look of LOOKS) {
    expect(frontStyle(look), look).toMatch(/@keyframes/)
    expect(frontStyle(look), look).not.toContain('prefers-reduced-motion')
    // The stage is drawn as an image, which gets no :hover, so its style carries none.
    expect(frontStyle(look), look).not.toContain(':hover')
  }
})

test('the activities show in the still picture too', () => {
  for (const look of LOOKS) {
    for (const isAnimated of [true, false]) {
      const view = frontView(look, isAnimated)
      expect(view, look).toMatch(/^[ -~]+$/)
      expect(view, look).not.toMatch(/<svg|<style|<script|<image|href=|on[a-z]+=/i)
      expect(view, look).not.toContain('class="heart"')
    }
  }
  expect(frontView('sniffing', false)).toContain('<g transform="translate(0 5)"><g class="head">')
  expect(frontView('peering', false)).not.toBe(frontView('awake', false))
  expect(frontView('waiting', false)).not.toContain('#f2a92e')
  expect(frontView('pouncing', false)).toBe(frontView('pouncing', true))
})

const BASE: StageInput = { pose: 'awake', activity: null, from: 'middle', to: 'middle', motion: 'auto', gait: 'slide' }

test('the stage is a self-contained ASCII picture, the same for the same inputs', () => {
  for (const motion of ['auto', 'always', 'never'] as const) {
    for (const activity of [null, ...ACTIVITIES]) {
      const svg = stageFor({ ...BASE, motion, activity, from: 'left', to: 'right' })
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" width="360" height="96">')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).not.toMatch(/<script|<image|href=|on[a-z]+=|url\((?!#coat\))/i)
      expect(svg).toMatch(/^[ -~]+$/)
      expect(svg).toBe(stageFor({ ...BASE, motion, activity, from: 'left', to: 'right' }))
    }
  }
})

test('she rests on her spot by its own attribute, and walks only when the spot changes', () => {
  for (const [to, x] of [['left', 0], ['middle', 120], ['right', 240]] as const) {
    const svg = stageFor({ ...BASE, from: to, to })
    expect(svg).toContain(`<g class="spot" transform="translate(${x} 0)">`)
    expect(svg).not.toContain('@keyframes move')
  }
  const moving = stageFor({ ...BASE, activity: 'peering', from: 'left', to: 'right' })
  expect(moving).toContain('<g class="spot" transform="translate(240 0)">')
  expect(moving).toContain('@keyframes move{from{transform:translateX(0px)}to{transform:translateX(240px)}}')
  expect(moving).toContain('.spot{animation:move 1.2s linear both}')
})

test('motion decides the style sheet and the reduced-motion query', () => {
  const never = stageFor({ ...BASE, motion: 'never', activity: 'peering', from: 'left', to: 'right' })
  expect(never).not.toContain('<style>')
  expect(never).toContain('<g class="spot" transform="translate(240 0)">')
  expect(stageFor({ ...BASE, motion: 'always' })).toContain('<style>')
  expect(stageFor({ ...BASE, motion: 'always' })).not.toContain('prefers-reduced-motion')
  expect(stageFor({ ...BASE, motion: 'auto' })).toContain('prefers-reduced-motion:reduce')
  for (const motion of ['auto', 'always', 'never'] as const) {
    expect(stageFor({ ...BASE, motion }), motion).not.toContain('class="heart"')
  }
})

test('a slide carries the front view with a bob and stepping paws', () => {
  const slide = stageFor({ ...BASE, motion: 'always', activity: 'sniffing', from: 'middle', to: 'left' })
  expect(slide).toContain('slide-bob 0.3s ease-in-out 0s 4')
  expect(slide).toContain('.paw-l{animation:knead 0.3s ease-in-out 0s 4}')
  expect(slide).toContain('.paw-r{animation:knead 0.3s ease-in-out 0.15s 4}')
  expect(stageFor({ ...BASE, motion: 'always', activity: 'sniffing', from: 'left', to: 'left' })).not.toContain('slide-bob 0.3s')
})

test('a pounce or a chase plays once, after the walk to the middle', () => {
  expect(stageFor({ ...BASE, motion: 'always', activity: 'pouncing' })).toContain('.act{animation:pounce 0.8s ease-out 0s both}')
  expect(stageFor({ ...BASE, motion: 'always', activity: 'pouncing', from: 'left' })).toContain('.act{animation:pounce 0.8s ease-out 1.2s both}')
  const chase = stageFor({ ...BASE, motion: 'always', activity: 'chasing', from: 'right' })
  expect(chase).toContain('@keyframes dash{0%,100%{transform:translateX(0)}50%{transform:translateX(120px)}}')
  expect(chase).toContain('.act{animation:dash 1.2s ease-in-out 1.2s both}')
  const still = stageFor({ ...BASE, motion: 'never', activity: 'pouncing', from: 'left' })
  expect(still).not.toContain('pounce')
  expect(still).toContain('<g class="spot" transform="translate(120 0)">')
})

test('walking shows the side view while she moves, facing her way, then the front again', () => {
  const right = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'peering', from: 'middle', to: 'right' })
  expect(right).toContain('<g class="side-r" opacity="0">')
  expect(right).toContain('<g class="side-l" opacity="0"><g transform="translate(120 0) scale(-1 1)">')
  expect(right).toContain('.side-r{animation:shown 1.2s linear 0s}')
  expect(right).toContain('.front{animation:hidden 1.2s linear 0s}')
  expect(right).not.toContain('.side-l{animation')
  expect(right).not.toContain('slide-bob 0.3s')
  const left = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'sniffing', from: 'middle', to: 'left' })
  expect(left).toContain('.side-l{animation:shown 1.2s linear 0s}')
  expect(left).not.toContain('.side-r{animation')
})

test('a walking chase runs right, turns and comes back', () => {
  const chase = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'chasing' })
  expect(chase).toContain('.side-r{animation:shown 0.6s linear 0s}')
  expect(chase).toContain('.side-l{animation:shown 0.6s linear 0.6s}')
  expect(chase).toContain('.front{animation:hidden 0.6s linear 0s,hidden 0.6s linear 0.6s}')
  const after = stageFor({ ...BASE, gait: 'walk', motion: 'always', activity: 'chasing', from: 'left' })
  expect(after).toContain('.side-r{animation:shown 1.2s linear 0s,shown 0.6s linear 1.2s}')
  expect(after).toContain('.side-l{animation:shown 0.6s linear 1.8s}')
})

test('only a walk that moves or chases draws the side view', () => {
  const moving = { ...BASE, activity: 'peering', from: 'middle', to: 'right' } as const
  expect(stageFor({ ...moving, gait: 'slide', motion: 'always' })).not.toContain('class="side-')
  expect(stageFor({ ...moving, gait: 'walk', motion: 'never' })).not.toContain('class="side-')
  expect(stageFor({ ...BASE, gait: 'walk', motion: 'always' })).not.toContain('class="side-')
  expect(stageFor({ ...moving, gait: 'walk', motion: 'auto' })).toContain('prefers-reduced-motion:reduce')
})
