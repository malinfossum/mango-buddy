import { expect, test } from 'claude-code/testing'
import { activityFor, baseName, callLine, gitStepOf, hostOf, lineFor, MOMENTS, showing, topicOf } from './activity'

test('each tool maps to its activity, and every other tool to none', () => {
  const table = {
    Read: 'sniffing', Grep: 'sniffing', Glob: 'sniffing',
    Edit: 'watching', Write: 'watching',
    WebFetch: 'peering', WebSearch: 'peering',
    Bash: 'waiting', Agent: 'waiting',
  } as const
  for (const [tool, activity] of Object.entries(table)) expect(activityFor(tool), tool).toBe(activity)
  for (const tool of ['TodoWrite', 'NotebookEdit', 'ToolSearch', 'mcp__x__y', '']) expect(activityFor(tool), tool).toBeNull()
})

test('a timed mood beats an activity, which beats working and the resting mood', () => {
  expect(showing('ruffled', 'sniffing', true)).toEqual({ pose: 'ruffled', activity: null })
  expect(showing('proud', 'waiting', false)).toEqual({ pose: 'proud', activity: null })
  expect(showing('ruffled', null, true)).toEqual({ pose: 'ruffled', activity: null })
  expect(showing('sleeping', 'peering', false)).toEqual({ pose: 'sleeping', activity: 'peering' })
  expect(showing('worried', 'watching', true)).toEqual({ pose: 'working', activity: 'watching' })
  expect(showing('worried', null, true)).toEqual({ pose: 'working', activity: null })
  expect(showing('awake', null, false)).toEqual({ pose: 'awake', activity: null })
})

test('a file shows by its own name only, never its folders', () => {
  expect(baseName('/home/a/x.ts')).toBe('x.ts')
  expect(baseName('C:\\Users\\someone\\x.ts')).toBe('x.ts')
  expect(baseName('C:/Users/someone\\mixed/y.md')).toBe('y.md')
  expect(baseName('x.ts')).toBe('x.ts')
  for (const p of ['/home/a/', 'C:\\repo\\', '', '/', '   ']) expect(baseName(p), JSON.stringify(p)).toBeNull()
})

test('names keep to printable ASCII and 32 characters', () => {
  expect(baseName('/r/caf\u00e9.ts')).toBe('caf?.ts')
  expect(baseName('/r/a\u0007b\nc.ts')).toBe('a?b?c.ts')
  expect(baseName('/r/\u{1F408}.md')).toBe('?.md')
  const long = baseName(`/r/${'a'.repeat(40)}.ts`) ?? ''
  expect(long).toHaveLength(32)
  expect(long.endsWith('...')).toBe(true)
  expect(baseName(`/r/${'b'.repeat(32)}`)).toBe('b'.repeat(32))
})

test('a web line shows the host only', () => {
  expect(hostOf('https://user:secret@docs.example.com:8443/a/b?q=1#h')).toBe('docs.example.com')
  expect(hostOf('https://b\u00fccher.de/')).toMatch(/^[ -~]+$/)
  for (const u of ['not a url', '', 'file:///C:/x/y.ts', 'mailto:a@b.c']) expect(hostOf(u), u).toBeNull()
})

test('each looking call says its own line, and other tools say nothing', () => {
  expect(callLine({ tool: 'Read', file_path: 'C:\\Users\\someone\\register.tsx' }, 0)).toBe('Mango sniffs at register.tsx.')
  expect(callLine({ tool: 'Edit', file_path: '/r/cat.ts' }, 0)).toBe('Mango watches you edit cat.ts.')
  expect(callLine({ tool: 'Write', file_path: '/r/' }, 0)).toBeNull()
  expect(callLine({ tool: 'WebFetch', url: 'https://github.com/x' }, 0)).toBe('Mango peers out at github.com.')
  expect(callLine({ tool: 'WebFetch', url: 'file:///C:/x' }, 0)).toBeNull()
  expect(callLine({ tool: 'Bash' }, 0)).toBeNull()
  expect(callLine({ tool: 'TodoWrite' }, 0)).toBeNull()
  expect([topicOf('Read'), topicOf('Grep'), topicOf('Glob')]).toEqual(['read', 'read', 'read'])
  expect([topicOf('Edit'), topicOf('Write')]).toEqual(['edit', 'edit'])
  expect([topicOf('WebFetch'), topicOf('WebSearch')]).toEqual(['web', 'web'])
  expect([topicOf('Bash'), topicOf('Agent'), topicOf('TodoWrite')]).toEqual([null, null, null])
})

test('search lines never carry a pattern or a query', () => {
  // Plain objects with extra fields, as the engine's events carry them.
  const grep = { tool: 'Grep', pattern: 'hunter2' }
  const glob = { tool: 'Glob', pattern: '**/secret*' }
  const search = { tool: 'WebSearch', query: 'my bank login' }
  for (const t of [0, 1, 2, 3, 4, 5]) {
    for (const c of [grep, glob, search]) {
      const line = callLine(c, t) ?? ''
      expect(line.startsWith('Mango '), c.tool).toBe(true)
      expect(line).not.toMatch(/hunter2|secret|bank/)
    }
  }
})

test('every moment has two or three lines, each starting with Mango, no em dash', () => {
  for (const moment of MOMENTS) {
    const seen = new Set<string>()
    for (let t = 0; t < 6; t++) {
      const line = lineFor(moment, t, 'x.ts')
      expect(line.startsWith('Mango '), moment).toBe(true)
      expect(line).not.toContain('\u2014')
      expect(line).toMatch(/^[ -~]+$/)
      seen.add(line)
    }
    expect(seen.size, moment).toBeGreaterThanOrEqual(2)
    expect(seen.size, moment).toBeLessThanOrEqual(3)
  }
  expect(lineFor('watch', 0, '42')).toBe('Mango kept watch for 42 s.')
  expect(lineFor('commit', 0)).toBe('Mango pounces on the commit.')
  expect(lineFor('push', 0)).toBe('Mango chases the push out the door.')
})

test('git commit and git push count at command position only', () => {
  for (const c of ['git commit -m "x"', 'cd repo && git commit -m x', 'GIT_EDITOR=true git commit', 'git -C repo commit -m x', 'git --no-pager commit', '(git commit -m x)', 'npm test && git commit -am x', '  git commit']) {
    expect(gitStepOf(c), c).toBe('commit')
  }
  for (const c of ['git push', 'git push -u origin feat', 'git commit -m x && git push', 'cd a; git push --force-with-lease']) {
    expect(gitStepOf(c), c).toBe('push')
  }
  for (const c of ['echo git commit', 'echo git push', 'git commit-tree abc', 'git log --grep commit', 'cat git-commit.md', 'cat git-push.md', 'gitk commit', 'git stash push', 'git pushd', 'ls']) {
    expect(gitStepOf(c), c).toBeNull()
  }
})

test('a long run of git options is read without stalling', () => {
  // With an option that reads two ways, each of these takes 2^40 steps and the test hangs.
  expect(gitStepOf(`git ${'--a '.repeat(40)}x`)).toBeNull()
  expect(gitStepOf(`git ${'-C -C '.repeat(20)}x`)).toBeNull()
  expect(gitStepOf(`git ${'-c a=1 '.repeat(40)}x`)).toBeNull()
  expect(gitStepOf(`git ${'--a '.repeat(40)}commit`)).toBe('commit')
})
