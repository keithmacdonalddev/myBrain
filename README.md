# myBrain - Your Second Brain

A scalable personal productivity platform built with a plugin-style architecture.

## 🎯 Vision

This is not just a notes app - it's a platform designed to expand to include:
- ✅ Notes (V1)
- 🔜 Fitness tracking
- 🔜 Knowledge base
- 🔜 Messages
- 🔜 And more features you'll add dynamically!

## 🏗️ Architecture

**Two Separate Projects:**
1. **myBrain-web** - React frontend (deployed to Vercel)
2. **myBrain-api** - Express backend (deployed to Render)

**Plugin-Style Features:**
- Each feature is self-contained (Notes, Fitness, KB, etc.)
- Admin can add/remove areas without code deployment
- Feature flags for beta testing

## 📁 Project Structure

```
myBrain/
├── myBrain-web/           # Frontend (React + Vite)
│   ├── src/
│   │   ├── features/      # Plugin-style features
│   │   ├── components/    # Shared UI components
│   │   ├── store/         # Redux state management
│   │   └── lib/           # Utilities
│   └── package.json
│
├── myBrain-api/           # Backend (Express + MongoDB)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Auth, logging, etc.
│   │   └── services/      # Business logic
│   └── package.json
│
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier is fine)
- A code editor (VS Code recommended)

### 1. Install Frontend Dependencies

```bash
cd myBrain-web
npm install
```

### 2. Install Backend Dependencies

```bash
cd ../myBrain-api
npm install
```

### 3. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Paste it in `myBrain-api/.env` as `MONGO_URI`
   - Replace `<password>` with your actual database password
   - Replace `myFirstDatabase` with `mybrain`

Example:
```
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/mybrain?retryWrites=true&w=majority
```

### 4. Run the Servers

**Terminal 1 - Backend:**
```bash
cd myBrain-api
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd myBrain-web
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 5. Test It Works

- Open browser to http://localhost:5173
- You should see "myBrain - Frontend Running! 🚀"
- Click the counter button to test React
- Open http://localhost:5000/health - should show database: "connected"

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool (super fast!)
- **Redux Toolkit** - Global state management
- **TanStack Query** - Server data fetching/caching
- **React Router** - Navigation
- **TailwindCSS** - Styling
- **Radix UI** - Accessible components

### Backend
- **Express** - Web server
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

## 📋 Development Plan

Follow [PLAN-SCALABLE.md](./PLAN-SCALABLE.md) for the full 4-week implementation plan.

**Current Status:** ✅ Day 1-2 Complete (Project Setup)

**Next Steps:**
- Day 3-4: Authentication system
- Day 5-7: Dynamic areas system
- Week 2: Notes feature
- Week 3: Admin panel
- Week 4: Deploy!

## 🎨 Features

### V1 (4 weeks)
- ✅ User authentication (signup/login)
- ✅ Notes (create, edit, search, tags, pin, archive)
- ✅ Dashboard (continue, quick capture, recent activity)
- ✅ Admin panel (manage users, areas, logs)
- ✅ Dynamic area management (add areas without code!)
- ✅ Feature flags (beta testing)
- ✅ Professional logging (wide events + tail sampling)
- ✅ Dark/light theme
- ✅ Toast notifications with undo

### V2+ (Future)
- 🔜 Fitness tracking
- 🔜 Knowledge base
- 🔜 Messages
- 🔜 Whatever else you want to add!

## 💰 Cost

**Development:** FREE (using AI agents!)

**Hosting:**
- Vercel (frontend): $0/month (free tier)
- Render (backend): $0/month (free tier with cold starts)
- MongoDB Atlas: $0/month (512MB free = ~50,000 notes)

**Total: $0/month** for personal use!

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens in HttpOnly cookies
- CORS protection
- Rate limiting on auth endpoints
- Input validation
- Safe error messages (no stack traces to users)

## 📝 Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
VITE_ENV=development
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>
CORS_ORIGIN=http://localhost:5173
LOG_SAMPLE_RATE=0.1
LOG_SLOW_MS=1000
LOG_RETENTION_DAYS=90
```

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt it!

## 📄 License

MIT

---

**Built with ❤️ using AI agents and a scalable architecture**
