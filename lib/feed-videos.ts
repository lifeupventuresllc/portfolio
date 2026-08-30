// Dashboard "For You" feed content — real free-licensed Pexels stock footage
// (Black women: fitness + nutrition), hosted in the public `feed-videos`
// Supabase Storage bucket (never a scratch/local path in production). Asa's
// ask, 2026-08-29: rotation order must be randomized per visit, not the
// fixed sequence used during mockup review.
export type FeedVideoTag = 'Fitness' | 'Nutrition'
export type FeedVideo = { path: string; tag: FeedVideoTag }

const FEED_VIDEOS: FeedVideo[] = [
  { path: '8459963-sd_640_360_25fps.mp4', tag: 'Fitness' },
  { path: '6005181-sd_360_640_30fps.mp4', tag: 'Nutrition' },
  { path: '6297133-sd_360_640_24fps.mp4', tag: 'Fitness' },
  { path: '6183123-sd_338_640_25fps.mp4', tag: 'Nutrition' },
  { path: '6390162-sd_360_640_25fps.mp4', tag: 'Fitness' },
  { path: '8459967-sd_640_360_25fps.mp4', tag: 'Fitness' },
  { path: '7117430-sd_338_640_30fps.mp4', tag: 'Fitness' },
  { path: '8090798-sd_640_360_24fps.mp4', tag: 'Nutrition' },
  { path: '8456209-sd_360_640_25fps.mp4', tag: 'Fitness' },
  { path: '6575894-sd_360_640_24fps.mp4', tag: 'Nutrition' },
  // +5 fitness clips, Asa's ask 2026-08-29 ("add 5 more video all fitness
  // of black women working out")
  { path: '8459966-sd_360_640_25fps.mp4', tag: 'Fitness' },
  { path: '7117850-sd_338_640_30fps.mp4', tag: 'Fitness' },
  { path: '6455071-sd_360_640_24fps.mp4', tag: 'Fitness' },
  { path: '8053319-sd_360_640_25fps.mp4', tag: 'Fitness' },
  { path: '6390153-sd_360_640_25fps.mp4', tag: 'Fitness' },
  // Asa's own real clips, added 2026-08-30 (cropped to 9:16 + re-encoded
  // from his raw screen recordings, uploaded to this same bucket).
  { path: 'asa-fitness-01.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-02.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-03.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-04.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-05.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-06.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-07.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-08.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-09.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-10.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-11.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-12.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-13.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-14.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-15.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-16.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-17.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-18.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-19.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-20.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-21.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-22.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-23.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-24.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-25.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-26.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-27.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-28.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-29.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-30.mp4', tag: 'Fitness' },
  { path: 'asa-fitness-31.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-32.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-33.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-34.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-35.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-36.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-37.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-38.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-39.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-40.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-41.mp4', tag: 'Nutrition' },
  { path: 'asa-fitness-42.mp4', tag: 'Nutrition' },
]

const BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, '')}/storage/v1/object/public/feed-videos`

// Fisher-Yates — real per-request shuffle, not a fixed order re-sorted by a
// weak key. Safe to call from a server component (no client Math.random
// hydration mismatch: the shuffled order is baked into the HTML server-side
// and never re-shuffled on the client after mount).
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getFeedVideos(): { url: string; tag: FeedVideoTag }[] {
  return shuffled(FEED_VIDEOS).map((v) => ({ url: `${BUCKET_URL}/${v.path}`, tag: v.tag }))
}
