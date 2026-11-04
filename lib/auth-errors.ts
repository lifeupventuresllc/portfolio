// Supabase auth errors -> warm, on-brand copy. Falls back to the raw message only for
// truly unrecognized cases -- never silently swallow a real error, just reword the
// known ones. Match on `.code` first (supabase-js sets this on AuthError), fall back
// to a message substring match for responses that omit it.
export function mapAuthError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null
  const msg = e?.message || ''
  const code = e?.code || ''

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return "That email or password doesn't match. Try again, tap \"Forgot password\", or if you joined with Google, tap \"Continue with Google\"."
  if (code === 'user_already_exists' || /user already registered/i.test(msg))
    return 'Looks like you already have an account with that email — try logging in instead.'
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(msg))
    return "We've sent a few emails to that address already — give it a few minutes and try again."
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return 'Almost there — you just need to confirm your email first. Check your inbox, or resend the confirmation below.'
  if (/failed to fetch|network/i.test(msg))
    return 'Having trouble connecting — check your connection and try again.'

  if (/error updating user|database error/i.test(msg))
    return "We couldn't finish that just now. Please try again in a moment."
  return msg || 'Something went wrong. Please try again.'
}
