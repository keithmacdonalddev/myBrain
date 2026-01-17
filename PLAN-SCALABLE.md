# myBrain V1 - Scalable Architecture Plan

## Vision: A Platform, Not Just a Notes App

You're not building "a notes app" - you're building a **personal productivity platform** that will expand to include:
- Notes (V1)
- Fitness tracking
- Knowledge base
- Messages
- **And many more areas you'll add later**

This plan architects the system to handle **aggressive feature growth** without becoming a mess.

---

## Core Architectural Principles

### 1. **Plugin-Style Features**
Each area (Notes, Fitness, KB, etc.) is a self-contained module that:
- Has its own UI components, routes, API calls, Redux slice
- Can be enabled/disabled via admin panel
- Doesn't know about other features (loose coupling)
- Can be built by AI agents independently

### 2. **Dynamic Area Management**
"Coming Soon" areas aren't hardcoded - they're **data-driven**:
- Admin creates new areas in the admin panel
- Each area has: name, icon, status (active/coming_soon/hidden), permissions
- UI automatically updates when areas change
- No code deployment needed to add/remove areas

### 3. **Feature Flags Everywhere**
Every major feature can be toggled:
- Per-user flags: `{ "notes.advanced-search": true, "fitness.enabled": true }`
- Global flags: `{ "maintenance-mode": false }`
- Admin can enable beta features for specific users

### 4. **Scalable Data Model**
Database designed for multi-feature growth:
- Each feature has its own collections (notes, workouts, articles, etc.)
- Shared collections (users, logs, areas, feature_flags)
- All data tied to userId for multi-tenancy readiness

---

## Tech Stack (Updated for Scale)

### Two Separate Projects

#### Frontend (myBrain-web) - React + Vite
- **React 18+** (with Suspense for lazy loading)
- **Vite** (fast dev server, code splitting)
- **React Router v6** (nested routes per feature)
- **Redux Toolkit** (global state: auth, theme, UI)
- **TanStack Query** (server state: data fetching/caching)
- **TailwindCSS** (consistent styling)
- **Radix UI** (accessible components)

#### Backend (myBrain-api) - Express + MongoDB
- **Express** (web server)
- **Mongoose** (MongoDB ODM)
- **JWT** (authentication)
- **bcrypt** (password hashing)
- **express-rate-limit** (rate limiting)

#### Database (MongoDB Atlas)
- **Users** - auth, roles, feature flags
- **Areas** - dynamic area registry
- **Notes** - notes feature data
- **Logs** - wide event logging
- **Future collections**: Workouts, Articles, Messages, etc.

---

## Project Structure (Modular)

### Frontend Structure
```
myBrain-web/
├── src/
│   ├── app/                        # App shell
│   │   ├── App.jsx                 # Main app, router setup
│   │   ├── AppShell.jsx            # Layout: topbar, sidebar, content
│   │   └── ProtectedRoute.jsx     # Auth guard
│   │
│   ├── features/                   # Feature modules (plugins)
│   │   ├── registry.js             # Feature registry (all features listed)
│   │   │
│   │   ├── notes/                  # Notes feature module
│   │   │   ├── index.js            # Feature config export
│   │   │   ├── routes.jsx          # Notes routes
│   │   │   ├── api/                # Notes API calls
│   │   │   │   └── notesApi.js
│   │   │   ├── components/         # Notes UI
│   │   │   │   ├── NotesList.jsx
│   │   │   │   ├── NoteEditor.jsx
│   │   │   │   └── NotesSearch.jsx
│   │   │   ├── store/              # Notes Redux slice
│   │   │   │   └── notesSlice.js
│   │   │   └── hooks/              # Notes-specific hooks
│   │   │       └── useNotes.js
│   │   │
│   │   ├── fitness/                # Future: Fitness module
│   │   │   ├── index.js
│   │   │   ├── routes.jsx
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── store/
│   │   │
│   │   ├── kb/                     # Future: Knowledge Base module
│   │   └── messages/               # Future: Messages module
│   │
│   ├── components/                 # Shared UI components
│   │   ├── ui/                     # Base components (Button, Input, etc.)
│   │   └── layout/                 # Shell components
│   │       ├── Topbar.jsx
│   │       ├── Sidebar.jsx
│   │       ├── AreaSwitcher.jsx    # Dynamic area list
│   │       └── FeatureGate.jsx     # Feature flag wrapper
│   │
│   ├── store/                      # Global Redux store
│   │   ├── index.js                # Store config
│   │   ├── authSlice.js            # Auth state
│   │   ├── themeSlice.js           # Theme state
│   │   ├── areasSlice.js           # Areas registry
│   │   └── toastSlice.js           # Toast notifications
│   │
│   ├── lib/                        # Utilities
│   │   ├── api.js                  # Axios client
│   │   ├── queryClient.js          # TanStack Query setup
│   │   └── featureFlags.js         # Feature flag helpers
│   │
│   ├── hooks/                      # Global hooks
│   │   ├── useAuth.js
│   │   ├── useFeatureFlag.js
│   │   └── useToast.js
│   │
│   ├── styles/
│   │   ├── theme.css               # CSS variables (dark/light)
│   │   └── globals.css
│   │
│   └── main.jsx                    # Entry point
│
├── .env.example
├── package.json
└── vercel.json
```

