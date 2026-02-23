-- ========================================
-- ALUMNI SKMASAF NETWORK - DATABASE SCHEMA
-- ========================================
-- Single-school alumni community system
-- with batch-based organization
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE user_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE rsvp_status AS ENUM ('yes', 'no', 'maybe', 'waitlist');
CREATE TYPE batch_role_type AS ENUM ('batch_admin');

-- ========================================
-- TABLES
-- ========================================

-- Batches (sub-communities)
CREATE TABLE batches (
    batch_year INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alumni Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    batch_year INTEGER NOT NULL REFERENCES batches(batch_year),
    location_state TEXT,
    industry TEXT,
    job_title TEXT,
    phone TEXT,
    email_public BOOLEAN DEFAULT FALSE,
    phone_public BOOLEAN DEFAULT FALSE,
    status user_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch Roles (Batch Admins)
CREATE TABLE batch_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    batch_year INTEGER NOT NULL REFERENCES batches(batch_year),
    role batch_role_type NOT NULL DEFAULT 'batch_admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, batch_year)
);

-- Central Admins (stored separately for clarity)
CREATE TABLE central_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alumni Connections
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status connection_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id),
    CHECK (requester_id != receiver_id)
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    batch_year INTEGER REFERENCES batches(batch_year),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location TEXT,
    quota INTEGER,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status rsvp_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    batch_year INTEGER REFERENCES batches(batch_year),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX idx_profiles_batch_year ON profiles(batch_year);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_events_batch_year ON events(batch_year);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_announcements_batch_year ON announcements(batch_year);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_batch_roles_user ON batch_roles(user_id);
CREATE INDEX idx_batch_roles_batch ON batch_roles(batch_year);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to check if user is central admin
CREATE OR REPLACE FUNCTION is_central_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM central_admins WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is batch admin for specific batch
CREATE OR REPLACE FUNCTION is_batch_admin(user_uuid UUID, batch INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM batch_roles 
        WHERE user_id = user_uuid AND batch_year = batch
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are connected
CREATE OR REPLACE FUNCTION are_connected(user1 UUID, user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM connections 
        WHERE ((requester_id = user1 AND receiver_id = user2) 
            OR (requester_id = user2 AND receiver_id = user1))
        AND status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ========================================
-- BATCHES POLICIES
-- ========================================

CREATE POLICY "Batches are viewable by everyone"
    ON batches FOR SELECT
    USING (true);

CREATE POLICY "Only central admins can insert batches"
    ON batches FOR INSERT
    WITH CHECK (is_central_admin(auth.uid()));

CREATE POLICY "Only central admins can update batches"
    ON batches FOR UPDATE
    USING (is_central_admin(auth.uid()));

CREATE POLICY "Only central admins can delete batches"
    ON batches FOR DELETE
    USING (is_central_admin(auth.uid()));

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view only approved profiles (or their own)
CREATE POLICY "Users can view approved profiles or their own"
    ON profiles FOR SELECT
    USING (
        status = 'approved' 
        OR id = auth.uid() 
        OR is_central_admin(auth.uid())
    );

-- Users can insert their own profile
CREATE POLICY "Users can create their own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update their own profile (except status)
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND (
            -- User cannot change their own status
            status = (SELECT status FROM profiles WHERE id = auth.uid())
            OR is_central_admin(auth.uid())
        )
    );

-- Central admins can update any profile
CREATE POLICY "Central admins can update any profile"
    ON profiles FOR UPDATE
    USING (is_central_admin(auth.uid()));

-- ========================================
-- BATCH ROLES POLICIES
-- ========================================

CREATE POLICY "Batch roles are viewable by authenticated users"
    ON batch_roles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only central admins can manage batch roles"
    ON batch_roles FOR ALL
    USING (is_central_admin(auth.uid()))
    WITH CHECK (is_central_admin(auth.uid()));

-- ========================================
-- CENTRAL ADMINS POLICIES
-- ========================================

CREATE POLICY "Central admins list is viewable by authenticated users"
    ON central_admins FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only central admins can manage central admins"
    ON central_admins FOR ALL
    USING (is_central_admin(auth.uid()))
    WITH CHECK (is_central_admin(auth.uid()));

-- ========================================
-- CONNECTIONS POLICIES
-- ========================================

-- Users can view connections they are part of
CREATE POLICY "Users can view their own connections"
    ON connections FOR SELECT
    USING (
        requester_id = auth.uid() 
        OR receiver_id = auth.uid()
    );

-- Users can send connection requests to approved alumni
CREATE POLICY "Users can send connection requests"
    ON connections FOR INSERT
    WITH CHECK (
        requester_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = receiver_id AND status = 'approved'
        )
    );

