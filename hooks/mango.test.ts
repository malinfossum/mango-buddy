import { expect, mock, test } from 'claude-code/testing'

export const SURFACES = ['terminal', 'desktop'] as const

export const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

test('draws two rows of cat and a line on both surfaces', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'mango', surface, component: 'AbovePrompt', props: BAND })
    expect((await ui.find({ key: 'row1' }))?.text?.trimEnd()).toBe(' /\\_/\\')
    expect((await ui.find({ key: 'row2' }))?.text).toMatch(/^\( [o-]\.[o-] \)/)
    expect(await ui.find({ key: 'line' })).toBeDefined()
  }
})
