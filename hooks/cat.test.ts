import { expect, test } from 'claude-code/testing'
import { faceFor, frameFor, isTestCommand, remarkFor, resolveMood } from './cat'

test('frames are two rows of exactly ten columns for every pose and tick', () => {
  const poses = ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working'] as const
  for (const pose of poses) {
    for (const t of [0, 1, 7, 8, 9, 16]) {
      const [a, b] = frameFor(pose, t)
      expect(a.length, `${pose} row1 at ${t}`).toBe(10)
      expect(b.length, `${pose} row2 at ${t}`).toBe(10)
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
  for (const pose of ['awake', 'sleeping', 'ruffled', 'proud', 'worried', 'working'] as const) {
    expect(faceFor(pose, 0).length).toBe(5)
  }
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
