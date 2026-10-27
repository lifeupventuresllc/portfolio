// One-tap cheers on the Friends tab (2026-10-26, friends-plan.md phase 2).
// Shared by the screen and the API so the words can never drift apart.
export const CHEERS = {
  proud: { e: '🔥', label: 'Proud', body: '🔥 Proud of you!' },
  yes: { e: '👏', label: 'Yes!', body: '👏 Yes! Keep going!' },
  love: { e: '💛', label: 'Love', body: '💛 Sending you love!' },
} as const
export type CheerId = keyof typeof CHEERS