### Backend Structure
```
myBrain-api/
├── src/
│   ├── routes/                     # API routes
│   │   ├── auth.js                 # Auth endpoints
│   │   ├── areas.js                # Areas CRUD (admin)
│   │   ├── notes.js                # Notes endpoints
│   │   ├── admin.js                # Admin endpoints
│   │   └── index.js                # Route aggregator
│   │
│   ├── models/                     # Mongoose models
│   │   ├── User.js
│   │   ├── Area.js                 # Areas registry
│   │   ├── Note.js
│   │   ├── Log.js
│   │   └── index.js                # Model aggregator
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── auth.js                 # JWT verification
│   │   ├── logger.js               # Wide event logging
│   │   ├── errorHandler.js         # Global error handler
│   │   ├── rateLimit.js            # Rate limiting
│   │   └── featureGate.js          # Feature flag middleware
│   │
│   ├── services/                   # Business logic
│   │   ├── noteService.js
│   │   ├── areaService.js
│   │   ├── logService.js
│   │   └── userService.js
│   │
│   ├── utils/                      # Utilities
│   │   ├── logger.js               # Wide event logger
│   │   ├── sampling.js             # Tail sampling
│   │   └── validation.js           # Input validation
│   │
│   └── server.js                   # Main server file
│
├── .env.example
├── package.json
└── render.yaml
```

---

## New Database Collections

### Areas Collection (New!)
**Purpose**: Dynamic area registry (admin can add/edit areas without code changes)

```javascript
{
  _id: ObjectId("..."),
  name: "Fitness",                   // Display name
  slug: "fitness",                   // URL slug: /app/fitness
  icon: "dumbbell",                  // Icon name (from icon library)
  status: "coming_soon",             // "active" | "coming_soon" | "hidden"
  order: 3,                          // Display order (sidebar position)
  description: "Track workouts, meals, and body metrics",
  color: "#f97316",                  // Accent color (optional)
  permissions: {
    view: ["admin"],                 // Who can see if active
    edit: ["admin"]                  // Who can modify data
  },
  featureFlags: {                    // Required flags to access
    required: ["fitness.enabled"]
  },
  metadata: {
    totalRecords: 0,                 // Cache: total workouts/notes/etc.
    lastActivity: null               // Last time user interacted
  },
  createdBy: ObjectId("admin_id"),
  createdAt: Date,
  updatedAt: Date
}
```

**Seeded areas** (created on first deploy):
```javascript
[
  { slug: "notes", status: "active", order: 1 },
  { slug: "fitness", status: "coming_soon", order: 2 },
  { slug: "kb", status: "coming_soon", order: 3 },
  { slug: "messages", status: "coming_soon", order: 4 }
]
```

