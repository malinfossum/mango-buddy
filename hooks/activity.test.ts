import { expect, test } from 'claude-code/testing'
import { activityFor, nextStage, REST, restStage, sameStage, showing, spotFor } from './activity'

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

test('each activity takes her to its spot, and waiting keeps hers', () => {
  for (const from of ['left', 'middle', 'right'] as const) {
    expect(spotFor('sniffing', from)).toBe('left')
    expect(spotFor('peering', from)).toBe('right')
    expect(spotFor('watching', from)).toBe('middle')
    expect(spotFor('pouncing', from)).toBe('middle')
    expect(spotFor('chasing', from)).toBe('middle')
    expect(spotFor('waiting', from)).toBe(from)
  }
})

test('a new activity starts where she stands; the same one changes nothing', () => {
  const left = nextStage(REST, 'sniffing')
  expect(left).toEqual({ activity: 'sniffing', from: 'middle', to: 'left' })
  expect(nextStage(left, 'sniffing')).toBe(left)
  expect(nextStage(left, 'peering')).toEqual({ activity: 'peering', from: 'left', to: 'right' })
  expect(nextStage(left, 'waiting')).toEqual({ activity: 'waiting', from: 'left', to: 'left' })
})

test('an ended activity leaves her on the spot she reached', () => {
  expect(restStage({ activity: 'peering', from: 'left', to: 'right' })).toEqual({ activity: null, from: 'right', to: 'right' })
  expect(sameStage(REST, { ...REST })).toBe(true)
  expect(sameStage(REST, restStage(REST))).toBe(true)
  expect(sameStage(REST, { ...REST, from: 'left' })).toBe(false)
  expect(sameStage(REST, { ...REST, activity: 'waiting' })).toBe(false)
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
