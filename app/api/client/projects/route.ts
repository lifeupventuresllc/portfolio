import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('projects')
    .select('id, client_name, service_type, package, status, deadline, revisions_used, revision_limit, notes, created_at, updated_at')
    .eq('client_email', user.email)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Missing project id' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify the project belongs to this user
  const { data: project, error: fetchError } = await service
    .from('projects')
    .select('id, status, revisions_used, revision_limit, client_email')
    .eq('id', id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.client_email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (project.status !== 'delivered') {
    return NextResponse.json({ error: 'Revision can only be requested on delivered projects' }, { status: 400 })
  }

  if (project.revisions_used >= project.revision_limit) {
    return NextResponse.json({ error: 'Revision limit reached' }, { status: 400 })
  }

  const { data, error } = await service
    .from('projects')
    .update({
      status: 'revision',
      revisions_used: project.revisions_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