### Users Collection (Updated)
```javascript
{
  _id: ObjectId,
  email: "you@example.com",
  passwordHash: "$2b$10$...",
  role: "admin",                     // "user" | "admin"
  status: "active",                  // "active" | "disabled"

  // Feature flags (granular permissions)
  flags: {
    "notes.advanced-search": true,
    "notes.export": false,
    "fitness.enabled": true,         // Beta access to fitness
    "kb.enabled": false,
    "debug.logging": false
  },

  // User preferences
  preferences: {
    theme: "dark",
    defaultArea: "notes",            // Where to land after login
    sidebarCollapsed: false
  },

  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

### Notes Collection (Same)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: "Meeting Notes",
  body: "Discussed Q1 roadmap...",
  tags: ["work", "planning"],
  pinned: false,
  status: "active",                  // "active" | "archived" | "trashed"
  trashedAt: null,
  lastOpenedAt: Date,                // For "Continue" section
  createdAt: Date,
  updatedAt: Date
}
```

### Logs Collection (Same)
```javascript
{
  _id: ObjectId,
  requestId: "req_abc123",
  timestamp: Date,                   // TTL index: 90 days
  route: "/notes",
  method: "GET",
  statusCode: 200,
  durationMs: 45,
  userId: ObjectId,
  userRole: "user",
  featureFlags: { ... },
  entityIds: { noteId: "..." },
  error: null,
  clientInfo: { ip: "...", userAgent: "..." },
  eventName: "notes.list.success",
  sampled: true,
  createdAt: Date
}
```

---

## Feature Registry Pattern (Frontend)

### src/features/registry.js
```javascript
import { lazy } from 'react';

export const FEATURE_REGISTRY = [
  {
    slug: 'notes',
    name: 'Notes',
    icon: 'StickyNote',
    component: lazy(() => import('./notes/routes')),
    enabled: true,                   // Hardcoded enabled for V1
    permissions: ['user', 'admin'],
    routes: [
      '/app/notes',
      '/app/notes/:id'
    ]
  },

  // Future features (will be dynamic from DB)
  {
    slug: 'fitness',
    name: 'Fitness',
    icon: 'Dumbbell',
    component: lazy(() => import('./fitness/routes')),
    enabled: false,                  // Coming soon
    permissions: ['admin'],          // Beta only
    routes: ['/app/fitness']
  },

  {
    slug: 'kb',
    name: 'Knowledge Base',
    icon: 'BookOpen',
    component: lazy(() => import('./kb/routes')),
    enabled: false,
    permissions: ['admin'],
    routes: ['/app/kb']
  },

  {
    slug: 'messages',
    name: 'Messages',
    icon: 'MessageSquare',
    component: lazy(() => import('./messages/routes')),
    enabled: false,
    permissions: ['admin'],
    routes: ['/app/messages']
  }
];
```

### How AreaSwitcher Uses It
```javascript
// components/layout/AreaSwitcher.jsx
import { FEATURE_REGISTRY } from '@/features/registry';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export default function AreaSwitcher() {
  const { user } = useAuth();

  // Filter areas user can see
  const visibleAreas = FEATURE_REGISTRY.filter(area => {
    // Check permissions
    if (!area.permissions.includes(user.role)) return false;

    // Check if enabled OR user has beta access
    return area.enabled || user.flags[`${area.slug}.enabled`];
  });

  return (
    <div>
      {visibleAreas.map(area => (
        <AreaButton
          key={area.slug}
          area={area}
          status={area.enabled ? 'active' : 'coming_soon'}
        />
      ))}
    </div>
  );
}
```

---

## Admin Panel - Area Management

### New Admin Feature: Manage Areas

**Admin Areas Page** (`/admin/areas`)

**What admin can do**:
- ✅ View all areas (active, coming soon, hidden)
- ✅ Add new area (name, slug, icon, description)
- ✅ Edit area status: `active` | `coming_soon` | `hidden`
- ✅ Reorder areas (drag-drop)
- ✅ Set permissions (which roles can access)
- ✅ Delete areas (with confirmation)

**UI Design**:
```
┌─────────────────────────────────────────┐
│ Areas Management                         │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Notes              [Active]    ↕️   │  │
│ │ Second brain, ideas, TODOs          │  │
│ │ [Edit] [Delete]                     │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Fitness      [Coming Soon]      ↕️   │  │
│ │ Workouts, meals, body metrics       │  │
│ │ [Activate] [Edit] [Delete]          │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [+ Add New Area]                         │
└─────────────────────────────────────────┘
```

