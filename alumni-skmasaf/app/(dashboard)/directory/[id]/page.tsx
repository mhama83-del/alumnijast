'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
  batch_year: number
  location_state: string | null
  industry: string | null
  job_title: string | null
  phone: string | null
  email_public: boolean
  phone_public: boolean
  status: string
}

interface Connection {
  id: string
  status: string
}

export default function ProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [connection, setConnection] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)
    setUserEmail(user.email || '')

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (profileData) {
      setProfile(profileData)
    }

    // Load connection status
    const { data: connData } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${user.id},receiver_id.eq.${params.id}),and(requester_id.eq.${params.id},receiver_id.eq.${user.id})`)
      .single()

    if (connData) {
      setConnection(connData)
    }

    setLoading(false)
  }

  const handleConnect = async () => {
    if (!currentUserId || !profile) return

    const { error } = await supabase.from('connections').insert({
      requester_id: currentUserId,
      receiver_id: profile.id,
      status: 'pending',
    })

    if (!error) {
      loadData()
    }
  }

  const handleCancelRequest = async () => {
    if (!connection) return

    await supabase.from('connections').delete().eq('id', connection.id)
    setConnection(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">Profile not found</p>
      </div>
    )
  }

  const isOwnProfile = currentUserId === profile.id
  const isConnected = connection?.status === 'accepted'
  const canViewContact = isOwnProfile || isConnected

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-primary hover:underline">
        ← Back to Directory
      </button>

      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center font-bold text-3xl flex-shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
            <p className="text-lg text-gray-600 mt-1">Batch {profile.batch_year}</p>
            
            {profile.job_title && (
              <p className="text-gray-800 mt-2">{profile.job_title}</p>
            )}
            
            {profile.industry && (
              <p className="text-gray-600 mt-1">Industry: {profile.industry}</p>
            )}
            
            {profile.location_state && (
              <p className="text-gray-600 mt-1">📍 {profile.location_state}</p>
            )}
          </div>
        </div>

        {!isOwnProfile && (
          <div className="mt-6 pt-6 border-t">
            {!connection && (
              <button onClick={handleConnect} className="btn btn-primary">
                Connect
              </button>
            )}
            
            {connection?.status === 'pending' && connection.requester_id === currentUserId && (
              <div className="flex items-center space-x-4">
                <span className="badge badge-pending">Connection Pending</span>
                <button onClick={handleCancelRequest} className="text-sm text-red-600 hover:underline">
                  Cancel Request
                </button>
              </div>
            )}
            
            {connection?.status === 'pending' && connection.requester_id !== currentUserId && (
              <span className="badge badge-pending">Pending Your Response</span>
            )}
            
            {connection?.status === 'accepted' && (
              <span className="badge badge-approved">✓ Connected</span>
            )}
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
        
        {canViewContact ? (
          <div className="space-y-3">
            {(isOwnProfile || profile.email_public) && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{isOwnProfile ? userEmail : (profile.email_public ? userEmail : 'Hidden')}</p>
              </div>
            )}
            
            {profile.phone && (isOwnProfile || (isConnected && profile.phone_public)) && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{profile.phone}</p>
              </div>
            )}
            
            {!isOwnProfile && !isConnected && (
              <p className="text-sm text-gray-500 italic">
                Connect with {profile.full_name.split(' ')[0]} to view contact details
              </p>
            )}
            
            {!isOwnProfile && isConnected && !profile.email_public && !profile.phone_public && (
              <p className="text-sm text-gray-500 italic">
                Contact information is private
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Connect with {profile.full_name.split(' ')[0]} to view contact information
          </p>
        )}
      </div>
    </div>
  )
}
