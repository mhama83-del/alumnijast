import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import Link from 'next/link'

export default async function HomePage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  // Get global and user's batch announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      *,
      creator:profiles!announcements_created_by_fkey(full_name)
    `)
    .or(`batch_year.is.null,batch_year.eq.${profile?.batch_year}`)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get upcoming events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .or(`batch_year.is.null,batch_year.eq.${profile?.batch_year}`)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Batch {profile?.batch_year} • {profile?.status === 'approved' ? 'Active Member' : 'Pending Approval'}
        </p>
      </div>

      {profile?.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-1">Profile Pending Approval</h3>
          <p className="text-sm text-yellow-800">
            Your profile is awaiting approval from an administrator. Once approved, you'll have full access to all features including the alumni directory and networking capabilities.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Announcements */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          </div>
          
          <div className="space-y-4">
            {announcements && announcements.length > 0 ? (
              announcements.map((announcement: any) => (
                <div key={announcement.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                    {announcement.batch_year && (
                      <span className="badge bg-blue-100 text-blue-800">
                        Batch {announcement.batch_year}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{announcement.content}</p>
                  <div className="text-xs text-gray-500">
                    By {announcement.creator?.full_name} • {new Date(announcement.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="card text-center text-gray-500">
                <p>No announcements yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
            <Link href="/events" className="text-sm text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            {events && events.length > 0 ? (
              events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
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
                    <p className="text-sm text-gray-600 mb-2">
                      📅 {new Date(event.start_at).toLocaleDateString()} at {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600">📍 {event.location}</p>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="card text-center text-gray-500">
                <p>No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/directory" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900">Browse Directory</h3>
            <p className="text-sm text-gray-600 mt-1">Connect with alumni</p>
          </div>
        </Link>
        
        <Link href="/connections" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">🤝</div>
            <h3 className="font-semibold text-gray-900">My Connections</h3>
            <p className="text-sm text-gray-600 mt-1">View your network</p>
          </div>
        </Link>
        
        <Link href={`/batch/${profile?.batch_year}`} className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">🎓</div>
            <h3 className="font-semibold text-gray-900">My Batch</h3>
            <p className="text-sm text-gray-600 mt-1">Batch {profile?.batch_year}</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
