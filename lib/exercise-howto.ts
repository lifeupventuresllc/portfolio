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
  'Skater Jumps': 'Leap sideways onto one foot, swing the other leg behind you, then leap back the other way.',
  'Skater Jumps + Pulsating Squat Combo': 'Do 2 skater jumps, then 3 small squat pulses. Keep going.',
  'Explosive Bodyweight Squats': 'Squat down, then jump up as high as you can. Land soft and go straight into the next one.',
  'Chair / Couch Squats': 'Sit back until you just touch the chair, then stand up tall. Arms out in front.',
  'Lunges in Place': 'Step one foot back, lower both knees, push back up. Switch legs.',
  'Standing Oblique Touches': 'Stand tall, lift one knee out to the side and bring the same elbow down to meet it. Switch sides.',
  'Cross Toe Touches': 'Stand with feet wide. Bend and touch your right hand to your left foot, stand, then switch.',
  'Oblique Toe Touches with Movement': 'Kick one leg up and reach the opposite hand to your toes, stepping forward each time.',
  'Air Punches / Jabs': 'Stand with fists up by your chin. Punch straight out fast, one arm then the other.',
  'Continuous Kickboxing Combinations': 'Jab, jab, cross, then a front kick. Keep the combo going without stopping.',
  'Kickboxing Kicks (Left Leg)': 'Fists up, kick your left leg straight out in front, pull it back, repeat.',
  'Kickboxing Kicks (Right Leg)': 'Fists up, kick your right leg straight out in front, pull it back, repeat.',
  'Incline Push-Ups (Couch or Stairs)': 'Hands on a couch or stair, body straight. Lower your chest down, push back up.',
  'Tricep Dips (Chair)': 'Hands on the edge of a chair behind you. Bend your elbows to lower down, push back up.',
  'Reverse Snow Angels': 'Lie face down, arms by your sides. Lift your chest a little and sweep your arms overhead and back.',
  'Superman Hold': 'Lie face down. Lift your arms, chest and legs off the floor and hold.',
  'Bicycle Kicks': 'On your back, hands under your hips. Pedal your legs like riding a bike.',
  'Leg Raises (Floor)': 'On your back, legs straight. Lift them up to point at the ceiling, lower slowly.',
  'Plank Holds': 'Forearms on the floor, body in a straight line from head to heels. Hold.',
  'Sit-Ups': 'On your back, knees bent. Sit all the way up, then lower down slowly.',
  'Arm Circles (Standing)': 'Arms straight out to the sides. Make small circles, then switch direction.',
  'Knee Push-Ups': 'Hands under your shoulders, knees on the floor. Lower your chest down, push back up.',
  'Bodyweight Squats': 'Feet shoulder-width apart. Sit your hips back and down, then stand up tall.',
  'Pike Push-Ups': 'Hips high in an upside-down V. Bend your elbows to lower your head toward the floor, push back up.',
  'Plank Shoulder Taps': 'In a push-up position, tap one hand to the opposite shoulder, then switch. Keep hips still.',
  'Pulsating Squats': 'Squat down halfway and stay low. Bounce up and down a few inches.',
  'Regular Push-Ups': 'Hands under your shoulders, body straight. Lower your chest to the floor, push back up.',
  'Wide Push-Ups': 'Hands wider than your shoulders. Lower your chest down, push back up.',
}

/** A move's own cue, unless it's the empty "Bodyweight" placeholder. */
export function cueOrHowTo(name: string, cue?: string): string | undefined {
  return cue && !GENERIC.test(cue) ? cue : howToFor(name)
}

const GENERIC = /^Bodyweight — no equipment needed\.?$/

export function howToFor(name: string): string | undefined {
  const combo = COMBO_MOVES.find((m) => m.name === name)
  if (combo) return combo.cue
  if (WRITTEN[name]) return WRITTEN[name]
  const lib = ATOMIC_LIBRARY.find((e) => e.name === name && e.cue && !GENERIC.test(e.cue))
  return lib?.cue
}
