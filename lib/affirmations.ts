// Daily self-talk — a rotating affirmation on the client's home dashboard.
// Picked by day-of-year so it's stable all day and changes each morning.
export const AFFIRMATIONS = [
  'You showed up today. That already makes you different.',
  'Strong is built one honest day at a time — and today is one of them.',
  'Your body hears everything your mind says. Speak life.',
  'You don’t have to be perfect. You just have to keep going.',
  'Every rep, every meal, every check-in is a vote for the woman you’re becoming.',
  'Discipline is just love for your future self.',
  'You are not starting over. You are continuing — with everything you’ve learned.',
  'Progress over perfection. Always.',
  'The hardest part is starting, and you already did.',
  'You are allowed to be both a work in progress AND a masterpiece.',
  'Small steps every day beat big leaps once in a while.',
  'Your consistency is louder than your motivation. Trust it.',
  'Fuel your body like you love it — because you do.',
  'You’re stronger than the excuse trying to stop you today.',
  'Nobody is coming to do this for you, and you don’t need them to. You’ve got this.',
  'Rest is part of the work. Honor your body today.',
  'The version of you six weeks from now is watching what you do right now.',
  'You are worth the effort you’re putting in.',
  'One good choice makes the next one easier. Start there.',
  'Snatched without starving. Strong without struggle. That’s the way.',
  'You didn’t come this far to only come this far.',
  'Feed the goal, not the mood.',
  'Your future is created by what you do today, not tomorrow.',
  'Be proud of every step, even the small ones — they add up.',
  'Confidence is built in the moments no one is watching.',
  'You’re doing hard things, and that’s exactly why they’re working.',
  'Take care of your body. It’s the only place you have to live.',
  'You are becoming unrecognizable to the doubt that used to define you.',
  'Show up for yourself the way you show up for everyone else.',
  'Today counts. Make it a good vote.',
]

export function affirmationForToday(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length]
}
