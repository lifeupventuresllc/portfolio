// Looping form-demo videos for the workout screen (2026-10-29, Asa: "find the
// exact workout picture or video to match"). Keyed by the exercise's exact
// name in lib/exercise-library. Only a video of THAT exact move (same
// equipment, same variation) goes here — a close-enough clip is worse than
// the photo. Files live in public/videos/exercises (small, muted, looping).
// Free Pexels License clips; source IDs listed beside each entry.
export const EXERCISE_VIDEOS: Record<string, string> = {
}

export function exerciseVideo(name: string): string | undefined {
  return EXERCISE_VIDEOS[name]
}
