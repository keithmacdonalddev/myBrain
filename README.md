# myBrain

A full-stack personal productivity platform with a plugin-style feature architecture, admin controls, and real-time collaboration. This repository contains both the frontend (`myBrain-web`) and backend (`myBrain-api`).

## Overview
myBrain combines notes, tasks, projects, files, and social features into a single system. The frontend is a React + Vite app, while the backend is an Express + MongoDB API with Socket.IO for real-time updates.

## Features
- Notes, tasks, and inbox processing with slide panels
- Dashboard widgets (focus, tasks, events, projects, quick capture)
- Calendar events and project linking
- Files and images libraries with tagging, search, and bulk actions
- Social features: connections, sharing, messaging, notifications
- Profile & settings with theme and feature-flag controls
- Admin console for users, analytics, logs, reports, and system settings
- Real-time updates via WebSockets and client-side error reporting

## Architecture
- **Frontend:** `myBrain-web` (React + Vite)
- **Backend:** `myBrain-api` (Express + MongoDB + Socket.IO)
- **Feature flags:** `user.flags` controls optional features (calendar, images, files, projects, social, etc.)

## Project Structure
```
myBrain/
├── myBrain-web/           # Frontend (React + Vite)
│   ├── src/
│   │   ├── features/      # Feature modules
│   │   ├── components/    # Shared UI components
│   │   ├── store/         # Redux state management
│   │   └── lib/           # API client + utilities
│   └── package.json
│
├── myBrain-api/           # Backend (Express + MongoDB)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Mongoose models
│   │   ├── middleware/    # Auth, logging, etc.
│   │   └── services/      # Business logic
│   └── package.json
│
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1) Install dependencies
```bash
cd myBrain-web
npm install
cd ../myBrain-api
npm install
```

### 2) Configure environment variables
Frontend:
```bash
copy myBrain-web\\.env.example myBrain-web\\.env
```

Backend:
```bash
copy myBrain-api\\.env.example myBrain-api\\.env
```

### 3) Run the servers
Backend:
```bash
cd myBrain-api
npm run dev
```

Frontend:
```bash
cd myBrain-web
npm run dev
```

### 4) Verify
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health

## Scripts

### Frontend (`myBrain-web`)
```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:ui
npm run test:coverage
```

### Backend (`myBrain-api`)
```bash
npm run dev
npm run start
npm run test
npm run test:watch
npm run test:coverage
```

## Environment Variables

### Frontend (`myBrain-web/.env`)
```
VITE_API_URL=http://localhost:5000
VITE_ENV=development
```

### Backend (`myBrain-api/.env`)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mybrain?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
LOG_SAMPLE_RATE=0.1
LOG_SLOW_MS=1000
LOG_RETENTION_DAYS=90
```

## Tech Stack

### Frontend
- React 18, React Router
- Vite
- Redux Toolkit
- TanStack Query
- Tailwind CSS + Radix UI
- Recharts
- Socket.IO client
- Vitest + Testing Library

### Backend
- Express
- MongoDB + Mongoose
- JWT auth + cookie-based sessions
- Socket.IO
- AWS SDK (S3) + Multer + Sharp (file handling)
- Jest + Supertest

## API Modules (Backend)
Core routes include: auth, notes, tasks, filters, projects, events, files, folders, images, tags, life areas, dashboard, notifications, messages, connections, shares/item-shares, reports, analytics, logs, settings, users, api-keys, weather, and saved locations.

## License
MIT
