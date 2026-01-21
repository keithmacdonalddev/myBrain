# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Developer Context

**The developer (user) has no coding experience.** Adjust behavior accordingly:

- **Explain what you're doing** - Don't just write code silently; briefly explain the approach
- **Use simple terms** - Avoid jargon, or explain it when unavoidable
- **Be proactive about risks** - Warn before doing anything destructive or hard to undo
- **Suggest next steps** - Don't assume they know what to do after you finish
- **Remind about git** - Prompt to commit after completing features (they may forget)
- **Offer to explain** - After complex changes, ask if they want a walkthrough
- **Don't assume knowledge** - If something could be confusing, clarify it

When things go wrong, explain:
1. What happened (in plain terms)
2. Why it happened
3. How to fix it
4. How to prevent it next time

## Project Overview

myBrain is a personal productivity platform built with the MERN stack (MongoDB, Express, React, Node.js). It uses a plugin-style architecture designed for aggressive feature growth, with social features, real-time messaging, and comprehensive content management.

## Build & Run Commands

### Frontend (myBrain-web)
```bash
cd myBrain-web
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm test             # Run Vitest tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Backend (myBrain-api)
```bash
cd myBrain-api
npm install          # Install dependencies
npm run dev          # Start dev server with watch (localhost:5000)
npm start            # Start production server
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

### Quick Start (Both)
```bash
# Terminal 1 - Backend
cd myBrain-api && npm run dev

# Terminal 2 - Frontend
cd myBrain-web && npm run dev
```

## Architecture

```
myBrain/
├── myBrain-web/                    # React + Vite frontend
│   ├── src/
│   │   ├── app/                    # App shell, routing
│   │   ├── features/               # Feature modules (plugin-style)
│   │   │   ├── admin/              # Admin panel (users, roles, analytics, reports, database)
│   │   │   ├── auth/               # Login/Signup
│   │   │   ├── calendar/           # Calendar and events
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── files/              # File management
│   │   │   ├── fitness/            # Fitness tracking
│   │   │   ├── images/             # Image gallery
│   │   │   ├── inbox/              # Inbox
│   │   │   ├── kb/                 # Knowledge base
│   │   │   ├── lifeAreas/          # Life areas management
│   │   │   ├── messages/           # Real-time messaging
│   │   │   ├── notes/              # Notes feature
│   │   │   ├── notifications/      # Notification center
│   │   │   ├── profile/            # User profile
│   │   │   ├── projects/           # Projects with tasks
│   │   │   ├── settings/           # User settings
│   │   │   ├── social/             # Social connections
│   │   │   ├── tasks/              # Task management
│   │   │   └── today/              # Today view
│   │   ├── components/             # Shared UI components
│   │   │   ├── ui/                 # Base components
│   │   │   ├── layout/             # Shell components (Topbar, Sidebar)
│   │   │   ├── notes/              # Note slide panel
│   │   │   ├── projects/           # Project slide panel
│   │   │   └── tasks/              # Task slide panel
│   │   ├── store/                  # Redux slices
│   │   ├── hooks/                  # Custom hooks
│   │   ├── contexts/               # React contexts
│   │   ├── lib/                    # Utilities and API client
│   │   └── styles/                 # CSS (theme.css, globals.css)
│   └── package.json
│
├── myBrain-api/                    # Express + MongoDB backend
│   ├── src/
│   │   ├── routes/                 # API routes
│   │   ├── models/                 # Mongoose models
│   │   ├── middleware/             # Express middleware
│   │   ├── services/               # Business logic
│   │   ├── websocket/              # WebSocket handlers
│   │   ├── utils/                  # Utilities
│   │   └── server.js               # Main server file
│   └── package.json
│
└── .claude/
    └── agents/                     # Custom Claude Code skills
```

## Key Technologies

- **Frontend**: React 18, Vite, Redux Toolkit, TanStack Query, TailwindCSS, Radix UI
- **Backend**: Express, Mongoose, JWT (HttpOnly cookies), bcrypt, Socket.io
- **Database**: MongoDB Atlas
- **Storage**: AWS S3 for file/image storage
- **Testing**: Vitest + React Testing Library (frontend), Jest + Supertest (backend)

## Backend Structure

