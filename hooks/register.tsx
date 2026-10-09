import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import type { Mood } from '../types'

export const tick = atom({ plugin: 'mango', key: 'tick' } as const, 0)
export const mood = atom({ plugin: 'mango', key: 'mood' } as const, 'awake' as Mood)
export const moodUntil = atom({ plugin: 'mango', key: 'moodUntil' } as const, 0)
export const lastActivityTick = atom({ plugin: 'mango', key: 'lastActivityTick' } as const, 0)
export const contextPercent = atom({ plugin: 'mango', key: 'contextPercent' } as const, 0)
export const remark = atom({ plugin: 'mango', key: 'remark' } as const, null as string | null)
export const isSessionCounted = atom({ plugin: 'mango', key: 'isSessionCounted' } as const, false)
export const wasOverBudget = atom({ plugin: 'mango', key: 'wasOverBudget' } as const, false)
export const isOff = atom({ plugin: 'mango', key: 'isOff' } as const, false)
export const isMuted = atom({ plugin: 'mango', key: 'isMuted' } as const, false)
export const isStill = atom({ plugin: 'mango', key: 'isStill' } as const, false)

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isOff))) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const percent = await read($, contextPercent)
    return (
      <Box flexDirection="column">
        <Box key="row1"><Text>{' /\\_/\\'}</Text></Box>
        <Box>
          <Box key="row2"><Text>{'( o.o )'}</Text></Box>
          <Text>{'   '}</Text>
          <Box key="line"><Text dimColor>{`context ${percent} %`}</Text></Box>
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
