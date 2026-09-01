/**
 * Builder View sync smoke test — runs syncBuilderState() twice against the
 * standing test account (see CLAUDE.md) and confirms the second call is a
 * true no-op (same element count, no duplicate rows). Run after migration
 * 038_builder_view.sql has been applied.
 *
 * Usage:
 *   npx tsx scripts/test-builder-sync.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { syncBuilderState } from '../lib/builder/engine'
import { createServiceClient } from '../lib/supabase/server'

const ENROLLMENT_ID = '22904113-7ee4-4edc-a4d7-37980e04e386'
const USER_ID = 'a756cda3-5ed1-4906-9450-d60e4c72916a'

async function main() {
  const svc = createServiceClient()

  console.log('First sync...')
  const first = await syncBuilderState(ENROLLMENT_ID, USER_ID)
  console.log(`  phase=${first.phase} totalCount=${first.elements.length}`)

  console.log('Second sync (should be a no-op)...')
  const second = await syncBuilderState(ENROLLMENT_ID, USER_ID)
  console.log(`  phase=${second.phase} totalCount=${second.elements.length}`)

  const { count: rowCount } = await svc
    .from('builder_elements')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', ENROLLMENT_ID)

  const tierCounts: Record<string, number> = {}
  for (const e of second.elements) tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1
  const sourceCounts: Record<string, number> = {}
  for (const e of second.elements) sourceCounts[e.source_type] = (sourceCounts[e.source_type] || 0) + 1

  console.log('Tier breakdown:', tierCounts)
  console.log('Source breakdown:', sourceCounts)
  console.log(`DB row count: ${rowCount}`)

  const idempotent = first.elements.length === second.elements.length && rowCount === second.elements.length
  console.log(idempotent ? 'PASS: second sync did not duplicate rows.' : 'FAIL: element count changed or mismatched DB row count.')
  process.exit(idempotent ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
