import { expect, test } from 'claude-code/testing'
import { ACTIVITIES } from './activity'
import { altFor, frontStyle, frontView } from './drawing'
import { pictureFor } from './stage'
import type { PictureInput } from './stage'

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
    // The picture is drawn as an image, which gets no :hover, so its style carries none.
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
  expect(frontView('sniffing', false)).toContain('<g transform="translate(0 11)"><g class="head">')
  expect(frontView('peering', false)).not.toBe(frontView('awake', false))
  // Closed eyes show no iris.
  expect(frontView('waiting', false)).not.toContain('url(#iris)')
  expect(frontView('awake', false)).toContain('url(#iris)')
  expect(frontView('pouncing', false)).toBe(frontView('pouncing', true))
})

test('her tail bends from a root that stays where it meets her body', () => {
  expect(frontView('awake', true)).toContain('<path class="tail" ')
  for (const look of ['proud', 'chasing'] as const) expect(frontView(look, true), look).toContain('<path class="tail tail-up" ')
  const letters = (d: string) => d.replace(/[^A-Z]/g, '')
  for (const look of LOOKS) {
    const rest = /class="tail[^"]*" d="([^"]+)"/.exec(frontView(look, true))?.[1] ?? ''
    // A chase's picture also carries the lash.
    const style = look === 'chasing' ? pictureFor({ pose: 'awake', activity: 'chasing', motion: 'always' }) : frontStyle(look)
    const shapes = [...style.matchAll(/d:path\("([^"]+)"\)/g)].map(m => m[1] ?? '')
    // Asleep, her tail lies still.
    expect(shapes.length > 0, look).toBe(look !== 'sleeping')
    expect(style, look).not.toMatch(/\.tail(-up)?\{transform-origin/)
    for (const d of shapes) {
      // The same first point and the same commands: pinned at the root, and blendable.
      expect(d.split(' Q')[0], look).toBe(rest.split(' Q')[0])
      expect(letters(d), look).toBe(letters(rest))
    }
  }
})

const BASE: PictureInput = { pose: 'awake', activity: null, motion: 'auto' }

test('the picture is a self-contained ASCII drawing, the same for the same inputs', () => {
  for (const motion of ['auto', 'always', 'never'] as const) {
    for (const activity of [null, ...ACTIVITIES]) {
      const svg = pictureFor({ ...BASE, motion, activity })
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96">')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).not.toMatch(/<script|<image|href=|on[a-z]+=|url\((?!#coat\)|#iris\))/i)
      expect(svg).toMatch(/^[ -~]+$/)
      expect(svg).toBe(pictureFor({ ...BASE, motion, activity }))
    }
  }
})

test('she stays in place: no spots, no walk and no side view', () => {
  for (const motion of ['auto', 'always', 'never'] as const) {
    for (const activity of [null, ...ACTIVITIES]) {
      const svg = pictureFor({ ...BASE, motion, activity })
      expect(svg, `${motion} ${activity}`).toContain('<g class="act">')
      expect(svg, `${motion} ${activity}`).not.toMatch(/class="(spot|side-[rl]|leg-[ab])"|@keyframes (move|dash|trot|slide-bob)/)
    }
  }
})

test('motion decides the style sheet and the reduced-motion query', () => {
  expect(pictureFor({ ...BASE, motion: 'never', activity: 'peering' })).not.toContain('<style>')
  expect(pictureFor({ ...BASE, motion: 'always' })).toContain('<style>')
  expect(pictureFor({ ...BASE, motion: 'always' })).not.toContain('prefers-reduced-motion')
  expect(pictureFor({ ...BASE, motion: 'auto' })).toContain('prefers-reduced-motion:reduce')
  for (const motion of ['auto', 'always', 'never'] as const) {
    expect(pictureFor({ ...BASE, motion }), motion).not.toContain('class="heart"')
    expect(pictureFor({ ...BASE, motion }), motion).not.toContain(':hover')
  }
})

test('a pounce hops in place, once', () => {
  expect(pictureFor({ ...BASE, motion: 'always', activity: 'pouncing' })).toContain('.act{animation:pounce 0.8s ease-out both}')
  expect(pictureFor({ ...BASE, motion: 'never', activity: 'pouncing' })).not.toContain('pounce')
})

test('a chase bounces in place with a lashing tail, once, and then the tail sways on', () => {
  const chase = pictureFor({ ...BASE, motion: 'always', activity: 'chasing' })
  expect(chase).toContain('.act{animation:bounce 1.2s ease-in-out both}')
  expect(chase).toContain('.tail{animation:lash 0.3s ease-in-out 4,sway 1s ease-in-out 1.2s infinite}')
  expect(pictureFor({ ...BASE, motion: 'never', activity: 'chasing' })).not.toContain('bounce')
})

test('only a pounce or a chase moves her whole body', () => {
  for (const activity of [null, 'sniffing', 'watching', 'peering', 'waiting'] as const) {
    expect(pictureFor({ ...BASE, motion: 'always', activity }), String(activity)).not.toContain('.act{animation')
  }
})
