'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface Connection {
  id: string
  requester_id: string
  receiver_id: string
  status: string
  created_at: string
  requester?: {
    id: string
    full_name: string
    batch_year: number
    job_title: string | null
  }
  receiver?: {
    id: string
    full_name: string
    batch_year: number
    job_title: string | null
  }
}

export default function ConnectionsPage() {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [incoming, setIncoming] = useState<Connection[]>([])
  const [sent, setSent] = useState<Connection[]>([])
  const [connected, setConnected] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'connected' | 'incoming' | 'sent'>('connected')
  const supabase = createClient()

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // Incoming requests
    const { data: incomingData } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name, batch_year, job_title)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (incomingData) setIncoming(incomingData)

    // Sent requests
    const { data: sentData } = await supabase
      .from('connections')
      .select(`
        *,
        receiver:profiles!connections_receiver_id_fkey(id, full_name, batch_year, job_title)
      `)
      .eq('requester_id', user.id)
      .eq('status', 'pending')

    if (sentData) setSent(sentData)

    // Accepted connections
    const { data: connectedData } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name, batch_year, job_title),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, batch_year, job_title)
      `)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (connectedData) setConnected(connectedData)

    setLoading(false)
  }

  const handleAccept = async (connectionId: string) => {
    await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
    
    loadConnections()
  }

  const handleReject = async (connectionId: string) => {
    await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId)
    
    loadConnections()
  }

  const handleCancel = async (connectionId: string) => {
    await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
    
    loadConnections()
  }

  const renderConnection = (conn: Connection, type: 'incoming' | 'sent' | 'connected') => {
    const otherUser = type === 'sent' ? conn.receiver : conn.requester
    if (!otherUser) return null

    return (
      <div key={conn.id} className="card flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold">
            {otherUser.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{otherUser.full_name}</h3>
            <p className="text-sm text-gray-600">Batch {otherUser.batch_year}</p>
            {otherUser.job_title && (
              <p className="text-sm text-gray-500">{otherUser.job_title}</p>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          {type === 'incoming' && (
            <>
              <button onClick={() => handleAccept(conn.id)} className="btn btn-primary text-sm">
                Accept
              </button>
              <button onClick={() => handleReject(conn.id)} className="btn btn-secondary text-sm">
                Reject
              </button>
            </>
          )}
          
          {type === 'sent' && (
            <button onClick={() => handleCancel(conn.id)} className="btn btn-secondary text-sm">
              Cancel
            </button>
          )}
          
          {type === 'connected' && (
            <a href={`/directory/${otherUser.id}`} className="btn btn-secondary text-sm">
              View Profile
            </a>
          )}
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold text-gray-900">My Connections</h1>
        <p className="text-gray-600 mt-2">
          Manage your alumni network
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('connected')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'connected'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Connected ({connected.length})
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'incoming'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Incoming ({incoming.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sent'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sent ({sent.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'connected' && (
          <>
            {connected.length > 0 ? (
              connected.map((conn) => renderConnection(conn, 'connected'))
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No connections yet. Start by browsing the directory!</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'incoming' && (
          <>
            {incoming.length > 0 ? (
              incoming.map((conn) => renderConnection(conn, 'incoming'))
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No incoming requests</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {sent.length > 0 ? (
              sent.map((conn) => renderConnection(conn, 'sent'))
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No pending requests</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
