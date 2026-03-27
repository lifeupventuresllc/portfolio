'use client'

import { useState, useRef } from 'react'

type ProspectRow = {
  name: string
  email?: string
  phone?: string
  platform?: string
  prospect_type?: string
  type?: string
  instagram?: string
  notes?: string
}

export default function CsvImporter({ onImported }: { onImported: () => void }) {
  const [rows, setRows] = useState<ProspectRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function parseCsv(text: string): ProspectRow[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    return lines.slice(1).map(line => {
      // Handle quoted fields with commas
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
        current += char
      }
      values.push(current.trim())

      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })

      return {
        name: row.name || row.business || row.contact || '',
        email: row.email || '',
        phone: row.phone || '',
        platform: row.platform || 'email',
        prospect_type: row.prospect_type || row.type || 'other',
        instagram: row.instagram || row.ig || '',
        notes: row.notes || '',
      }
    }).filter(r => r.name)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsv(text)
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setResult(`Imported ${data.inserted} prospects`)
      setRows([])
      if (fileRef.current) fileRef.current.value = ''
      onImported()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setResult(`Error: ${msg}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-6 mb-6">
      <h3 className="text-sm font-semibold text-white mb-3">Import Prospects from CSV</h3>
      <p className="text-xs text-ivory/40 mb-4">
        CSV should have headers: name, email, phone, platform, type, instagram, notes
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="text-sm text-ivory/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gold/20 file:text-gold hover:file:bg-gold/30 file:cursor-pointer"
        />

        {rows.length > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="bg-gold text-obsidian px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold/90 disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${rows.length} Prospects`}
          </button>
        )}

        {rows.length > 0 && (
          <button
            onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = '' }}
            className="text-xs text-ivory/40 hover:text-ivory/70"
          >
            Clear
          </button>
        )}
      </div>

      {result && (
        <div className={`mt-3 text-sm ${result.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
          {result}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-ivory/40 uppercase border-b border-smoke">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Instagram</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-smoke/50">
              {rows.slice(0, 20).map((r, i) => (
                <tr key={i} className="text-ivory/70">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.email || '—'}</td>
                  <td className="px-3 py-2">{r.platform}</td>
                  <td className="px-3 py-2">{r.prospect_type}</td>
                  <td className="px-3 py-2">{r.instagram || '—'}</td>
                  <td className="px-3 py-2 max-w-32 truncate">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 20 && (
            <p className="text-xs text-ivory/30 mt-2 px-3">+ {rows.length - 20} more rows</p>
          )}
        </div>
      )}
    </div>
  )
}
