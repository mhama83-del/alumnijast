import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, isCentralAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  const isAdmin = await isCentralAdmin()
  const supabase = await createClient()
  
  const { data: batchRoles } = await supabase
    .from('batch_roles')
    .select('*')
    .eq('user_id', profile.id)

  const isBatchAdmin = batchRoles && batchRoles.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/home" className="text-xl font-bold text-primary">
                SKMASAF Alumni
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <Link href="/home" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link href="/directory" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Directory
                </Link>
                <Link href="/events" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Events
                </Link>
                <Link href="/connections" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Connections
                </Link>
                <Link href={`/batch/${profile.batch_year}`} className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  My Batch
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {profile.status === 'pending' && (
                <span className="badge badge-pending">
                  Pending Approval
                </span>
              )}
              
              {(isAdmin || isBatchAdmin) && (
                <div className="flex space-x-2">
                  {isAdmin && (
                    <Link href="/admin" className="text-sm text-primary font-medium hover:underline">
                      Admin Panel
                    </Link>
                  )}
                  {isBatchAdmin && (
                    <Link href="/batch-admin" className="text-sm text-primary font-medium hover:underline">
                      Batch Admin
                    </Link>
                  )}
                </div>
              )}
              
              <Link href="/profile" className="text-gray-700 hover:text-primary">
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              </Link>
              
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