**Add New Area Modal**:
```
Name: ___________
Slug: ___________ (auto-generated from name)
Icon: [Icon Picker]
Status: ○ Active  ● Coming Soon  ○ Hidden
Description: ________________
Permissions: ☑ Admin  ☐ User

[Cancel] [Create Area]
```

### Backend API for Areas

**GET /admin/areas** - List all areas
```javascript
// Response
[
  { slug: "notes", name: "Notes", status: "active", order: 1 },
  { slug: "fitness", name: "Fitness", status: "coming_soon", order: 2 }
]
```

**POST /admin/areas** - Create new area
```javascript
// Request
{
  name: "Recipes",
  slug: "recipes",
  icon: "ChefHat",
  status: "hidden",
  description: "Save and organize recipes",
  permissions: { view: ["user", "admin"] }
}
```

**PATCH /admin/areas/:slug** - Update area
```javascript
// Request (change status)
{ status: "active" }

// Or reorder
{ order: 5 }
```

**DELETE /admin/areas/:slug** - Delete area
- Requires confirmation
- Checks if area has data (e.g., can't delete "notes" if notes exist)

---

## Implementation Plan (Updated for Scale)

### Week 1: Foundation + Dynamic Areas

#### Day 1-2: Project Setup (Same as before)
- Create separate frontend/backend projects
- Install dependencies
- MongoDB Atlas setup
- Basic server running

#### Day 3-4: Auth System (Same)
- User model with feature flags
- JWT authentication
- Login/signup pages
- Protected routes

#### Day 5-7: **Dynamic Areas System** (New!)

**Backend**
- [ ] Create Area model (schema above)
- [ ] Seed initial areas (notes=active, others=coming_soon)
- [ ] GET /areas - List areas user can see
  - Filter by user role + feature flags
  - Sort by order
  - Include status
- [ ] Admin routes:
  - GET /admin/areas (all areas)
  - POST /admin/areas (create)
  - PATCH /admin/areas/:slug (update)
  - DELETE /admin/areas/:slug (delete with validation)

**Frontend**
- [ ] Create feature registry (FEATURE_REGISTRY)
- [ ] Build AreaSwitcher component
  - Fetch areas from API
  - Show active areas (clickable)
  - Show coming soon areas (grayed out, tooltip)
  - Hide hidden areas
- [ ] Build useFeatureFlag hook
  - Check if user has feature flag enabled
  - Example: `useFeatureFlag('fitness.enabled')`
- [ ] Build FeatureGate component
  - Wrapper that shows/hides content based on flags
  - Example: `<FeatureGate flag="notes.export">...</FeatureGate>`

**What you'll see**: Sidebar with Notes (active) and Fitness/KB/Messages (coming soon)

---

### Week 2: Notes Feature + Logging

#### Day 8-9: Notes Backend (Same)
- Note model
- CRUD endpoints
- Search/filter

#### Day 10-12: Notes Frontend (Same)
- Notes list, editor
- Search, tags, pin, archive
- Auto-save, undo

#### Day 13-14: Logging System (Same)
- Wide event logging
- Tail sampling
- Request IDs in errors

---

### Week 3: Dashboard + Admin Panel

#### Day 15-16: Dashboard (Same)
- Continue, Quick Capture, Recent Activity
- Pinned notes section

#### Day 17-18: Admin - Users Management (Same)
- User list, search
- Edit roles, feature flags
- Enable beta features per user

#### Day 19-20: **Admin - Areas Management** (New!)

**Backend**
- Already done in Week 1 Day 5-7

**Frontend**
- [ ] Build AdminAreasPage (`/admin/areas`)
- [ ] AreasTable component
  - List all areas (drag to reorder)
  - Status badges (active/coming_soon/hidden)
  - Edit/Delete buttons
- [ ] AddAreaModal component
  - Form: name, slug, icon picker, status, permissions
  - Validate slug is unique
  - Create area via POST /admin/areas
- [ ] EditAreaModal component
  - Update area details
  - Change status (activate coming soon → active)
- [ ] Delete confirmation modal
  - Check if area has data (warn if deleting active area)

**What you'll see**: Admin can add "Recipes" area without touching code!

#### Day 21-22: Admin - Logs Viewer (Same)
- Logs table, filters
- Log detail drawer
- Copy request ID

---

### Week 4: Polish, Dark Mode, Deploy

#### Day 23-24: UI Polish (Same)
- Dark mode
- Toast system with undo
- Loading skeletons
- Empty states

#### Day 25-26: Testing (Same)
- Test notes CRUD
- Test admin area CRUD
- Test feature flags
- Test responsive layout

#### Day 27-28: Deploy (Same)
- Vercel (frontend)
- Render (backend)
- MongoDB Atlas
- Test production

---

## How You'll Add New Features in V2+

### Example: Adding Fitness Module

**Step 1: Admin creates area** (No code!)
- Go to `/admin/areas`
- Click "Add Area"
- Name: "Fitness", Status: "Coming Soon"
- Save

**Step 2: Build the feature module** (With AI)
```
myBrain-web/src/features/fitness/
├── index.js                 # Export feature config
├── routes.jsx               # Fitness routes
├── api/workoutsApi.js       # API calls
├── components/
│   ├── WorkoutsList.jsx
│   └── WorkoutEditor.jsx
└── store/workoutsSlice.js   # Redux slice
```

**Step 3: Add to feature registry**
```javascript
// src/features/registry.js
{
  slug: 'fitness',
  component: lazy(() => import('./fitness/routes')),
  enabled: true  // Change from false to true
}
```

**Step 4: Backend - Add workout endpoints**
```
myBrain-api/src/
├── models/Workout.js        # Mongoose model
├── routes/workouts.js       # CRUD endpoints
└── services/workoutService.js
```

**Step 5: Admin activates area**
- Go to `/admin/areas`
- Click "Activate" on Fitness area
- Status changes: `coming_soon` → `active`
- Sidebar automatically updates!

**Result**: Fitness feature is live, didn't break Notes!

---

## Why This Architecture Scales

### ✅ Add features without breaking existing ones
- Each feature is isolated
- No global state conflicts (each has own Redux slice)
- API routes don't overlap

### ✅ Enable features for beta users
- Admin gives user `fitness.enabled` flag
- User sees Fitness before general release
- Get feedback before activating for everyone

### ✅ A/B testing ready
- Give 50% of users `notes.new-editor` flag
- Test new features with subset of users
- Roll back easily (just remove flag)

### ✅ Multi-tenant ready
- All data tied to userId
- Easy to add "workspace" or "team" concept later
- Feature flags already per-user

### ✅ AI-friendly development
- You can say: "Build the Fitness module"
- AI works in isolated feature folder
- Doesn't need to understand entire codebase

---

## Updated Tech Decisions

| Decision | Choice | Why (for scale) |
|----------|--------|----------------|
| Monorepo vs Separate | **Separate** | Easier deployment, clear boundaries |
| TypeScript vs JavaScript | **JavaScript** | Easier for you to read/edit |
| Next.js vs React+Vite | **React+Vite** | Simpler, faster, easier to add routes |
| Feature structure | **Plugin-style** | Add features without breaking others |
| Areas management | **Dynamic (DB)** | Admin can add areas without code |
| Feature flags | **Per-user + per-feature** | Granular control, beta testing |
| State management | **Redux + TanStack** | Scales to 10+ features |

---

## Cost (Still Free!)

- **Vercel**: Free (unlimited for hobby)
- **Render**: Free (cold starts OK for personal use)
- **MongoDB Atlas**: Free (512MB = plenty for start)

**When to upgrade**:
- 1000+ users: Render Pro ($7/mo), MongoDB M10 ($9/mo)
- 10,000+ users: Consider dedicated hosting

---

## Key Takeaways for AI Agents (Like Me!)

When building features, I will:

1. ✅ **Keep features isolated** - Each in its own folder
2. ✅ **Use feature flags** - Everything togglable
3. ✅ **Make it data-driven** - Config in DB, not code
4. ✅ **Plan for scale** - Assume 20+ features eventually
5. ✅ **Document patterns** - So next AI agent can follow same structure

---

## Next Steps

1. **Review this plan** - Does this match your vision of aggressive growth?
2. **Approve architecture** - Plugin-style features + dynamic areas
3. **Start building** - I'll create the scalable foundation

Ready to build a platform that can grow to 20+ features without becoming spaghetti code? 🚀
