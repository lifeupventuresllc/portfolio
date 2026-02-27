/**
 * Database Backup Script
 *
 * Exports all data from Supabase tables to JSON files.
 *
 * Usage:
 *   npx tsx scripts/backup.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const TABLES = ['profiles', 'products', 'purchases', 'emails'] as const

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups', timestamp)

  fs.mkdirSync(backupDir, { recursive: true })

  console.log(`Starting backup to ${backupDir}...`)

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*')

      if (error) {
        console.error(`Error backing up ${table}:`, error.message)
        continue
      }

      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`  ${table}: ${data?.length || 0} rows exported`)
    } catch (err) {
      console.error(`Failed to backup ${table}:`, err)
    }
  }

  console.log(`\nBackup complete: ${backupDir}`)
  console.log('\nTo restore, use the Supabase dashboard or run SQL INSERT statements from the backup JSON files.')
}

backup().catch(console.error)
