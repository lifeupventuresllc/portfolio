// Workout background music — track library + license audit trail.
//
// Every track sourced from Pixabay Music (pixabay.com/music), under the
// Pixabay Content License: free for any commercial use, no attribution
// required (https://pixabay.com/service/license-summary/). Verified live
// per-track before download — each entry's `sourceId` is the exact Pixabay
// track ID, so any entry can be re-checked against its source page at
// pixabay.com/music/id-<sourceId>/ if the license terms ever need
// re-auditing. Files are self-hosted in public/audio/workout rather than
// hotlinked, same reasoning as the exercise form-images (reliability — a
// source-side takedown or rename shouldn't break a live workout session).
//
// Instrumental, no vocals — screened by title/tag before download (no
// track with vocal/feature language in its title was selected). Genre mix
// target from the build spec: ~60% hip-hop, ~20% R&B, ~20% soul, all
// upbeat/high-energy — picked from workout/hype/trap/groove-tagged search
// results specifically, not the "chill"/"smooth"/lo-fi-leaning results the
// same searches also returned.

export type MusicGenre = 'hip-hop' | 'rnb' | 'soul'

export type MusicTrack = {
  title: string
  artist: string
  genre: MusicGenre
  durationSec: number
  src: string // public path, self-hosted
  sourceId: number // Pixabay track id, for license re-audit
}

export const MUSIC_LICENSE = {
  name: 'Pixabay Content License',
  summary: 'Free for commercial use, no attribution required.',
  url: 'https://pixabay.com/service/license-summary/',
} as const

export const WORKOUT_TRACKS: MusicTrack[] = [
  // Hip-hop
  { title: 'Hype (Drill Music)', artist: 'kontraa', genre: 'hip-hop', durationSec: 235, src: '/audio/workout/hype-drill-music.mp3', sourceId: 438398 },
  { title: 'Hip-Hop Sport', artist: 'The_Mountain', genre: 'hip-hop', durationSec: 130, src: '/audio/workout/hip-hop-sport.mp3', sourceId: 567422 },
  { title: 'Hip Hop', artist: 'SoundSurfer', genre: 'hip-hop', durationSec: 127, src: '/audio/workout/hip-hop-soundsurfer.mp3', sourceId: 281678 },
  { title: 'Hip Hop', artist: 'Kulakovka', genre: 'hip-hop', durationSec: 138, src: '/audio/workout/hip-hop-kulakovka.mp3', sourceId: 278464 },
  { title: 'Workout Music', artist: 'BombinSound', genre: 'hip-hop', durationSec: 111, src: '/audio/workout/workout-music-bombinsound.mp3', sourceId: 551839 },
  { title: 'Hip-Hop Groove', artist: 'prettyjohn1', genre: 'hip-hop', durationSec: 95, src: '/audio/workout/hip-hop-groove.mp3', sourceId: 526148 },
  { title: 'Be Workout', artist: 'prettyjohn1', genre: 'hip-hop', durationSec: 89, src: '/audio/workout/be-workout.mp3', sourceId: 524116 },
  { title: 'Trap Hype Beat', artist: 'APALONBeats', genre: 'hip-hop', durationSec: 113, src: '/audio/workout/trap-hype-beat-apalonbeats.mp3', sourceId: 576250 },
  { title: 'Trap Hype Beat 2', artist: 'SolarFLEX', genre: 'hip-hop', durationSec: 123, src: '/audio/workout/trap-hype-beat-2.mp3', sourceId: 569535 },
  { title: 'Trap Hype', artist: 'ARPMedia', genre: 'hip-hop', durationSec: 103, src: '/audio/workout/trap-hype-arpmedia.mp3', sourceId: 569432 },
  { title: 'Trap Hype Beat', artist: 'MondaMusic', genre: 'hip-hop', durationSec: 131, src: '/audio/workout/trap-hype-beat-mondamusic.mp3', sourceId: 560128 },
  { title: 'Hip Hop (Version 1)', artist: 'BombinSound', genre: 'hip-hop', durationSec: 109, src: '/audio/workout/hip-hop-version-1.mp3', sourceId: 547253 },
  // R&B
  { title: 'Rap Rnb Type Beat', artist: 'GR0ZA', genre: 'rnb', durationSec: 145, src: '/audio/workout/rap-rnb-type-beat.mp3', sourceId: 561707 },
  { title: 'Daily Flow', artist: 'Lafrey_Music', genre: 'rnb', durationSec: 155, src: '/audio/workout/daily-flow.mp3', sourceId: 518467 },
  { title: 'RnB Type Beat', artist: 'Tunetank', genre: 'rnb', durationSec: 120, src: '/audio/workout/rnb-type-beat.mp3', sourceId: 347925 },
  { title: 'Smooth RnB Beat', artist: 'Tunetank', genre: 'rnb', durationSec: 136, src: '/audio/workout/smooth-rnb-beat.mp3', sourceId: 409348 },
  { title: 'Next Wifey (2000s RnB Type Beat)', artist: 'TremoxBeatz', genre: 'rnb', durationSec: 252, src: '/audio/workout/next-wifey-2000s-rnb.mp3', sourceId: 223621 },
  // Soul
  { title: 'Groove Soul', artist: 'The_Mountain', genre: 'soul', durationSec: 111, src: '/audio/workout/groove-soul.mp3', sourceId: 317798 },
  { title: 'Funk Groove Soul', artist: 'prettyjohn1', genre: 'soul', durationSec: 89, src: '/audio/workout/funk-groove-soul.mp3', sourceId: 527077 },
  { title: 'Funk', artist: 'The_Mountain', genre: 'soul', durationSec: 106, src: '/audio/workout/funk-the-mountain.mp3', sourceId: 564421 },
  { title: 'Funk', artist: 'prettyjohn1', genre: 'soul', durationSec: 131, src: '/audio/workout/funk-prettyjohn1.mp3', sourceId: 503900 },
  { title: 'Funk Music', artist: 'Monume', genre: 'soul', durationSec: 118, src: '/audio/workout/funk-music-monume.mp3', sourceId: 570688 },
]
