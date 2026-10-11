export type Mood = 'awake' | 'sleeping' | 'ruffled' | 'proud' | 'worried'

declare module 'claude-code' {
  interface PluginState {
    mango: {
      tick: number
      mood: Mood
      moodUntil: number
      lastActivityTick: number
      contextPercent: number
      remark: string | null
      isSessionCounted: boolean
      wasOverBudget: boolean
      isOff: boolean
      isMuted: boolean
      isStill: boolean
    }
  }
}
