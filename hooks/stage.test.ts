import { expect, test } from 'claude-code/testing'
import { ACTIVITIES } from './activity'
import { altFor, frontStyle, frontView } from './drawing'

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
