# myBrain Web

Frontend for myBrain, a personal productivity platform with notes, tasks, projects, files, and collaboration features. Built with React + Vite and designed to pair with the myBrain backend API.

## Features
- Dashboard with configurable widgets (focus, tasks, events, projects, quick capture)
- Notes, tasks, and inbox processing with slide panels
- Calendar and projects with linked items
- Files and images libraries with tagging, search, and bulk actions
- Social features: connections, messages, sharing, notifications
- Profile and settings, including themes and feature flags
- Admin console for users, analytics, logs, reports, and system controls
- Real-time updates via WebSocket and client-side error reporting

## Tech Stack
- React 18, React Router
- Vite
- Redux Toolkit
- React Query
- Tailwind CSS
- Radix UI
- Recharts
- Socket.IO client
- Vitest + Testing Library

## Getting Started
```bash
npm install
```

Copy and edit env vars:
```bash
copy .env.example .env
```

Run the app:
```bash
npm run dev
```

## Environment Variables
These are loaded from `.env` and injected by Vite.

```bash
VITE_API_URL=http://localhost:5000
VITE_ENV=development
```

## Scripts
```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:ui
npm run test:coverage
```

## Project Structure
- `src/app/App.jsx` — top-level routing and providers
- `src/components` — shared UI and layout
- `src/contexts` — panel and tooltip contexts
- `src/features` — feature modules (notes, tasks, files, images, etc.)
- `src/hooks` — reusable hooks (websocket, autosave, feature flags)
- `src/lib/api.js` — API client and endpoint wrappers
- `src/store` — Redux slices and store setup
- `src/styles` — global and theme styles

## Feature Flags
Feature gating is based on `user.flags` in auth state. Common flags used:
- `calendarEnabled`
- `imagesEnabled`
- `filesEnabled`
- `projectsEnabled`
- `fitnessEnabled`
- `kbEnabled`
- `socialEnabled`

## Backend Dependency
This app expects a compatible myBrain backend API. Update `VITE_API_URL` to point at the API host. Authentication uses a combination of cookies and a bearer token stored in `localStorage` (`mybrain_token`).

