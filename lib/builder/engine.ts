import { createServiceClient } from '@/lib/supabase/server'
import { ingestEvents } from '@/lib/builder/ingest'
import { loadTierMap, classifyFrom } from '@/lib/builder/tiers'

export type BuilderElement = {
  id: string
  tier: string
  source_type: string
  sequence: number
  variant: number
  placed_at: string
}

export type BuilderPhase = 'foundation' | 'structure' | 'detail' | 'landmark'

export type BuilderSyncResult = {
  elements: BuilderElement[]
  phase: BuilderPhase
}

function phaseFor(count: number): BuilderPhase {
  if (count < 10) return 'foundation'
  if (count < 30) return 'structure'
  if (count < 60) return 'detail'
  return 'landmark'
}

export async function syncBuilderState(enrollmentId: string, userId: string): Promise<BuilderSyncResult> {
  const svc = createServiceClient()

  let { data: state } = await svc.from('builder_state').select('last_synced_at').eq('enrollment_id', enrollmentId).maybeSingle()
  if (!state) {
    await svc.from('builder_state').insert({ enrollment_id: enrollmentId, user_id: userId })
    state = { last_synced_at: null }
  }

  const [events, tierMap, { data: maxRow }] = await Promise.all([
    ingestEvents(enrollmentId, state.last_synced_at as string | null),
    loadTierMap(),
    svc.from('builder_elements').select('sequence').eq('enrollment_id', enrollmentId).order('sequence', { ascending: false }).limit(1).maybeSingle(),
  ])

  events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())

  let sequence = (maxRow?.sequence as number | undefined) ?? 0
  const newRows = events.map((e) => {
    sequence += 1
    return {
      enrollment_id: enrollmentId,
      user_id: userId,
      sequence,
      tier: classifyFrom(tierMap, e.source_type, e.source_key),
      source_type: e.source_type,
      source_id: e.source_id,
      variant: sequence % 4,
      placed_at: e.occurred_at,
    }
  })

  if (newRows.length > 0) {
    // Re-running this sync is expected (called on every dashboard load) — a
    // race between two loads, or an event already placed from a prior
    // shorter-since sync, must never double-place. onConflict matches the
    // unique(enrollment_id, source_type, source_id) constraint from the migration.
    const { error } = await svc.from('builder_elements').upsert(newRows, { onConflict: 'enrollment_id,source_type,source_id', ignoreDuplicates: true })
    if (error) throw error
  }

  await svc.from('builder_state').update({ last_synced_at: new Date().toISOString() }).eq('enrollment_id', enrollmentId)

  const { data: allRows } = await svc.from('builder_elements').select('id, tier, source_type, sequence, variant, placed_at').eq('enrollment_id', enrollmentId).order('sequence', { ascending: true })
  const elements = (allRows || []) as BuilderElement[]

  return { elements, phase: phaseFor(elements.length) }
}
