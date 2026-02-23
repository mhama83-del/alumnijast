import { createClient } from '@/lib/supabase/server'
import { Profile, BatchRole, CentralAdmin } from './types'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function isCentralAdmin(userId?: string): Promise<boolean> {
  const supabase = await createClient()
  const id = userId || (await getCurrentUser())?.id
  
  if (!id) return false

  const { data } = await supabase
    .from('central_admins')
    .select('id')
    .eq('user_id', id)
    .single()

  return !!data
}

export async function getBatchRoles(userId?: string): Promise<BatchRole[]> {
  const supabase = await createClient()
  const id = userId || (await getCurrentUser())?.id
  
  if (!id) return []

  const { data } = await supabase
    .from('batch_roles')
    .select('*')
    .eq('user_id', id)

  return data || []
}

export async function isBatchAdmin(batchYear: number, userId?: string): Promise<boolean> {
  const roles = await getBatchRoles(userId)
  return roles.some(role => role.batch_year === batchYear)
}

export async function canViewContact(profileId: string, viewerId: string): Promise<boolean> {
  if (profileId === viewerId) return true

  const supabase = await createClient()
  
  const { data } = await supabase
    .from('connections')
    .select('status')
    .or(`and(requester_id.eq.${viewerId},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${viewerId})`)
    .eq('status', 'accepted')
    .single()

  return !!data
}
