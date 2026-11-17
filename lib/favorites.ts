// Favorite moves (2026-11-17, workout-system step 3). She taps the heart on a
// move; saved on her intake (form_data.favorite_moves). The workout engine
// puts her favorites first when it picks moves for a day (lib/workout-
// assembly.ts), and Swap lists them first. Never forces a move that doesn't
// fit the day — a favorite only wins among moves that already fit.
export function readFavorites(formData: unknown): string[] {
  const raw = (formData as { favorite_moves?: unknown } | null)?.favorite_moves
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && !!x).slice(0, 60) : []
}

/** Stable: favorites move to the front, everything else keeps its order. */
export function favoritesFirst<T extends { name: string }>(list: T[], favs: ReadonlySet<string>): T[] {
  if (!favs.size) return list
  return [...list.filter((x) => favs.has(x.name)), ...list.filter((x) => !favs.has(x.name))]
}
