'use client'

import { useState, useEffect, useCallback } from 'react'

type SocialAccount = {
  id: string
  platform: string
  account_name: string
  connected_at: string
  active: boolean
  token_expires_at: string
}

type ScheduledPost = {
  id: string
  platform: string
  content_type: string
  caption: string
  hashtags: string
  media_url: string
  scheduled_at: string
  status: string
  published_at: string | null
  published_id: string | null
  error_message: string | null
  planner_day: number | null
  created_at: string
}

type ContentSettings = {
  id: string
  caption_template: string
  cadence: Record<string, { per_week: number; times: string[] }>
}

type BatchFile = { file: File; note: string }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(212,197,160,0.12)', text: '#D4C5A0' },
  scheduled: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  publishing: { bg: 'rgba(234,179,8,0.12)', text: '#facc15' },
  published: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  failed: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
}

export default function SocialPublisher() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduler, setShowScheduler] = useState(false)
  const [filter, setFilter] = useState('all')

  // Bulk upload (Content Engine) — always shown, not hidden behind a toggle;
  // this is the primary action, not an extra. Defaults to 'both' since that's
  // the common case (removes a required click for the typical upload).
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([])
  const [batchPlatform, setBatchPlatform] = useState('both')
  const [uploadingBatch, setUploadingBatch] = useState(false)
  const [batchResult, setBatchResult] = useState<string | null>(null)

  // Settings (caption template + cadence)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ContentSettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  // Scheduler form
  const [platform, setPlatform] = useState('instagram')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduling, setScheduling] = useState(false)

  const loadData = useCallback(async () => {
    const [accountsRes, postsRes] = await Promise.all([
      fetch('/api/social/accounts'),
      fetch(`/api/social/schedule?status=${filter}`),
    ])
    const accountsData = await accountsRes.json()
    const postsData = await postsRes.json()
    setAccounts(accountsData.accounts || [])
    setPosts(postsData.posts || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetch('/api/social/settings').then(r => r.json()).then(d => { if (d.settings) setSettings(d.settings) })
  }, [])

  function onPickFiles(fileList: FileList | null) {
    if (!fileList) return
    setBatchFiles(Array.from(fileList).map(file => ({ file, note: '' })))
    setBatchResult(null)
  }

  function updateNote(index: number, note: string) {
    setBatchFiles(prev => prev.map((bf, i) => (i === index ? { ...bf, note } : bf)))
  }

  function removeBatchFile(index: number) {
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function generateAndSchedule() {
    if (!batchFiles.length) return
    setUploadingBatch(true)
    setBatchResult(null)
    try {
      const form = new FormData()
      batchFiles.forEach(bf => form.append('files', bf.file))
      form.append('notes', JSON.stringify(batchFiles.map(bf => bf.note)))
      form.append('platform', batchPlatform)
      const res = await fetch('/api/social/upload-batch', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setBatchResult(data.error || 'Upload failed.'); return }
      const failed = (data.posts || []).filter((p: { error?: string }) => p.error)
      setBatchResult(failed.length ? `Scheduled with ${failed.length} error(s) — check console.` : `Scheduled ${data.posts.length} post(s).`)
      if (failed.length) console.error('Batch upload errors:', failed)
      setBatchFiles([])
      await loadData()
    } finally {
      setUploadingBatch(false)
    }
  }

  async function saveSettings() {
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/social/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: settings.id, caption_template: settings.caption_template, cadence: settings.cadence }),
      })
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
    } finally {
      setSavingSettings(false)
    }
  }

  async function schedulePost() {
    setScheduling(true)
    const res = await fetch('/api/social/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, caption, hashtags, media_url: mediaUrl, scheduled_at: scheduledAt }),
    })
    if (res.ok) {
      setCaption('')
      setHashtags('')
      setMediaUrl('')
      setScheduledAt('')
      setShowScheduler(false)
      await loadData()
    }
    setScheduling(false)
  }

  async function publishNow(postId: string) {
    await fetch('/api/social/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    await loadData()
  }

  async function deletePost(postId: string) {
    await fetch('/api/social/schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId }),
    })
    await loadData()
  }

  async function disconnectAccount(id: string) {
    await fetch('/api/social/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadData()
  }

  const igConnected = accounts.find(a => a.platform === 'instagram')
  const ttConnected = accounts.find(a => a.platform === 'tiktok')

  if (loading) return <div style={{ color: '#D4C5A0', padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Connected Accounts */}
      <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 20 }}>
        <h3 style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Connected Accounts</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Instagram */}
          <div style={{ flex: '1 1 250px', background: '#0A0A0F', borderRadius: 8, padding: 16, border: `1px solid ${igConnected ? 'rgba(16,185,129,0.3)' : '#2A2A35'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#F5F5F5', fontWeight: 600, fontSize: 14 }}>Instagram</span>
              {igConnected ? (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>Connected</span>
              ) : (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Not Connected</span>
              )}
            </div>
            {igConnected ? (
              <div>
                <p style={{ color: '#D4C5A0', fontSize: 12 }}>@{igConnected.account_name}</p>
                <p style={{ color: '#2A2A35', fontSize: 10, marginTop: 4 }}>
                  Expires: {new Date(igConnected.token_expires_at).toLocaleDateString()}
                </p>
                <button onClick={() => disconnectAccount(igConnected.id)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, cursor: 'pointer' }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <a href="/api/social/connect?platform=instagram" style={{ display: 'inline-block', marginTop: 8, padding: '8px 16px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                Connect Instagram
              </a>
            )}
          </div>

          {/* TikTok */}
          <div style={{ flex: '1 1 250px', background: '#0A0A0F', borderRadius: 8, padding: 16, border: `1px solid ${ttConnected ? 'rgba(16,185,129,0.3)' : '#2A2A35'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#F5F5F5', fontWeight: 600, fontSize: 14 }}>TikTok</span>
              {ttConnected ? (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>Connected</span>
              ) : (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Not Connected</span>
              )}
            </div>
            {ttConnected ? (
              <div>
                <p style={{ color: '#D4C5A0', fontSize: 12 }}>{ttConnected.account_name}</p>
                <button onClick={() => disconnectAccount(ttConnected.id)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, cursor: 'pointer' }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <a href="/api/social/connect?platform=tiktok" style={{ display: 'inline-block', marginTop: 8, padding: '8px 16px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                Connect TikTok
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Upload (Content Engine) — the primary action, always visible, not
          gated behind a toggle. Three real steps: you upload, everything else
          (captions, hashtags, scheduling, posting) happens on its own. */}
      <div style={{ background: '#1A1A22', border: '1px solid #C9A84C', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600 }}>Upload Once, It Handles the Month</h3>
          <button onClick={() => setShowSettings(!showSettings)} style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', color: '#D4C5A0', fontSize: 12, cursor: 'pointer', border: '1px solid #2A2A35' }}>
            {showSettings ? 'Close Settings' : 'Settings'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 4, flexWrap: 'wrap' }}>
          {[
            { n: 1, label: 'You upload' },
            { n: 2, label: 'We caption & schedule it' },
            { n: 3, label: 'It posts itself, live' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 20, padding: '6px 12px' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#C9A84C', color: '#0A0A0F', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</span>
              <span style={{ color: '#D4C5A0', fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {showSettings && settings && (
          <div style={{ marginTop: 16, padding: 16, background: '#0A0A0F', borderRadius: 8, border: '1px solid #2A2A35' }}>
            <label style={{ color: '#D4C5A0', fontSize: 12, display: 'block', marginBottom: 6 }}>Caption structure template</label>
            <textarea
              value={settings.caption_template}
              onChange={e => setSettings({ ...settings, caption_template: e.target.value })}
              rows={6}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#1A1A22', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {['instagram', 'tiktok'].map(p => (
                <div key={p} style={{ flex: '1 1 200px' }}>
                  <label style={{ color: '#D4C5A0', fontSize: 12, textTransform: 'capitalize', display: 'block', marginBottom: 6 }}>{p} — posts/week</label>
                  <input
                    type="number" min={1} max={7}
                    value={settings.cadence?.[p]?.per_week ?? 7}
                    onChange={e => setSettings({ ...settings, cadence: { ...settings.cadence, [p]: { per_week: parseInt(e.target.value) || 1, times: settings.cadence?.[p]?.times || ['09:00'] } } })}
                    style={{ width: '100%', padding: 8, borderRadius: 6, background: '#1A1A22', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13 }}
                  />
                  <input
                    type="time"
                    value={settings.cadence?.[p]?.times?.[0] || '09:00'}
                    onChange={e => setSettings({ ...settings, cadence: { ...settings.cadence, [p]: { per_week: settings.cadence?.[p]?.per_week ?? 7, times: [e.target.value] } } })}
                    style={{ width: '100%', padding: 8, borderRadius: 6, background: '#1A1A22', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13, marginTop: 6 }}
                  />
                </div>
              ))}
            </div>
            <button onClick={saveSettings} disabled={savingSettings} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: savingSettings ? 0.5 : 1 }}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
            <input type="file" accept="video/*" multiple onChange={e => onPickFiles(e.target.files)} style={{ color: '#D4C5A0', fontSize: 13 }} />

            {batchFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {batchFiles.map((bf, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#0A0A0F', padding: 10, borderRadius: 6 }}>
                    <span style={{ color: '#F5F5F5', fontSize: 12, flex: '0 0 160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bf.file.name}</span>
                    <input
                      value={bf.note}
                      onChange={e => updateNote(i, e.target.value)}
                      placeholder="What's this video about? (e.g. leg day form fix)"
                      style={{ flex: 1, padding: 8, borderRadius: 6, background: '#1A1A22', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 12 }}
                    />
                    <button onClick={() => removeBatchFile(i)} style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              {['instagram', 'tiktok', 'both'].map(p => (
                <button key={p} onClick={() => setBatchPlatform(p)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${batchPlatform === p ? '#C9A84C' : '#2A2A35'}`, background: batchPlatform === p ? 'rgba(201,168,76,0.15)' : 'transparent', color: batchPlatform === p ? '#C9A84C' : '#D4C5A0', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
                  {p}
                </button>
              ))}
              <button onClick={generateAndSchedule} disabled={uploadingBatch || !batchFiles.length} style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: uploadingBatch || !batchFiles.length ? 0.5 : 1 }}>
                {uploadingBatch ? 'Generating & Scheduling...' : 'Generate & Schedule'}
              </button>
            </div>

            {batchResult && <p style={{ color: '#D4C5A0', fontSize: 12, marginTop: 8 }}>{batchResult}</p>}
        </div>
      </div>

      {/* Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'scheduled', 'published', 'failed', 'draft'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${filter === f ? '#C9A84C' : '#2A2A35'}`, background: filter === f ? 'rgba(201,168,76,0.15)' : 'transparent', color: filter === f ? '#C9A84C' : '#D4C5A0', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowScheduler(!showScheduler)} style={{ padding: '8px 16px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          + Schedule Post
        </button>
      </div>

      {/* Scheduler Form */}
      {showScheduler && (
        <div style={{ background: '#1A1A22', border: '1px solid #C9A84C', borderRadius: 8, padding: 20 }}>
          <h3 style={{ color: '#C9A84C', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Schedule New Post</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['instagram', 'tiktok', 'both'].map(p => (
                <button key={p} onClick={() => setPlatform(p)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${platform === p ? '#C9A84C' : '#2A2A35'}`, background: platform === p ? 'rgba(201,168,76,0.15)' : 'transparent', color: platform === p ? '#C9A84C' : '#D4C5A0', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
                  {p}
                </button>
              ))}
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption..." rows={4} style={{ width: '100%', padding: 12, borderRadius: 6, background: '#0A0A0F', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13, resize: 'vertical' }} />
            <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="Hashtags (e.g. #reelsediting #contentcreation)" style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0A0A0F', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13 }} />
            <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="Media URL (video link or Supabase storage URL)" style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0A0A0F', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13 }} />
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0A0A0F', border: '1px solid #2A2A35', color: '#F5F5F5', fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={schedulePost} disabled={scheduling || !caption || !scheduledAt} style={{ padding: '10px 20px', borderRadius: 6, background: '#C9A84C', color: '#0A0A0F', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: scheduling ? 0.5 : 1 }}>
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
              <button onClick={() => setShowScheduler(false)} style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', color: '#D4C5A0', fontSize: 13, cursor: 'pointer', border: '1px solid #2A2A35' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.length === 0 ? (
          <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#D4C5A0', fontSize: 14 }}>No {filter === 'all' ? '' : filter} posts yet. Click &quot;Schedule Post&quot; to get started.</p>
          </div>
        ) : posts.map(post => {
          const statusStyle = STATUS_COLORS[post.status] || STATUS_COLORS.draft
          return (
            <div key={post.id} style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.text, fontWeight: 600, textTransform: 'uppercase' }}>
                    {post.status}
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(201,168,76,0.12)', color: '#C9A84C', textTransform: 'capitalize' }}>
                    {post.platform}
                  </span>
                  {post.planner_day && (
                    <span style={{ fontSize: 10, color: '#D4C5A0' }}>Day {post.planner_day}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#D4C5A0' }}>
                  {new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              <p style={{ color: '#F5F5F5', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
                {post.caption.length > 150 ? post.caption.slice(0, 150) + '...' : post.caption}
              </p>

              {post.error_message && (
                <p style={{ color: '#f87171', fontSize: 11, marginBottom: 8 }}>{post.error_message}</p>
              )}

              {post.published_at && (
                <p style={{ color: '#34d399', fontSize: 11, marginBottom: 8 }}>Published {new Date(post.published_at).toLocaleString()}</p>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                {(post.status === 'scheduled' || post.status === 'failed') && (
                  <button onClick={() => publishNow(post.id)} style={{ padding: '4px 12px', borderRadius: 4, background: '#C9A84C', color: '#0A0A0F', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                    Publish Now
                  </button>
                )}
                {post.status !== 'published' && (
                  <button onClick={() => deletePost(post.id)} style={{ padding: '4px 12px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, cursor: 'pointer' }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
