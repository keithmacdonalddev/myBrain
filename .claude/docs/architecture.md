# Architecture Reference

This file documents the codebase structure. Update when adding new models, routes, components, hooks, or services.

---

## Project Structure

```
myBrain/
├── myBrain-web/                    # React + Vite frontend
│   ├── src/
│   │   ├── app/                    # App shell, routing
│   │   ├── features/               # Feature modules (plugin-style)
│   │   ├── components/             # Shared UI components
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
└── .claude/                        # Claude Code configuration
    ├── rules/                      # Behavior rules
    ├── docs/                       # Reference documentation
    ├── design/                     # Design system and assets
    ├── skills/                     # Custom slash commands
    └── memory.md                   # Session memory
```

---

## Tech Stack

- **Frontend**: React 18, Vite, Redux Toolkit, TanStack Query, TailwindCSS, Radix UI
- **Backend**: Express, Mongoose, JWT (HttpOnly cookies), bcrypt, Socket.io
- **Database**: MongoDB Atlas
- **Storage**: AWS S3 for file/image storage
- **Testing**: Vitest + React Testing Library (frontend), Jest + Supertest (backend)

---

## Feature Modules

Each feature is self-contained in `myBrain-web/src/features/{name}/`:

```
features/
├── admin/          # Admin panel (users, roles, analytics, reports, database)
├── auth/           # Login/Signup
├── calendar/       # Calendar and events
├── dashboard/      # Main dashboard
├── files/          # File management
├── fitness/        # Fitness tracking
├── images/         # Image gallery
├── inbox/          # Inbox
├── kb/             # Knowledge base
├── lifeAreas/      # Life areas management
├── messages/       # Real-time messaging
├── notes/          # Notes feature
├── notifications/  # Notification center
├── profile/        # User profile
├── projects/       # Projects with tasks
├── settings/       # User settings
├── social/         # Social connections
├── tasks/          # Task management
└── today/          # Today view
```

**Pattern per feature:**
- `routes.jsx` - Feature routes
- `components/` - Feature UI
- `hooks/` - Feature hooks (TanStack Query)
- `pages/` - Page components

---

## Backend Models

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
| ModerationTemplate | Reusable moderation message templates |
| AdminMessage | Admin-to-user messages |
| SidebarConfig | Customizable sidebar settings |
| RoleConfig | Role-based permissions |
| SystemSettings | Global system settings |
| SavedFilter | User's saved search filters |
| SavedLocation | User's saved geographic locations |
| AnalyticsEvent | Analytics tracking |
| FileShare | File sharing permissions |
| Log | API request logs |

---

## Backend Routes

| File | Purpose |
|------|---------|
| auth.js | Authentication (login, signup, logout) |
| users.js | User management |
| profile.js | User profile |
| notes.js | Notes CRUD |
| tasks.js | Tasks CRUD |
| projects.js | Projects CRUD |
| events.js | Calendar events |
| images.js | Image upload/management |
| files.js | File upload/management |
| folders.js | Folder management |
| tags.js | Tag management |
| lifeAreas.js | Life areas |
| connections.js | Social connections |
| messages.js | Direct messaging |
| notifications.js | Notifications |
| itemShares.js | Content sharing |
| reports.js | User reports |
| shares.js | Share management |
| filters.js | Saved filters |
| savedLocations.js | Saved locations |
| weather.js | Weather data |
| analytics.js | Analytics |
| settings.js | User settings |
| logs.js | Admin logs |
| admin.js | Admin operations |

---

## Backend Services

Business logic layer - each service handles operations for its domain:

| Service | Domain |
|---------|--------|
| noteService.js | Note operations |
| taskService.js | Task operations |
| projectService.js | Project operations |
| eventService.js | Event operations |
| fileService.js | File operations |
| folderService.js | Folder operations |
| imageService.js | Image operations |
| imageProcessingService.js | Image optimization |
| lifeAreaService.js | Life area operations |
| linkService.js | Link operations |
| shareService.js | Share operations |
| weatherService.js | Weather data |
| savedLocationService.js | Saved locations |
| analyticsService.js | Analytics |
| moderationService.js | Moderation |
| limitService.js | Usage limits |
| adminContentService.js | Admin content |
| adminSocialService.js | Admin social |

---

## Backend Middleware

| File | Purpose |
|------|---------|
| auth.js | JWT authentication, requireAuth, requireAdmin |
| errorHandler.js | Centralized error handling |
| featureGate.js | Feature flag checking |
| requestLogger.js | Request logging (Wide Events) |
| limitEnforcement.js | Usage limits |
| ensureLifeAreas.js | Auto-create default life areas |
| ensureTags.js | Auto-create default tags |
| upload.js | File upload handling (multer + S3) |

---

## Frontend Shared Components

Located in `myBrain-web/src/components/ui/`:

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

---

## Frontend Hooks

Located in `myBrain-web/src/hooks/`:

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

---

## Frontend Contexts

Located in `myBrain-web/src/contexts/`:

| Context | Purpose |
|---------|---------|
| TaskPanelContext | Slide panel state for tasks |
| ProjectPanelContext | Slide panel state for projects |
| NotePanelContext | Slide panel state for notes |
| TooltipsContext | Global tooltip management |

---

## Redux Store

Located in `myBrain-web/src/store/`:

| Slice | Purpose |
|-------|---------|
| authSlice.js | Authentication state |
| lifeAreasSlice.js | Life areas state |
| themeSlice.js | Theme preferences |
| toastSlice.js | Toast notifications |

---

## Key Patterns

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

---

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

---

## Testing

### Frontend Tests
Located in `*.test.jsx` files alongside components.

```bash
cd myBrain-web
npm test              # Run Vitest tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Backend Tests
Located in `*.test.js` files.

```bash
cd myBrain-api
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
```
