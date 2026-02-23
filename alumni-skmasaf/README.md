# Alumni SKMASAF Network

A production-ready web application for SKMASAF school alumni community. This single-school system organizes alumni by batches, allowing cross-batch networking, events, and announcements.

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (React, App Router, TypeScript)
- **Backend & Auth:** Supabase (PostgreSQL + Auth)
- **Styling:** Tailwind CSS
- **Authentication:** Google OAuth + Email Magic Link

## 👥 User Roles

1. **Alumni** - Default role for registered users
2. **Batch Admin** - Manages a specific batch (events, announcements)
3. **Central Admin** - School-wide administrator

## ✨ Key Features

### For Alumni
- **Profile Management** - Create and edit personal profiles
- **Directory** - Browse and filter alumni across all batches
- **Networking** - Send/accept connection requests
- **Privacy Controls** - Manage visibility of contact information
- **Events** - View and RSVP to global and batch-specific events
- **Batch Pages** - Dedicated pages for each batch with members, events, and announcements

### For Batch Admins
- Create/manage events for their batch
- Post announcements for their batch
- View RSVP lists for batch events

### For Central Admins
- Approve/suspend alumni accounts
- Assign batch administrators
- Create global events and announcements
- Manage all batches

## 🗄️ Database Schema

### Core Tables
- `batches` - Batch definitions (year, name, description)
- `profiles` - Extended user profiles with batch affiliation
- `batch_roles` - Batch admin assignments
- `central_admins` - Central admin assignments
- `connections` - Alumni network connections
- `events` - Events (global or batch-specific)
- `rsvps` - Event attendance tracking
- `announcements` - Announcements (global or batch-specific)

### Security Features
- **Row Level Security (RLS)** enforced on all tables
- **Contact Privacy** - Phone/email visible only to:
  - Profile owner, OR
  - Accepted connections (if privacy toggle enabled)
- **Status-based Access** - Only approved profiles visible in directory

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))

### Step 1: Clone and Install

```bash
# Navigate to project folder
cd alumni-skmasaf

# Install dependencies
npm install
```

### Step 2: Setup Supabase

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy the entire content of `supabase-schema.sql`
   - Paste and run it
   - This creates all tables, RLS policies, functions, and sample batches

3. **Configure Authentication:**
   - Go to Authentication → Providers
   - Enable **Google OAuth**:
     - Add your OAuth credentials
     - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   - Enable **Email** provider (Magic Link is enabled by default)

4. **Get your Supabase credentials:**
   - Go to Project Settings → API
   - Copy:
     - Project URL
     - Anon/Public Key

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 5: Create First Central Admin

**IMPORTANT:** After the first user signs up, you need to manually promote them to Central Admin:

1. Get the user's UUID:
   - Go to Supabase Dashboard → Authentication → Users
   - Copy the user's `id` (UUID)

2. Run this SQL in Supabase SQL Editor:
```sql
-- Replace 'user-uuid-here' with the actual UUID
INSERT INTO central_admins (user_id) 
VALUES ('user-uuid-here');

-- Also approve their profile if pending
UPDATE profiles 
SET status = 'approved' 
WHERE id = 'user-uuid-here';
```

3. The user can now access the Admin Panel at `/admin`

### Step 6: Assign Batch Admins

Central admins can assign batch admins through the Admin Panel:
1. Login as central admin
2. Go to `/admin`
3. Click "Assign Batch Admin" tab
4. Select user and batch
5. Click "Assign Batch Admin"

## 📁 Project Structure

```
alumni-skmasaf/
├── app/
│   ├── (dashboard)/          # Protected pages
│   │   ├── layout.tsx        # Dashboard layout with nav
│   │   ├── home/             # Home page
│   │   ├── directory/        # Alumni directory
│   │   ├── profile/          # User profile editor
│   │   ├── connections/      # Connection management
│   │   ├── events/           # Events listing
│   │   ├── batch/[year]/     # Batch pages
│   │   ├── admin/            # Central admin panel
│   │   └── batch-admin/      # Batch admin panel
│   ├── login/                # Login page
│   ├── onboarding/           # First-time profile setup
│   ├── auth/callback/        # OAuth callback handler
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── LogoutButton.tsx      # Logout component
├── lib/
│   ├── supabase/             # Supabase clients
│   │   ├── client.ts         # Client-side
│   │   ├── server.ts         # Server-side
│   │   └── middleware.ts     # Middleware helper
│   ├── auth.ts               # Auth utilities
│   └── types.ts              # TypeScript types
├── supabase-schema.sql       # Database schema + RLS
├── middleware.ts             # Next.js middleware
└── package.json
```

## 🔐 Security Considerations

### Contact Information Privacy
- Phone and email are **NEVER** exposed in API responses unless:
  1. User is viewing their own profile, OR
  2. Connection status = 'accepted' AND privacy toggle enabled

### RLS Enforcement
- All database access goes through Row Level Security policies
- Frontend checks are for UX only - backend enforces all rules
- Helper functions use `SECURITY DEFINER` for safe permission checks

### Profile Approval Flow
1. User signs up → Profile created with `status = 'pending'`
2. Central admin reviews → Approves or rejects
3. Only approved profiles appear in directory
4. Suspended users lose access but data preserved

## 🌐 Deployment (Vercel)

### Option 1: Deploy with Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: Deploy via GitHub

1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

### Post-Deployment

1. Update Supabase Auth redirect URLs:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel domain to Redirect URLs:
     - `https://your-app.vercel.app/auth/callback`

2. Update Google OAuth (if using):
   - Go to Google Cloud Console
   - Add Vercel domain to authorized redirect URIs

## 📝 Common Tasks

### Add a New Batch

```sql
INSERT INTO batches (batch_year, name, description) 
VALUES (2025, 'Batch 2025', 'Description here');
```

### Promote User to Central Admin

```sql
INSERT INTO central_admins (user_id) 
VALUES ('user-uuid');
```

### Assign Batch Admin

```sql
INSERT INTO batch_roles (user_id, batch_year, role) 
VALUES ('user-uuid', 2020, 'batch_admin');
```

### Approve All Pending Profiles (bulk)

```sql
UPDATE profiles 
SET status = 'approved' 
WHERE status = 'pending';
```

## 🐛 Troubleshooting

### Users can't see directory
- Check profile status is 'approved'
- Verify RLS policies are enabled

### Contact info not showing for connections
- Verify connection status = 'accepted'
- Check privacy toggles (email_public, phone_public)

### Admin panel not accessible
- Verify user exists in `central_admins` table
- Check browser console for auth errors

### Google OAuth not working
- Verify redirect URLs match exactly
- Check OAuth credentials in Supabase dashboard
- Ensure OAuth consent screen configured

## 📄 License

MIT License - Free to use for school alumni communities

## 🙋 Support

For issues or questions:
1. Check Supabase dashboard logs
2. Check browser console for errors
3. Verify RLS policies in Supabase SQL Editor
4. Review database schema documentation in `supabase-schema.sql`

---

**Built for SKMASAF Alumni** 🎓
