import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, localHourNumber, getTimezone } from '@/lib/localdate'
import { assessLifePattern } from '@/lib/fos/pattern'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { pickMeals, defaultMealBudget, mealPhoto, shortName, type MealMemory } from '@/lib/meal-pick'
import { loadDrops, rollDrop, saveDrop, shieldDatesFrom, type DropTrigger, type RecipeBonus } from '@/lib/reward-drop'
import { streakDetail } from '@/lib/streak'
import { getActivePartnership, sendPartnerMessage, pushToPartner } from '@/lib/partners'

export const dynamic = 'force-dynamic'

// Reward Drop (rewards-plan.md phase 2 + 4). Called right AFTER a real
// healthy action is saved — a finished workout (WorkoutPlayer) or a logged /
// ordered meal (NutritionPicks). Rolls on the server, once per enrollment +
// trigger + local day, and is safe to call twice. Until migration 047 runs,
// the same per-day roll still comes back, just unsaved — never an error.
//
// POST { trigger: 'workout' | 'meal' }  → { drop, fresh, saved, streak, shields }
// POST { action: 'open', id }          → marks a saved drop opened
// POST { action: 'share' }             → today's Rare, sent to her partner (2026-10-27)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ drop: null }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { trigger?: string; action?: string; id?: string }
  const svc = createServiceClient()

  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, created_at, name').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, created_at, name').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ drop: null })
  const enrollmentId = enrollment.id as string

  if (body.action === 'open') {
    if (body.id) {
      try { await svc.from('reward_drops').update({ opened_at: new Date().toISOString() }).eq('id', body.id).eq('enrollment_id', enrollmentId).is('opened_at', null) } catch { /* table not there yet */ }
    }
    return NextResponse.json({ ok: true })
  }

  const firstName = String(enrollment.name || '').trim().split(/\s+/)[0] || ''
  const partnership = await getActivePartnership(enrollmentId).catch(() => null)
  const partnerId: string | null = partnership ? (partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a) : null
  let partnerName: string | null = null
  if (partnerId) {
    const { data: pe } = await svc.from('challenge_enrollments').select('name').eq('id', partnerId).maybeSingle()
    partnerName = String(pe?.name || '').trim().split(/\s+/)[0] || 'your partner'
  }

  // "Send to <partner>?" on a Rare — only today's real Rare, only once.
  if (body.action === 'share') {
    if (!partnership || !partnerId) return NextResponse.json({ ok: false })
    const day = localDateISO(getTimezone())
    const { data: row } = await svc.from('reward_drops').select('id, tier, payload, shared_at').eq('enrollment_id', enrollmentId).eq('trigger', 'workout').eq('day', day).maybeSingle()
    // Until 047 runs there's no saved row to check — fall back to the sender's
    // own today's roll, re-checked below as a Rare.
    let title: string | null = null
    if (row) {
      if (row.tier !== 'rare' || row.shared_at) return NextResponse.json({ ok: !!row.shared_at })
      title = (row.payload as { title?: string } | null)?.title || null
      await svc.from('reward_drops').update({ shared_at: new Date().toISOString() }).eq('id', row.id)
    } else {
      body.trigger = 'workout'
      ;(body as { shareAfter?: boolean }).shareAfter = true
    }
    if (row) {
      const who = firstName || 'Your partner'
      const msg = `${who} just hit ${title ? title.toLowerCase() : 'a big one'}! Send her some love.`
      await sendPartnerMessage(partnership.id, enrollmentId, msg, 'cheer')
      await pushToPartner(partnerId, `${who} just hit a big one`, msg)
      return NextResponse.json({ ok: true })
    }
  }

  const trigger: DropTrigger | null = body.trigger === 'workout' || body.trigger === 'meal' ? body.trigger : null
  if (!trigger) return NextResponse.json({ drop: null }, { status: 400 })

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const [{ data: progress }, { data: intake }, store, pattern] = await Promise.all([
    svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__'),
    svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollmentId).maybeSingle(),
    loadDrops(svc, enrollmentId),
    assessLifePattern(enrollmentId, todayIso).catch(() => null),
  ])

  // Already got today's for this action → the same one back (can't farm it).
  const already = store.drops.find((d) => d.trigger === trigger && d.day === todayIso)
  const dates = new Set((progress || []).map((r) => r.logged_on as string))
  const shieldDates = shieldDatesFrom(store.drops)
  const streakNow = () => streakDetail(dates, todayIso, shieldDates)
  if (already) {
    const s = streakNow()
    return NextResponse.json({ drop: already, fresh: false, saved: true, streak: s.streak, shields: s.shieldsLeft, partnerName, shared: !!already.sharedAt })
  }

  // Meal drops only after a real meal is logged today.
  if (trigger === 'meal') {
    const { count } = await svc.from('challenge_food_log').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollmentId).eq('logged_on', todayIso)
    if (!count) return NextResponse.json({ drop: null })
  }

  const workoutDates = (progress || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).map((r) => r.logged_on as string)
  // A workout drop needs today's workout saved — the player only calls after that save.
  if (trigger === 'workout' && !workoutDates.includes(todayIso)) return NextResponse.json({ drop: null })

  const fd = (intake?.form_data || {}) as { why_own?: string; payoffs?: string[] }
  const daysEnrolled = Math.max(0, Math.floor((Date.now() - new Date(enrollment.created_at as string).getTime()) / 86400000))

  // A recipe that fits her calories AND her money, from the verified cookbook.
  const recipe = async (): Promise<RecipeBonus | null> => {
    const day = await loadNutritionDay(user)
    if (!day || !day.intake || !day.calBudget) return null
    const form = (day.intake.form_data || {}) as Record<string, unknown>
    const logged = day.foodRows.reduce((s, r) => s + (Number(r.calories) || 0), 0)
    const late = localHourNumber(tz) >= 15
    const remainingCal = late ? Math.round(day.calBudget * 0.4) : Math.max(0, Math.round(day.calBudget - logged))
    if (remainingCal < 250) return null
    const cookBudget = form.eat_style === 'cook' && Number(form.meal_budget) ? Number(form.meal_budget) : defaultMealBudget('cook', Number(day.intake.weekly_food_budget) || null)
    const res = pickMeals({
      eatStyle: 'cook', slot: late ? 'Lunch' : 'Dinner', remainingCal, mealBudget: cookBudget,
      weightLbs: Number(day.intake.weight_lbs) || 170,
      dislikesAllergies: day.intake.dislikes_allergies as string | null,
      foodPreferences: day.intake.food_preferences as string | null,
      memory: (form.meal_memory || {}) as MealMemory,
      todayIso,
    })
    const pool = res.options.filter((o) => o.place === 'The Menu cookbook' && (o.price == null || o.price <= cookBudget) && o.cal <= remainingCal)
    if (!pool.length) return null
    const o = pool[Math.abs(todayIso.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % Math.min(pool.length, 4)]
    return { key: o.key, name: shortName(o), cal: o.cal, price: o.price, photo: mealPhoto(o) }
  }

  const rolled = await rollDrop({
    trigger, enrollmentId, todayIso, dates, workoutDates, daysEnrolled,
    dipHigh: pattern?.riskBand === 'high',
    whyOwn: fd.why_own, payoffs: fd.payoffs,
    history: store.drops, recipe,
    firstName,
    mealsHandled: await svc.from('challenge_food_log').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollmentId).eq('source', 'meal_pick').then((r) => r.count || 0, () => 0),
  })

  // Share fallback (no saved table yet): only a real Rare goes out.
  if ((body as { shareAfter?: boolean }).shareAfter) {
    if (rolled.tier !== 'rare' || !partnership || !partnerId) return NextResponse.json({ ok: false })
    const who = firstName || 'Your partner'
    const msg = `${who} just hit ${rolled.payload.title.toLowerCase()}! Send her some love.`
    await sendPartnerMessage(partnership.id, enrollmentId, msg, 'cheer')
    await pushToPartner(partnerId, `${who} just hit a big one`, msg)
    return NextResponse.json({ ok: true })
  }

  // Even a plain meal check is saved: it holds the one-per-day spot so a
  // second log can't re-roll for a bonus.
  const saved = store.ok ? await saveDrop(svc, enrollmentId, user.id, rolled) : null
  const drop = saved?.drop || { ...rolled, id: null, createdAt: new Date().toISOString(), openedAt: null, sharedAt: null }
  const s = streakDetail(dates, todayIso, drop.kind === 'shield' ? [...shieldDates, todayIso] : shieldDates)
  return NextResponse.json({ drop, fresh: saved ? saved.fresh : true, saved: !!saved, streak: s.streak, shields: s.shieldsLeft, partnerName, shared: false })
}
