'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Batch {
  batch_year: number
  name: string
  description: string | null
}

interface Profile {
  id: string
  full_name: string
  job_title: string | null
  industry: string | null
  location_state: string | null
}

interface Event {
  id: string
  title: string
  start_at: string
  location: string | null
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  creator?: {
    full_name: string
  }
}

export default function BatchPage() {
  const params = useParams()
  const batchYear = parseInt(params.year as string)
  
  const [batch, setBatch] = useState<Batch | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'events' | 'announcements'>('members')
  const supabase = createClient()

  useEffect(() => {
    loadBatchData()
  }, [batchYear])

  const loadBatchData = async () => {
    setLoading(true)

    // Load batch info
    const { data: batchData } = await supabase
      .from('batches')
      .select('*')
      .eq('batch_year', batchYear)
      .single()

    if (batchData) setBatch(batchData)

    // Load members
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, full_name, job_title, industry, location_state')
      .eq('batch_year', batchYear)
      .eq('status', 'approved')
      .order('full_name')

    if (membersData) setMembers(membersData)

    // Load batch events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, start_at, location')
      .eq('batch_year', batchYear)
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(10)

    if (eventsData) setEvents(eventsData)

    // Load batch announcements
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select(`
        *,
        creator:profiles!announcements_created_by_fkey(full_name)
      `)
      .eq('batch_year', batchYear)
      .order('created_at', { ascending: false })
      .limit(10)

    if (announcementsData) setAnnouncements(announcementsData)

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">Batch not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900">{batch.name}</h1>
        {batch.description && (
          <p className="text-gray-600 mt-2">{batch.description}</p>
        )}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
          <span>👥 {members.length} Members</span>
          <span>📅 {events.length} Upcoming Events</span>
          <span>📢 {announcements.length} Recent Announcements</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Announcements
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'members' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <Link key={member.id} href={`/directory/${member.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.full_name}
                      </h3>
                      {member.job_title && (
                        <p className="text-sm text-gray-600 truncate">{member.job_title}</p>
                      )}
                      {member.industry && (
                        <p className="text-xs text-gray-500">{member.industry}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {events.length > 0 ? (
              events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-sm text-gray-600">
                      📅 {new Date(event.start_at).toLocaleDateString()} at {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600">📍 {event.location}</p>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No upcoming events</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div key={announcement.id} className="card">
                  <h3 className="font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                  <p className="text-gray-700 text-sm mb-2">{announcement.content}</p>
                  <div className="text-xs text-gray-500">
                    By {announcement.creator?.full_name} • {new Date(announcement.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No announcements</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
