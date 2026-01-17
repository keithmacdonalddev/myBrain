# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

myBrain is a personal productivity platform built with the MERN stack (MongoDB, Express, React, Node.js). It uses a plugin-style architecture designed for aggressive feature growth.

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
├── myBrain-web/              # React + Vite frontend
│   ├── src/
│   │   ├── app/              # App shell, routing
│   │   ├── features/         # Feature modules (plugin-style)
│   │   │   ├── notes/        # Notes feature
│   │   │   ├── dashboard/    # Dashboard
│   │   │   ├── auth/         # Login/Signup
│   │   │   └── admin/        # Admin panel
│   │   ├── components/       # Shared UI components
│   │   │   ├── ui/           # Base components (Skeleton, EmptyState, Toast)
│   │   │   └── layout/       # Shell components (Topbar, Sidebar)
│   │   ├── store/            # Redux slices (auth, areas, theme, toast)
│   │   ├── hooks/            # Custom hooks (useToast)
│   │   ├── lib/              # API client
│   │   └── styles/           # CSS (theme.css, globals.css)
│   └── package.json
│
├── myBrain-api/              # Express + MongoDB backend
│   ├── src/
│   │   ├── routes/           # API routes (auth, notes, areas, admin)
│   │   ├── models/           # Mongoose models (User, Note, Area, Log)
│   │   ├── middleware/       # Express middleware (auth, logging, errors)
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utilities (logger, seedAreas)
│   │   └── server.js         # Main server file
│   └── package.json
│
├── PLAN-SCALABLE.md          # Full implementation plan
└── DEPLOY.md                 # Deployment guide
```

## Key Technologies

- **Frontend**: React 18, Vite, Redux Toolkit, TanStack Query, TailwindCSS, Radix UI
- **Backend**: Express, Mongoose, JWT (HttpOnly cookies), bcrypt
- **Database**: MongoDB Atlas
- **Testing**: Vitest + React Testing Library (frontend), Jest + Supertest (backend)

## Key Patterns

### Feature Modules
Each feature is self-contained in `features/{name}/`:
- `routes.jsx` - Feature routes
- `components/` - Feature UI
- `hooks/` - Feature hooks (TanStack Query)

### State Management
- **Redux**: Global state (auth, areas, theme, toasts)
- **TanStack Query**: Server state (notes, users, logs)

### Authentication
- JWT stored in HttpOnly cookies
- `requireAuth` middleware for protected routes
- `requireAdmin` middleware for admin routes

### Logging
- Wide event logging with tail sampling
- Request IDs on all requests (nanoid)
- Admin logs viewer at `/admin/logs`

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
```

## Testing

### Frontend Tests
Located in `*.test.jsx` files alongside components:
- `Skeleton.test.jsx` - Skeleton component tests
- `EmptyState.test.jsx` - Empty state tests
- `authSlice.test.js` - Redux slice tests

### Backend Tests
Located in `*.test.js` files:
- `auth.test.js` - Auth API tests
- `notes.test.js` - Notes API tests

## Admin Features

Access at `/admin` (requires admin role):
- **Logs**: View and search API request logs
- **Users**: Manage users, roles, feature flags
- **Areas**: Manage sidebar areas (add/edit/reorder/delete)

To make a user admin:
```bash
cd myBrain-api
node scripts/makeAdmin.js user@example.com
```
