'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface BatchRole {
  batch_year: number
  batch?: {
    name: string
  }
}

interface Event {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  quota: number | null
  batch_year: number
}

interface Announcement {
  id: string
  title: string
  content: string
  batch_year: number
  created_at: string
}

export default function BatchAdminPage() {
  const [batchRoles, setBatchRoles] = useState<BatchRole[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'announcements'>('events')
  const [showEventForm, setShowEventForm] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    batch_year: '',
    start_at: '',
    end_at: '',
    location: '',
    quota: '',
  })

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    batch_year: '',
  })

  const supabase = createClient()

  useEffect(() => {
    loadBatchAdminData()
  }, [])

  const loadBatchAdminData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load batch roles
    const { data: rolesData } = await supabase
      .from('batch_roles')
      .select('batch_year, batch:batches(name)')
      .eq('user_id', user.id)

    if (rolesData) {
      setBatchRoles(rolesData)
      
      // Set default batch year for forms
      if (rolesData.length > 0) {
        setEventForm(prev => ({ ...prev, batch_year: rolesData[0].batch_year.toString() }))
        setAnnouncementForm(prev => ({ ...prev, batch_year: rolesData[0].batch_year.toString() }))
      }

      // Load events for managed batches
      const batchYears = rolesData.map(r => r.batch_year)
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .in('batch_year', batchYears)
        .order('start_at', { ascending: false })

      if (eventsData) setEvents(eventsData)

      // Load announcements for managed batches
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .in('batch_year', batchYears)
        .order('created_at', { ascending: false })

      if (announcementsData) setAnnouncements(announcementsData)
    }

    setLoading(false)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('events').insert({
      title: eventForm.title,
      description: eventForm.description || null,
      batch_year: parseInt(eventForm.batch_year),
      start_at: eventForm.start_at,
      end_at: eventForm.end_at || null,
      location: eventForm.location || null,
      quota: eventForm.quota ? parseInt(eventForm.quota) : null,
      created_by: user.id,
    })

    if (!error) {
      setShowEventForm(false)
      setEventForm({
        title: '',
        description: '',
        batch_year: batchRoles[0]?.batch_year.toString() || '',
        start_at: '',
        end_at: '',
        location: '',
        quota: '',
      })
      loadBatchAdminData()
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('announcements').insert({
      title: announcementForm.title,
      content: announcementForm.content,
      batch_year: parseInt(announcementForm.batch_year),
      created_by: user.id,
    })

    if (!error) {
      setShowAnnouncementForm(false)
      setAnnouncementForm({
        title: '',
        content: '',
        batch_year: batchRoles[0]?.batch_year.toString() || '',
      })
      loadBatchAdminData()
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return
    
    await supabase.from('events').delete().eq('id', eventId)
    loadBatchAdminData()
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Delete this announcement?')) return
    
    await supabase.from('announcements').delete().eq('id', announcementId)
    loadBatchAdminData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (batchRoles.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">You are not assigned as a batch admin</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Batch Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Managing: {batchRoles.map(r => `Batch ${r.batch_year}`).join(', ')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Announcements
          </button>
        </nav>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="btn btn-primary"
          >
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>

          {showEventForm && (
            <form onSubmit={handleCreateEvent} className="card space-y-4">
              <h3 className="text-lg font-semibold">Create New Event</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  required
                  value={eventForm.batch_year}
                  onChange={(e) => setEventForm({ ...eventForm, batch_year: e.target.value })}
                  className="input"
                >
                  {batchRoles.map((role) => (
                    <option key={role.batch_year} value={role.batch_year}>
                      Batch {role.batch_year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.start_at}
                    onChange={(e) => setEventForm({ ...eventForm, start_at: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_at}
                    onChange={(e) => setEventForm({ ...eventForm, end_at: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quota (Max Attendees)</label>
                <input
                  type="number"
                  value={eventForm.quota}
                  onChange={(e) => setEventForm({ ...eventForm, quota: e.target.value })}
                  className="input"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">Create Event</button>
            </form>
          )}

          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className="badge bg-blue-100 text-blue-800 mt-1">
                      Batch {event.batch_year}
                    </span>
                    {event.description && <p className="text-gray-700 text-sm mt-2">{event.description}</p>}
                    <p className="text-sm text-gray-600 mt-2">
                      📅 {new Date(event.start_at).toLocaleString()}
                    </p>
                    {event.location && <p className="text-sm text-gray-600">📍 {event.location}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="btn btn-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
            className="btn btn-primary"
          >
            {showAnnouncementForm ? 'Cancel' : 'Create Announcement'}
          </button>

          {showAnnouncementForm && (
            <form onSubmit={handleCreateAnnouncement} className="card space-y-4">
              <h3 className="text-lg font-semibold">Create New Announcement</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  required
                  value={announcementForm.batch_year}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, batch_year: e.target.value })}
                  className="input"
                >
                  {batchRoles.map((role) => (
                    <option key={role.batch_year} value={role.batch_year}>
                      Batch {role.batch_year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  required
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">Create Announcement</button>
            </form>
          )}

          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                    <span className="badge bg-blue-100 text-blue-800 mt-1">
                      Batch {announcement.batch_year}
                    </span>
                    <p className="text-gray-700 text-sm mt-2">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="btn btn-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
