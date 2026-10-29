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
  'Jumping Jacks': '/videos/exercises/jumping-jacks.mp4', // 7746545
  'High Knees': '/videos/exercises/high-knees.mp4', // 8456713
  'Butt Kicks': '/videos/exercises/butt-kicks.mp4', // 8402077
  'Mountain Climbers': '/videos/exercises/mountain-climbers.mp4', // 8401255
  'High-Intensity Mountain Climbers': '/videos/exercises/mountain-climbers.mp4', // 8401255
  'Plank Holds': '/videos/exercises/plank-holds.mp4', // 6302985 (forearm plank)
  'Bodyweight Squats': '/videos/exercises/bodyweight-squats.mp4', // 8837221
  'Lunges in Place': '/videos/exercises/lunges-in-place.mp4', // 7746661
  'Banded Tabletop Kickbacks': '/videos/exercises/banded-tabletop-kickbacks.mp4', // 8893533 (from 2 s)
  'Crunch': '/videos/exercises/crunch.mp4', // 8893527
  'DB Bicep Curl (supinated)': '/videos/exercises/db-bicep-curl-supinated.mp4', // 8837210
  'DB Lateral Raise': '/videos/exercises/db-lateral-raise.mp4', // 8836968 (from 1 s)
  'Single-Arm DB Row': '/videos/exercises/single-arm-db-row.mp4', // 8893530 (from 2 s)
  'Donkey Kick': '/videos/exercises/donkey-kick.mp4', // 6297119
  'Skater Jumps': '/videos/exercises/skater-jumps.mp4', // 5149332
}

export function exerciseVideo(name: string): string | undefined {
  return EXERCISE_VIDEOS[name]
}
