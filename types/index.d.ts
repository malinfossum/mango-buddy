export type Mood = 'awake' | 'sleeping' | 'ruffled' | 'proud' | 'worried'

// What Mango does while Claude works, layered over her mood.
export type Activity = 'sniffing' | 'watching' | 'peering' | 'waiting' | 'pouncing' | 'chasing'
// Her three places on the desktop stage.
export type Spot = 'left' | 'middle' | 'right'
// auto follows the system's reduced-motion setting; always ignores it; never is a still image.
export type Motion = 'auto' | 'always' | 'never'
export type Gait = 'walk' | 'slide'
// What the desktop picture shows. One atom, so a change is one write and one redraw.
export type Stage = { activity: Activity | null; from: Spot; to: Spot }

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
      stage: Stage
      motion: Motion
      gait: Gait
    }
  }
}
