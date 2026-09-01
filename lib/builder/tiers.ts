import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_TIER = 'micro'

function key(sourceType: string, sourceKey: string | null): string {
  return `${sourceType}::${sourceKey ?? ''}`
}

// Exported so engine.ts can load once and classify a whole batch of events
// without a round trip per event.
export async function loadTierMap(): Promise<Map<string, string>> {
  const svc = createServiceClient()
  const { data } = await svc.from('builder_action_tier_map').select('source_type, source_key, tier')
  const map = new Map<string, string>()
  for (const row of data || []) {
    map.set(key(row.source_type as string, row.source_key as string | null), row.tier as string)
  }
  return map
}

export function classifyFrom(map: Map<string, string>, sourceType: string, sourceKey: string | null): string {
  return map.get(key(sourceType, sourceKey)) ?? map.get(key(sourceType, null)) ?? DEFAULT_TIER
}

// Never throws on an unmapped action — an unrecognized source_type/key still
// places an element (as the smallest tier) rather than breaking the sync.
export async function classify(sourceType: string, sourceKey: string | null): Promise<string> {
  const map = await loadTierMap()
  return classifyFrom(map, sourceType, sourceKey)
}