### Models (myBrain-api/src/models/)
| Model | Purpose |
|-------|---------|
| User | User accounts, roles, preferences |
| Note | User notes with rich content |
| Task | Tasks with due dates, priorities |
| Project | Projects containing tasks and links |
| Event | Calendar events |
| Image | Image metadata and storage |
| File | File metadata and storage |
| Folder | Folder organization for files |
| Tag | User-defined tags |
| LifeArea | Life area categories |
| Link | Project links |
| Connection | Social connections between users |
| Message | Direct messages |
| Conversation | Message threads |
| Notification | User notifications |
| Activity | Activity feed items |
| ItemShare | Shared content between users |
| UserBlock | Blocked users |
| Report | User reports for moderation |
| ModerationAction | Admin moderation history |
| SidebarConfig | Customizable sidebar settings |
| RoleConfig | Role-based permissions |
| SystemSettings | Global system settings |
| SavedFilter | User's saved search filters |
| SavedLocation | User's saved geographic locations |
| AnalyticsEvent | Analytics tracking |
| FileShare | File sharing permissions |
| Log | API request logs |

### Routes (myBrain-api/src/routes/)
- `auth.js` - Authentication (login, signup, logout)
- `users.js` - User management
- `profile.js` - User profile
- `notes.js` - Notes CRUD
- `tasks.js` - Tasks CRUD
- `projects.js` - Projects CRUD
- `events.js` - Calendar events
- `images.js` - Image upload/management
- `files.js` - File upload/management
- `folders.js` - Folder management
- `tags.js` - Tag management
- `lifeAreas.js` - Life areas
- `connections.js` - Social connections
- `messages.js` - Direct messaging
- `notifications.js` - Notifications
- `itemShares.js` - Content sharing
- `reports.js` - User reports
- `shares.js` - Share management
- `filters.js` - Saved filters
- `savedLocations.js` - Saved locations
- `weather.js` - Weather data
- `analytics.js` - Analytics
- `settings.js` - User settings
- `logs.js` - Admin logs
- `admin.js` - Admin operations

### Services (myBrain-api/src/services/)
Business logic layer - each service handles operations for its domain:
- `noteService.js`, `taskService.js`, `projectService.js`, `eventService.js`
- `fileService.js`, `folderService.js`, `imageService.js`, `imageProcessingService.js`
- `lifeAreaService.js`, `linkService.js`, `shareService.js`
- `weatherService.js`, `savedLocationService.js`
- `analyticsService.js`, `moderationService.js`, `limitService.js`
- `adminContentService.js`

### Middleware (myBrain-api/src/middleware/)
- `auth.js` - JWT authentication, requireAuth, requireAdmin
- `errorHandler.js` - Centralized error handling
- `featureGate.js` - Feature flag checking
- `requestLogger.js` - Request logging
- `limitEnforcement.js` - Usage limits
- `ensureLifeAreas.js` - Auto-create default life areas
- `ensureTags.js` - Auto-create default tags
- `upload.js` - File upload handling (multer + S3)

### WebSocket (myBrain-api/src/websocket/)
Real-time communication for:
- Direct messaging
- Notifications
- Activity updates

## Frontend Structure

### Shared UI Components (myBrain-web/src/components/ui/)
| Component | Purpose |
|-----------|---------|
| BaseModal | Base modal dialog - extend for all modals |
| ConfirmDialog | Confirmation prompts |
| Skeleton | Loading placeholders |
| EmptyState | Empty state displays |
| ToastContainer | Toast notifications |
| Tooltip | Hover tooltips |
| DateTimePicker | Date/time selection |
| TagInput | Tag input with autocomplete |
| LocationPicker | Geographic location picker |
| WeatherWidget | Weather display |
| Dropdown | Dropdown menus |
| ExpandableSection | Collapsible sections |
| SaveStatus | Auto-save status indicator |
| UserAvatar | User avatar display |
| DefaultAvatar | Fallback avatar |
| ThemeToggle | Dark/light mode toggle |
| ErrorBoundary | Error boundary wrapper |

### Custom Hooks (myBrain-web/src/hooks/)
| Hook | Purpose |
|------|---------|
| useToast | Toast notifications |
| useTags | Tag management |
| useSavedLocations | Saved locations |
| useWeather | Weather data fetching |
| useAnalytics | Analytics tracking |
| useFeatureFlag | Feature flag checking |
| useSidebarConfig | Sidebar configuration |
| useDebounce | Debounced values |
| useWebSocket | WebSocket connection |
| useAutoSave | Auto-save functionality |
| useKeyboardShortcuts | Keyboard shortcut handling |

