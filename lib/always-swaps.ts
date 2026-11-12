// "Always" swaps (2026-11-12, Asa): she tapped Swap → "Not at my gym" /
// "Always", so that move never shows up for her again — its replacement
// takes its place on every day it would have appeared. Saved on her intake
// (form_data.always_swaps: { from: to }); applied right after her workout
// is built, everywhere the workout is shown.
import { ATOMIC_LIBRARY } from './exercise-library'
import { COMBO_MOVES } from './combo-moves'
import { cueOrHowTo } from './exercise-howto'
import type { WorkoutProgram } from './workout'

export type AlwaysSwaps = Record<string, string>

export function readAlwaysSwaps(formData: unknown): AlwaysSwaps {
  const raw = (formData as { always_swaps?: unknown } | null)?.always_swaps
  if (!raw || typeof raw !== 'object') return {}
  const out: AlwaysSwaps = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'string' && v && v !== k) out[k] = v
  return out
}

/** Follow a chain (A→B, B→C) to where it ends, never looping. */
const resolve = (name: string, swaps: AlwaysSwaps) => {
  let n = name
  for (let i = 0; i < 5 && swaps[n]; i++) n = swaps[n]
  return n
}

export function applyAlwaysSwaps<T extends WorkoutProgram>(program: T, swaps: AlwaysSwaps): T {
  if (!Object.keys(swaps).length) return program
  const fix = (node: unknown, root: boolean): unknown => {
    if (Array.isArray(node)) return node.map((x) => fix(x, false))
    if (!node || typeof node !== 'object') return node
    const obj = { ...(node as Record<string, unknown>) }
    for (const k of Object.keys(obj)) if (k !== 'progression' && k !== 'weights') obj[k] = fix(obj[k], false)
    if (!root && typeof obj.name === 'string' && swaps[obj.name]) {
      const to = resolve(obj.name, swaps)
      const lib = ATOMIC_LIBRARY.find((e) => e.name === to)
      const combo = COMBO_MOVES.find((m) => m.name === to)
      obj.name = to
      obj.cue = cueOrHowTo(to, lib?.cue || combo?.cue)
      obj.imageUrl = lib?.imageUrl
      if ('title' in obj && typeof obj.title === 'string') obj.title = to
    }
    return obj
  }
  return fix(program, true) as T
}
