import { expect, test } from 'claude-code/testing'
import { faceFor, frameFor, isTestCommand, remarkFor, resolveMood, toneFor } from './cat'
import { altFor, drawingFor } from './drawing'

const LOOKS = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working', 'sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const

test('frames are two rows of exactly ten columns for every look and tick', () => {
  for (const look of LOOKS) {
    for (const t of [0, 1, 2, 3, 7, 8, 9, 16]) {
      const [a, b] = frameFor(look, t)
      expect(a.length, `${look} row1 at ${t}`).toBe(10)
      expect(b.length, `${look} row2 at ${t}`).toBe(10)
      expect(a).toMatch(/^[ -~]+$/)
      expect(b).toMatch(/^[ -~]+$/)
    }
  }
})

test('awake blinks on every eighth tick and flicks its tail on odd ticks', () => {
  expect(frameFor('awake', 8)[1]).toContain('( -.- )')
  expect(frameFor('awake', 9)[1]).toContain('( o.o )')
  expect(frameFor('awake', 1)[1].trimEnd().endsWith('~')).toBe(true)
  expect(frameFor('awake', 2)[1].trimEnd().endsWith('~')).toBe(false)
})

test('working alternates two kneading frames', () => {
  expect(frameFor('working', 0)).not.toEqual(frameFor('working', 1))
  expect(frameFor('working', 0)).toEqual(frameFor('working', 2))
})

test('faces are five columns', () => {
  for (const look of LOOKS) expect(faceFor(look, 0).length, look).toBe(5)
})

test('remarks rotate by tick and never repeat the same line twice in a row', () => {
  for (const mood of ['sleeping', 'ruffled', 'proud', 'worried', 'purr', 'yawn'] as const) {
    expect(remarkFor(mood, 0)).not.toBe(remarkFor(mood, 1))
    expect(remarkFor(mood, 0).length).toBeGreaterThan(3)
    expect(remarkFor(mood, 0)).not.toContain('\u2014')
  }
})

test('isTestCommand accepts test runners and rejects look-alikes', () => {
  for (const c of ['npm test', 'pnpm run test', 'dotnet test', 'npx vitest', '  yarn test', 'cd web && npm test', 'bun test --watch', 'CI=1 npm test', 'npx vitest run', 'cd x; jest', 'pnpm vitest', 'yarn jest', 'bunx vitest', 'npm exec vitest', 'npm exec -- jest', 'pnpm dlx vitest', 'yarn exec jest', 'cd web\nnpm test', '(cd web && npm test)', 'echo $(npx vitest run)', 'npm run build || npm test']) {
    expect(isTestCommand(c), c).toBe(true)
  }
  for (const c of ['npm install', 'echo test', 'ls', 'npm run build', 'git commit -m "test"', 'dotnet build', 'npm install -D vitest', 'cat jest.config.js', 'rm vitest.config.ts', 'yarn add -D jest', 'pnpm add vitest', 'bun add jest', 'npm exec eslint', 'echo "npm test"']) {
    expect(isTestCommand(c), c).toBe(false)
  }
})

test('resolveMood: timed moods beat worried, worried beats awake and sleeping', () => {
  const base = { mood: 'awake' as const, moodUntil: 0, tick: 10, lastActivityTick: 10, contextPercent: 0 }
  expect(resolveMood(base)).toBe('awake')
  expect(resolveMood({ ...base, contextPercent: 25 })).toBe('worried')
  expect(resolveMood({ ...base, mood: 'ruffled', moodUntil: 15, contextPercent: 25 })).toBe('ruffled')
  expect(resolveMood({ ...base, mood: 'ruffled', moodUntil: 9, contextPercent: 25 })).toBe('worried')
  expect(resolveMood({ ...base, tick: 170, lastActivityTick: 9 })).toBe('sleeping')
  expect(resolveMood({ ...base, tick: 170, lastActivityTick: 9, contextPercent: 30 })).toBe('worried')
  expect(resolveMood({ ...base, tick: 169, lastActivityTick: 10 })).toBe('awake')
})

const POSES = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working'] as const

test('every pose draws a self-contained svg with its own alt text', () => {
  const alts = new Set<string>()
  for (const pose of POSES) {
    for (const isAnimated of [true, false]) {
      const svg = drawingFor(pose, isAnimated)
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), pose).toBe(true)
      expect(svg.endsWith('</svg>'), pose).toBe(true)
      expect(svg).not.toMatch(/<script|<image|href=|on[a-z]+=|url\((?!#coat\)|#iris\))/i)
      expect(svg).toMatch(/^[ -~]+$/)
    }
    alts.add(altFor(pose))
  }
  expect(alts.size).toBe(POSES.length)
})

test('every pose moves in its own way, and stops for reduced motion', () => {
  const styles = new Set<string>()
  for (const pose of POSES) {
    const svg = drawingFor(pose, true)
    expect(svg, pose).toMatch(/<style>.*@keyframes/)
    expect(svg, pose).toContain('prefers-reduced-motion:reduce')
    expect(svg, pose).toContain('svg:hover .heart')
    styles.add(svg.slice(svg.indexOf('<style>'), svg.indexOf('</style>')))
  }
  expect(styles.size).toBe(POSES.length)
  expect(drawingFor('working', true)).toContain('.paw-l{animation:knead')
  expect(drawingFor('sleeping', true)).toContain('.z{animation:drift')
})

test('the still picture has no motion and hides the hover heart', () => {
  for (const pose of POSES) {
    const svg = drawingFor(pose, false)
    expect(svg, pose).not.toContain('<style>')
    expect(svg, pose).toContain('class="heart" opacity="0"')
  }
})

test('each mood has a theme colour for its remarks', () => {
  expect(toneFor('proud')).toBe('success')
  expect(toneFor('ruffled')).toBe('error')
  expect(toneFor('worried')).toBe('warning')
  expect(toneFor('sleeping')).toBe('suggestion')
  expect(toneFor('awake')).toBe('claude')
})

test('each activity has its own rows, and the busy ones alternate', () => {
  expect(frameFor('sniffing', 0)[1]).toContain('( o.o )..')
  expect(frameFor('sniffing', 1)[1]).toContain('( o.o ).')
  expect(frameFor('watching', 0)[1]).toContain('(o.o  )')
  expect(frameFor('watching', 2)[1]).toContain('(  o.o)')
  expect(frameFor('peering', 0)[1]).toContain('( O.O ) >')
  expect(frameFor('waiting', 0)[1]).toContain('( -.- ) ~')
  expect(frameFor('waiting', 1)[1]).toContain('( -.- ) .')
  expect(frameFor('pouncing', 0)[1]).toContain('( ^o^ ) /')
  expect(frameFor('chasing', 0)[1]).toContain('( >o< )==')
  expect([faceFor('peering', 0), faceFor('waiting', 0), faceFor('pouncing', 0), faceFor('chasing', 0)]).toEqual(['(O.O)', '(-.-)', '(^o^)', '(>o<)'])
  for (const look of ['sniffing', 'watching', 'peering', 'waiting', 'pouncing', 'chasing'] as const) {
    expect(frameFor(look, 0)[0].trimEnd(), look).toBe(' /\\_/\\')
  }
})

test('activity lines speak in the claude colour, a pounce or chase in success', () => {
  for (const look of ['sniffing', 'watching', 'peering', 'waiting'] as const) expect(toneFor(look)).toBe('claude')
  expect(toneFor('pouncing')).toBe('success')
  expect(toneFor('chasing')).toBe('success')
})
