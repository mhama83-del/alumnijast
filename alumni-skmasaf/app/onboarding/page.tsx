'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Batch {
  batch_year: number
  name: string
}

export default function OnboardingPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    full_name: '',
    batch_year: '',
    location_state: '',
    industry: '',
    job_title: '',
    phone: '',
  })

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('*')
      .order('batch_year', { ascending: false })
    
    if (data) setBatches(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: formData.full_name,
      batch_year: parseInt(formData.batch_year),
      location_state: formData.location_state || null,
      industry: formData.industry || null,
      job_title: formData.job_title || null,
      phone: formData.phone || null,
      status: 'pending',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/home')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Alumni SKMASAF!
          </h1>
          <p className="text-gray-600">
            Complete your profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Year *
            </label>
            <select
              required
              value={formData.batch_year}
              onChange={(e) => setFormData({ ...formData, batch_year: e.target.value })}
              className="input"
            >
              <option value="">Select your batch</option>
              {batches.map((batch) => (
                <option key={batch.batch_year} value={batch.batch_year}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (State)
            </label>
            <input
              type="text"
              value={formData.location_state}
              onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
              className="input"
              placeholder="California"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="input"
              placeholder="Technology, Finance, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="input"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+1234567890"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your profile will be pending approval. Once approved by an admin, you'll be able to access all features and connect with other alumni.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
