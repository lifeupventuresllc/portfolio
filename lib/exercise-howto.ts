// One plain how-to line for every move she can see (2026-11-05, Asa: "every
// exercise needs a picture or video and a how-to line"). Most moves carry
// their own cue (combo moves, the gym and ab pools); at-home moves never had
// one on screen, so this is the one lookup the workout screen uses.
import { COMBO_MOVES } from './combo-moves'
import { ATOMIC_LIBRARY } from './exercise-library'

// Moves with no cue anywhere else, written plain.
const WRITTEN: Record<string, string> = {
  'March in Place': 'Stand tall and march, lifting each knee to hip height. Swing your arms.',
  'Running in Place (Low)': 'Jog on the spot at an easy pace, landing soft on the balls of your feet.',
  'Running in Place (Moderate)': 'Jog on the spot a little faster, knees up, arms pumping.',
  'Jumping Jacks': 'Jump your feet out wide as your arms go overhead, then jump back in.',
  'High Knees': 'Run on the spot, driving each knee up to hip height. Stay on the balls of your feet.',
  'Fast High Knees': 'High knees as fast as you can, knees to hip height, arms pumping.',
  'Butt Kicks': 'Jog on the spot, kicking each heel up toward your bottom.',
  'Mountain Climbers': 'Start in a push-up position. Drive one knee to your chest, then switch, like running.',
  'High-Intensity Mountain Climbers': 'Mountain climbers at full speed. Hips stay low, hands under shoulders.',
  'High-Intensity Burpees': 'Squat, hands down, jump feet back to a plank, jump feet in, then jump up. Go fast.',
  'Lateral Toe Touches (Skater Style)': 'Hop side to side like a speed skater, reaching your hand down toward the outside foot.',
  'Forward Jumps + Run Back': 'Jump forward with both feet, then jog backward to the start. Repeat.',
}

const GENERIC = /^Bodyweight — no equipment needed\.?$/

export function howToFor(name: string): string | undefined {
  const combo = COMBO_MOVES.find((m) => m.name === name)
  if (combo) return combo.cue
  if (WRITTEN[name]) return WRITTEN[name]
  const lib = ATOMIC_LIBRARY.find((e) => e.name === name && e.cue && !GENERIC.test(e.cue))
  return lib?.cue
}
