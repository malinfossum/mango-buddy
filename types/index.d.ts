export type Mood = 'awake' | 'sleeping' | 'ruffled' | 'proud' | 'worried'

// What Mango does while Claude works, layered over her mood.
export type Activity = 'sniffing' | 'watching' | 'peering' | 'waiting' | 'pouncing' | 'chasing'
// auto follows the system's reduced-motion setting; always ignores it; never is a still image.
export type Motion = 'auto' | 'always' | 'never'

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
      shownMood: Mood
      // What the desktop picture shows over her mood. One atom, so a change is one write and one redraw.
      activity: Activity | null
      motion: Motion
    }
  }
}