### Utilities (myBrain-web/src/lib/)
- `api.js` - API client with auth handling
- `dateUtils.js` - Date formatting and parsing
- `utils.js` - General utilities
- `errorCapture.js` - Error tracking

### Redux Store (myBrain-web/src/store/)
- `authSlice.js` - Authentication state
- `lifeAreasSlice.js` - Life areas state
- `themeSlice.js` - Theme preferences
- `toastSlice.js` - Toast notifications

## Key Patterns

### Feature Modules
Each feature is self-contained in `features/{name}/`:
- `routes.jsx` - Feature routes
- `components/` - Feature UI
- `hooks/` - Feature hooks (TanStack Query)
- `pages/` - Page components

### State Management
- **Redux**: Global state (auth, life areas, theme, toasts)
- **TanStack Query**: Server state (notes, tasks, projects, etc.)

### Authentication
- JWT stored in HttpOnly cookies
- `requireAuth` middleware for protected routes
- `requireAdmin` middleware for admin routes
- WebSocket authentication via token

### Real-Time Features
- Socket.io for WebSocket connections
- Used for messaging, notifications, activity feeds
- `useWebSocket` hook for frontend connection

### File Storage
- AWS S3 for file and image storage
- `upload.js` middleware handles multipart uploads
- `imageProcessingService.js` for image optimization

### Logging (Wide Events Pattern)

**IMPORTANT: All backend routes must follow the Wide Events logging pattern.**

Based on loggingsucks.com - one comprehensive log per request with full context.

**In every route handler that works with entities:**

```javascript
import { attachEntityId } from '../middleware/requestLogger.js';

// 1. Attach entity IDs for searchability
attachEntityId(req, 'noteId', note._id);
attachEntityId(req, 'userId', note.userId);

// 2. Set event name for important actions
req.eventName = 'note.archive.success';

// 3. Capture mutation context for updates
req.mutation = {
  before: { status: oldStatus },
  after: { status: newStatus }
};
```

**See:** `.claude/rules/logging.md` for full requirements.
**Audit:** Run `/logging-audit` to check compliance.

## Code Reuse Requirements

**IMPORTANT: Always check for existing code before writing new code.**

### Frontend (myBrain-web)

Before creating new components or utilities:
1. Search `src/components/ui/` for existing UI components (modals, buttons, inputs, etc.)
2. Check `src/hooks/` for existing custom hooks
3. Look in `src/lib/` for utilities (api.js, dateUtils.js, utils.js)
4. Review similar features in `src/features/` for patterns to follow

**Never duplicate these - always import and reuse:**
- `src/lib/api.js` - All API calls
- `src/lib/dateUtils.js` - Date formatting/parsing
- `src/components/ui/BaseModal.jsx` - Modal dialogs
- `src/components/ui/ConfirmDialog.jsx` - Confirmation prompts
- `src/components/ui/Skeleton.jsx` - Loading states
- `src/components/ui/TagInput.jsx` - Tag selection
- `src/hooks/useDebounce.js` - Debounced values
- `src/hooks/useAutoSave.js` - Auto-save functionality

### Backend (myBrain-api)

Before creating new services or utilities:
1. Check `src/services/` for existing business logic
2. Look in `src/middleware/` for reusable middleware
3. Review `src/utils/` for shared utilities

**Never duplicate these:**
- `src/utils/logger.js` - All logging
- `src/middleware/auth.js` - Authentication checks
- `src/middleware/errorHandler.js` - Error responses

### When to Extract New Reusables

If you write similar code 2+ times, extract it:
- UI patterns → `src/components/ui/`
- Data fetching patterns → custom hook in `src/hooks/`
- Utility functions → `src/lib/utils.js`
- Backend logic → `src/services/`

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
LOG_SAMPLE_RATE=0.1
LOG_RETENTION_DAYS=90
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

## Testing

### Frontend Tests
Located in `*.test.jsx` files alongside components:
- `Skeleton.test.jsx`, `EmptyState.test.jsx`, `ThemeToggle.test.jsx`
- `authSlice.test.js`, `toastSlice.test.js` - Redux slice tests

### Backend Tests
Located in `*.test.js` files:
- `auth.test.js` - Auth API tests
- `notes.test.js` - Notes API tests

## Admin Features

Access at `/admin` (requires admin role):
- **Users**: Manage users, roles, feature flags
- **Roles**: Configure role permissions
- **Analytics**: View usage analytics
- **Reports**: Handle user reports
- **Database**: Database management
- **Sidebar**: Configure default sidebar
- **Logs**: View and search API request logs

