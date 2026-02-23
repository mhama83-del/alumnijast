'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string
  batch_year: number
  location_state: string | null
  industry: string | null
  job_title: string | null
  status: string
}

interface Batch {
  batch_year: number
  name: string
}

export default function DirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  
  const [filters, setFilters] = useState({
    search: '',
    batch_year: '',
    industry: '',
    location_state: '',
  })
  
  const [page, setPage] = useState(0)
  const pageSize = 20
  
  const supabase = createClient()

  useEffect(() => {
    loadCurrentUser()
    loadBatches()
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [filters, page])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  const loadBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('*')
      .order('batch_year', { ascending: false })
    
    if (data) setBatches(data)
  }

  const loadProfiles = async () => {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .order('full_name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (filters.search) {
      query = query.ilike('full_name', `%${filters.search}%`)
    }
    
    if (filters.batch_year) {
      query = query.eq('batch_year', parseInt(filters.batch_year))
    }
    
    if (filters.industry) {
      query = query.ilike('industry', `%${filters.industry}%`)
    }
    
    if (filters.location_state) {
      query = query.ilike('location_state', `%${filters.location_state}%`)
    }

    const { data } = await query
    
    if (data) setProfiles(data)
    setLoading(false)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alumni Directory</h1>
        <p className="text-gray-600 mt-2">
          Connect with SKMASAF alumni across all batches
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Name
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by name..."
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Year
            </label>
            <select
              value={filters.batch_year}
              onChange={(e) => handleFilterChange('batch_year', e.target.value)}
              className="input"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.batch_year} value={batch.batch_year}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={filters.industry}
              onChange={(e) => handleFilterChange('industry', e.target.value)}
              placeholder="e.g. Technology"
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={filters.location_state}
              onChange={(e) => handleFilterChange('location_state', e.target.value)}
              placeholder="e.g. California"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-gray-600 mt-2">Loading alumni...</p>
        </div>
      ) : profiles.length > 0 ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Link key={profile.id} href={`/directory/${profile.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {profile.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Batch {profile.batch_year}
                      </p>
                      {profile.job_title && (
                        <p className="text-sm text-gray-700 mt-1 truncate">
                          {profile.job_title}
                        </p>
                      )}
                      {profile.industry && (
                        <p className="text-xs text-gray-500 mt-1">
                          {profile.industry}
                        </p>
                      )}
                      {profile.location_state && (
                        <p className="text-xs text-gray-500">
                          📍 {profile.location_state}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={profiles.length < pageSize}
              className="btn btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600">No alumni found matching your criteria</p>
        </div>
      )}
    </div>
  )
}
