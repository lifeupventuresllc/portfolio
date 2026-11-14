// Looping form-demo videos for the workout screen (2026-10-29, Asa: "find the
// exact workout picture or video to match"). Keyed by the exercise's exact
// name in lib/exercise-library. Only a video of THAT exact move (same
// equipment, same variation) goes here — a close-enough clip is worse than
// the photo. Files live in public/videos/exercises (small, muted, looping).
// Free Pexels License clips; source IDs listed beside each entry.
export const EXERCISE_VIDEOS: Record<string, string> = {
  // 2026-10-29: each clip checked frame-by-frame — Black woman, exact move.
  // Pexels video ID (https://www.pexels.com/video/<id>/), trimmed to 8 s, muted.
  'Push-Up': '/videos/exercises/push-up.mp4', // 8456715
  'Regular Push-Ups': '/videos/exercises/push-up.mp4', // 8456715
  'High Knees': '/videos/exercises/high-knees.mp4', // 8456713
  'Mountain Climbers': '/videos/exercises/mountain-climbers.mp4', // 8401255
  'High-Intensity Mountain Climbers': '/videos/exercises/mountain-climbers.mp4', // 8401255
  'Plank Holds': '/videos/exercises/plank-holds.mp4', // 6302985 (forearm plank)
  'Bodyweight Squats': '/videos/exercises/bodyweight-squats.mp4', // 8837221
  'Lunges in Place': '/videos/exercises/lunges-in-place.mp4', // 7746661
  'Banded Tabletop Kickbacks': '/videos/exercises/banded-tabletop-kickbacks.mp4', // 8893533 (from 2 s)
  'DB Bicep Curl (supinated)': '/videos/exercises/db-bicep-curl-supinated.mp4', // 8837210
  'DB Lateral Raise': '/videos/exercises/db-lateral-raise.mp4', // 8836968 (from 1 s)
  'Single-Arm DB Row': '/videos/exercises/single-arm-db-row.mp4', // 8893530 (from 2 s)
  'Donkey Kick': '/videos/exercises/donkey-kick.mp4', // 6297119
  'Skater Jumps': '/videos/exercises/skater-jumps.mp4', // 5149332

  // 2026-11-12: Asa's own AI videos (same woman every clip, HeyGen, 12 s,
  // 1280x720 landscape, sound removed). Landscape clips show the whole body
  // on the phone (components/WorkoutFlow.tsx Media). Checked frame by frame.
  'Crunch': '/videos/exercises/crunch.mp4',
  'Floor Leg Raise': '/videos/exercises/floor-leg-raise.mp4',
  'Lying Leg Raise': '/videos/exercises/floor-leg-raise.mp4',   // same move: straight legs up to 90°, back flat
  'Leg Raises (Floor)': '/videos/exercises/floor-leg-raise.mp4', // same move
  'Incline Treadmill Walk': '/videos/exercises/incline-treadmill-walk.mp4',

  // 2026-11-13: Higgsfield (Seedance 2.5) videos, 9:16 720x1280, 8 s, no sound.
  // Woman A / Woman B reference photos so it's the same woman every time.
  'Bicep Curl + Shoulder Press': '/videos/exercises/bicep-curl-shoulder-press.mp4',
  'Bicycle Crunch': '/videos/exercises/bicycle-crunch.mp4',
  'Goblet Squat': '/videos/exercises/goblet-squat.mp4',
  'Running in Place (Low)': '/videos/exercises/running-in-place-low.mp4',
  'March in Place': '/videos/exercises/march-in-place.mp4',
  'Reverse Lunge + Shoulder Press': '/videos/exercises/reverse-lunge-shoulder-press.mp4',
  'Squat + Bicep Curl': '/videos/exercises/squat-bicep-curl.mp4',
  'Romanian Deadlift (DB)': '/videos/exercises/romanian-deadlift-db.mp4',
  'Slow Sit-Up': '/videos/exercises/slow-sit-up.mp4',
  'Glute Bridge': '/videos/exercises/glute-bridge.mp4',
  'Kettlebell Glute Bridge + Chest Press': '/videos/exercises/kettlebell-glute-bridge-chest-press.mp4',
  'Kettlebell Goblet Squat + Curl': '/videos/exercises/kettlebell-goblet-squat-curl.mp4',
  'Butt Kicks': '/videos/exercises/butt-kicks.mp4', // replaced the Pexels clip (same woman now)
  'Glute Bridge + Pullover': '/videos/exercises/glute-bridge-pullover.mp4',
  'Lunge + Twist': '/videos/exercises/lunge-twist.mp4',
  'Glute Bridge Single-Leg Lift': '/videos/exercises/glute-bridge-single-leg-lift.mp4',
  'Jumping Jacks': '/videos/exercises/jumping-jacks.mp4', // replaced the Pexels clip (same woman now)
  'DB Bent-Over Row': '/videos/exercises/db-bent-over-row.mp4',
}

export function exerciseVideo(name: string): string | undefined {
  return EXERCISE_VIDEOS[name]
}
