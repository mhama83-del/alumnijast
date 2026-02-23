'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface Profile {
  id: string
  full_name: string
  batch_year: number
  email: string
  industry: string | null
  status: string
  created_at: string
}

interface Batch {
  batch_year: number
  name: string
}

export default function AdminPage() {
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'batches' | 'admins'>('pending')
  
  // State for batch admin assignment
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBatchYear, setSelectedBatchYear] = useState('')
  
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    loadData()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('central_admins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      window.location.href = '/home'
    }
  }

  const loadData = async () => {
    setLoading(true)

    // Load pending profiles with email
    const { data: pendingData } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingData) {
      // Get emails from auth.users
      const profilesWithEmail = await Promise.all(
        pendingData.map(async (profile) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: user?.email || 'N/A'
          }
        })
      )
      setPendingProfiles(profilesWithEmail)
    }

    // Load all profiles
    const { data: allData } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')

    if (allData) {
      const profilesWithEmail = await Promise.all(
        allData.map(async (profile) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: user?.email || 'N/A'
          }
        })
      )
      setAllProfiles(profilesWithEmail)
    }

    // Load batches
    const { data: batchData } = await supabase
      .from('batches')
      .select('*')
      .order('batch_year', { ascending: false })

    if (batchData) setBatches(batchData)

    setLoading(false)
  }

  const handleApprove = async (profileId: string) => {
    await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', profileId)
    
    loadData()
  }

  const handleSuspend = async (profileId: string) => {
    await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', profileId)
    
    loadData()
  }

  const handleReactivate = async (profileId: string) => {
    await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', profileId)
    
    loadData()
  }

  const handleAssignBatchAdmin = async () => {
    if (!selectedUserId || !selectedBatchYear) return

    const { error } = await supabase.from('batch_roles').insert({
      user_id: selectedUserId,
      batch_year: parseInt(selectedBatchYear),
      role: 'batch_admin',
    })

    if (!error) {
      setSelectedUserId('')
      setSelectedBatchYear('')
      alert('Batch admin assigned successfully!')
    } else {
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage alumni profiles and system settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approvals ({pendingProfiles.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Members
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admins'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Assign Batch Admin
          </button>
        </nav>
      </div>

      {/* Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingProfiles.length > 0 ? (
            pendingProfiles.map((profile) => (
              <div key={profile.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile.full_name}</h3>
                    <p className="text-sm text-gray-600">Batch {profile.batch_year}</p>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                    {profile.industry && (
                      <p className="text-sm text-gray-500">{profile.industry}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Applied: {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(profile.id)}
                      className="btn btn-primary text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleSuspend(profile.id)}
                      className="btn btn-danger text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-600">No pending approvals</p>
            </div>
          )}
        </div>
      )}

      {/* All Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {allProfiles.map((profile) => (
            <div key={profile.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{profile.full_name}</h3>
                    <span className={`badge ${
                      profile.status === 'approved' ? 'badge-approved' :
                      profile.status === 'pending' ? 'badge-pending' :
                      'badge-suspended'
                    }`}>
                      {profile.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Batch {profile.batch_year}</p>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
                <div className="flex space-x-2">
                  {profile.status === 'approved' && (
                    <button
                      onClick={() => handleSuspend(profile.id)}
                      className="btn btn-danger text-sm"
                    >
                      Suspend
                    </button>
                  )}
                  {profile.status === 'suspended' && (
                    <button
                      onClick={() => handleReactivate(profile.id)}
                      className="btn btn-primary text-sm"
                    >
                      Reactivate
                    </button>
                  )}
                  {profile.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(profile.id)}
                      className="btn btn-primary text-sm"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Batch Admin */}
      {activeTab === 'admins' && (
        <div className="card max-w-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Batch Admin</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input"
              >
                <option value="">Choose a user...</option>
                {allProfiles
                  .filter(p => p.status === 'approved')
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name} - Batch {profile.batch_year}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Batch
              </label>
              <select
                value={selectedBatchYear}
                onChange={(e) => setSelectedBatchYear(e.target.value)}
                className="input"
              >
                <option value="">Choose a batch...</option>
                {batches.map((batch) => (
                  <option key={batch.batch_year} value={batch.batch_year}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAssignBatchAdmin}
              disabled={!selectedUserId || !selectedBatchYear}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              Assign Batch Admin
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
