'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  description: string | null
  batch_year: number | null
  start_at: string
  end_at: string | null
  location: string | null
  quota: number | null
  created_at: string
}

interface Rsvp {
  event_id: string
  status: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [rsvps, setRsvps] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [filter])

  const loadEvents = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('batch_year')
      .eq('id', user.id)
      .single()

    if (!profile) return

    let query = supabase
      .from('events')
      .select('*')
      .or(`batch_year.is.null,batch_year.eq.${profile.batch_year}`)
      .order('start_at', { ascending: true })

    const now = new Date().toISOString()

    if (filter === 'upcoming') {
      query = query.gte('start_at', now)
    } else if (filter === 'past') {
      query = query.lt('start_at', now)
    }

    const { data: eventsData } = await query

    if (eventsData) {
      setEvents(eventsData)
      
      // Load RSVPs
      const eventIds = eventsData.map(e => e.id)
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds)

      if (rsvpData) {
        const rsvpMap: Record<string, string> = {}
        rsvpData.forEach((r: Rsvp) => {
          rsvpMap[r.event_id] = r.status
        })
        setRsvps(rsvpMap)
      }
    }

    setLoading(false)
  }

  const handleRsvp = async (eventId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('rsvps')
      .upsert({
        event_id: eventId,
        user_id: user.id,
        status,
      })

    if (!error) {
      setRsvps({ ...rsvps, [eventId]: status })
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
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <p className="text-gray-600 mt-2">
          Discover and RSVP to alumni events
        </p>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All Events
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`btn ${filter === 'past' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Past
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                    {event.batch_year ? (
                      <span className="badge bg-blue-100 text-blue-800">
                        Batch {event.batch_year}
                      </span>
                    ) : (
                      <span className="badge bg-green-100 text-green-800">
                        All Batches
                      </span>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-gray-700 mb-3">{event.description}</p>
                  )}
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 {new Date(event.start_at).toLocaleDateString()} at {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {event.location && <p>📍 {event.location}</p>}
                    {event.quota && <p>👥 Limited to {event.quota} attendees</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t">
                <span className="text-sm text-gray-600 mr-2">Your RSVP:</span>
                {['yes', 'no', 'maybe'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleRsvp(event.id, status)}
                    className={`btn text-sm ${
                      rsvps[event.id] === status ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {status === 'yes' && '✓ Going'}
                    {status === 'no' && '✗ Not Going'}
                    {status === 'maybe' && '? Maybe'}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">No events found</p>
          </div>
        )}
      </div>
    </div>
  )
}