To make a user admin:
```bash
cd myBrain-api
node scripts/makeAdmin.js user@example.com
```

## Custom Skills

Located in `.claude/agents/` (see `SKILLS.md` for quick reference):
- `/checkpoint` - Quick save: commit and push current changes
- `/code-reviewer` - Review code for quality and security
- `/commenter` - Add comprehensive comments matching myBrain style
- `/logging-audit` - Audit backend routes for proper Wide Events logging
- `/reuse-check` - Check for missed reuse opportunities
- `/sync-docs` - Update CLAUDE.md and SKILLS.md to reflect current codebase

---

## Git Workflow

**IMPORTANT: Prompt the user to commit after completing features or significant changes.**

### When to Commit
- After completing a feature or fix
- Before starting something new
- Before making risky changes
- At the end of a coding session

### Commit Process
After finishing work, suggest:
```bash
git add .
git commit -m "descriptive message"
git push
```

### Warning Signs (Prompt User)
- More than 10 uncommitted files
- Working on something new with uncommitted changes from before
- End of session with uncommitted work

---

## Working with Claude (Tips for Non-Coders)

### How to Get Better Results

**Be specific about what you want:**
- Bad: "Make the app better"
- Good: "Add a delete button to the task card that asks for confirmation before deleting"

**Tell me the context:**
- "Users are complaining that..."
- "I want this to work like [other app]..."
- "The current behavior is X but I want Y"

**Ask me to explain:**
- "Explain what you just did"
- "Why did you choose that approach?"
- "What does this code do?"

### Things You Can Ask Me To Do

| Task | Example |
|------|---------|
| Fix bugs | "The login page shows an error when I click submit" |
| Add features | "Add a way to sort tasks by due date" |
| Change UI | "Make the sidebar collapsible" |
| Explain code | "What does the auth middleware do?" |
| Review code | "Check if there are any problems with the new feature" |
| Run commands | "Start the dev server" / "Run the tests" |
| Commit code | "Save my changes to git" |
| Debug | "The app crashes when I do X - help me find why" |

### When Something Goes Wrong

**App won't start:**
1. Tell me the error message you see
2. I'll diagnose and fix it

**Feature doesn't work:**
1. Describe what you expected
2. Describe what actually happens
3. I'll investigate

**You're confused:**
- Ask me to explain in simpler terms
- Ask "what are my options here?"

---

## Common Problems & Solutions

### "npm install" fails
- Usually a network issue or version conflict
- Ask me to diagnose the error message

### App shows blank page
- Usually a JavaScript error
- Open browser console (F12) and tell me what it says

### API returns errors
- Check if backend is running (`cd myBrain-api && npm run dev`)
- Check the terminal for error messages

### Database connection issues
- Verify MONGO_URI in `.env` is correct
- Check if IP is whitelisted in MongoDB Atlas

### Changes not showing up
- Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check if both frontend AND backend are running

---

## Safety Guidelines

### Never Do These Without Asking
- Delete database collections or documents
- Modify `.env` files with real credentials
- Run commands with `--force` flags
- Push directly to main/master branch in production
- Modify payment or authentication code without review

### Always Do These
- Test locally before deploying
- Commit before making risky changes (so you can undo)
- Back up the database before migrations
- Review changes before pushing to production

### Files to Never Commit
These contain secrets - never push to GitHub:
- `.env` files
- Any file with passwords, API keys, or tokens
- `credentials.json`, `serviceAccount.json`, etc.

---

## Deployment Checklist

Before deploying to production:

1. **Test locally** - Does everything work on your machine?
2. **Commit all changes** - Run `/checkpoint` or commit manually
3. **Check for console errors** - Open browser F12, look for red errors
4. **Review what's being deployed** - `git diff main` to see changes
5. **Have a rollback plan** - Know the last working commit

### Quick Deploy Commands
```bash
# Frontend (if using Vercel/Netlify - usually automatic on push)
git push

# Backend (if using Railway/Render - usually automatic on push)
git push

# Manual build check
cd myBrain-web && npm run build  # Should complete without errors
```

---

## Asking for Help

If you're stuck or confused:

1. **Describe the problem** - What were you trying to do?
2. **Share error messages** - Copy/paste any red text you see
3. **Tell me what you already tried** - So I don't suggest the same thing

I can help with anything code-related. Don't hesitate to ask "dumb" questions - there are none.