-- Users can update connections where they are the receiver
CREATE POLICY "Receivers can update connection status"
    ON connections FOR UPDATE
    USING (receiver_id = auth.uid())
    WITH CHECK (receiver_id = auth.uid());

-- Users can delete connections they created
CREATE POLICY "Users can delete their own connection requests"
    ON connections FOR DELETE
    USING (requester_id = auth.uid());

-- ========================================
-- EVENTS POLICIES
-- ========================================

-- Users can view:
-- 1. Global events (batch_year IS NULL)
-- 2. Events for their own batch
-- 3. All events if they are central admin
CREATE POLICY "Users can view relevant events"
    ON events FOR SELECT
    USING (
        batch_year IS NULL 
        OR batch_year = (SELECT batch_year FROM profiles WHERE id = auth.uid())
        OR is_central_admin(auth.uid())
        OR is_batch_admin(auth.uid(), batch_year)
    );

-- Central admins can create any event
CREATE POLICY "Central admins can create any event"
    ON events FOR INSERT
    WITH CHECK (
        is_central_admin(auth.uid())
        OR (
            batch_year IS NOT NULL 
            AND is_batch_admin(auth.uid(), batch_year)
        )
    );

-- Batch admins can create events for their batch
-- Central admins can update any event
CREATE POLICY "Admins can update events"
    ON events FOR UPDATE
    USING (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    )
    WITH CHECK (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    );

-- Admins can delete events they manage
CREATE POLICY "Admins can delete events"
    ON events FOR DELETE
    USING (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    );

-- ========================================
-- RSVPS POLICIES
-- ========================================

-- Users can view RSVPs for events they can see
CREATE POLICY "Users can view RSVPs for accessible events"
    ON rsvps FOR SELECT
    USING (
        -- User can see their own RSVP
        user_id = auth.uid()
        OR
        -- Central admin can see all
        is_central_admin(auth.uid())
        OR
        -- Batch admin can see RSVPs for their batch events
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_id 
            AND e.batch_year IS NOT NULL
            AND is_batch_admin(auth.uid(), e.batch_year)
        )
    );

-- Users can create RSVP for events they can access
CREATE POLICY "Users can create their own RSVPs"
    ON rsvps FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND (
                e.batch_year IS NULL
                OR e.batch_year = (SELECT batch_year FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
    ON rsvps FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete their own RSVPs"
    ON rsvps FOR DELETE
    USING (user_id = auth.uid());

-- ========================================
-- ANNOUNCEMENTS POLICIES
-- ========================================

-- Users can view:
-- 1. Global announcements (batch_year IS NULL)
-- 2. Announcements for their own batch
-- 3. All if central admin
CREATE POLICY "Users can view relevant announcements"
    ON announcements FOR SELECT
    USING (
        batch_year IS NULL 
        OR batch_year = (SELECT batch_year FROM profiles WHERE id = auth.uid())
        OR is_central_admin(auth.uid())
        OR is_batch_admin(auth.uid(), batch_year)
    );

-- Central admins can create any announcement
-- Batch admins can create announcements for their batch
CREATE POLICY "Admins can create announcements"
    ON announcements FOR INSERT
    WITH CHECK (
        is_central_admin(auth.uid())
        OR (
            batch_year IS NOT NULL 
            AND is_batch_admin(auth.uid(), batch_year)
        )
    );

-- Admins can update their announcements
CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    USING (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    )
    WITH CHECK (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    );

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    USING (
        is_central_admin(auth.uid())
        OR (batch_year IS NOT NULL AND is_batch_admin(auth.uid(), batch_year))
    );

-- ========================================
-- SEED DATA (SAMPLE BATCHES)
-- ========================================

INSERT INTO batches (batch_year, name, description) VALUES
(2000, 'Batch 2000', 'Millennium Batch'),
(2005, 'Batch 2005', ''),
(2010, 'Batch 2010', ''),
(2015, 'Batch 2015', ''),
(2020, 'Batch 2020', ''),
(2024, 'Batch 2024', 'Latest Batch');

-- ========================================
-- NOTES
-- ========================================
-- 
-- To create the first central admin:
-- 1. User signs up via Google OAuth or email
-- 2. Run this SQL manually in Supabase SQL Editor:
--    INSERT INTO central_admins (user_id) 
--    VALUES ('user-uuid-here');
--
-- Contact visibility is enforced by RLS + app logic:
-- - Phone/email fields are returned only if:
--   a) Viewer is profile owner, OR
--   b) are_connected() returns true AND phone_public/email_public = true
--
-- ========================================
