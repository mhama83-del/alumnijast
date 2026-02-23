export type UserStatus = 'pending' | 'approved' | 'suspended'
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'
export type RsvpStatus = 'yes' | 'no' | 'maybe' | 'waitlist'

export interface Profile {
  id: string
  full_name: string
  batch_year: number
  location_state: string | null
  industry: string | null
  job_title: string | null
  phone: string | null
  email_public: boolean
  phone_public: boolean
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface Batch {
  batch_year: number
  name: string
  description: string | null
  created_at: string
}

export interface Connection {
  id: string
  requester_id: string
  receiver_id: string
  status: ConnectionStatus
  created_at: string
  updated_at: string
  requester?: Profile
  receiver?: Profile
}

export interface Event {
  id: string
  title: string
  description: string | null
  batch_year: number | null
  start_at: string
  end_at: string | null
  location: string | null
  quota: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Rsvp {
  id: string
  event_id: string
  user_id: string
  status: RsvpStatus
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  batch_year: number | null
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
}

export interface BatchRole {
  id: string
  user_id: string
  batch_year: number
  role: 'batch_admin'
  created_at: string
}

export interface CentralAdmin {
  id: string
  user_id: string
  created_at: string
}
