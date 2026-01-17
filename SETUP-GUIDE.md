# myBrain Setup Guide

## ✅ What's Done So Far

I've created the complete project structure for both frontend and backend:

### Frontend (myBrain-web) ✅
- React + Vite setup
- TailwindCSS configured with dark/light theme variables
- Redux Toolkit & TanStack Query installed
- All dependencies installed (404 packages)
- Folder structure created (features, components, store, lib, hooks)
- Basic App.jsx with test counter
- Environment variables configured

### Backend (myBrain-api) ✅
- Express server setup
- MongoDB + Mongoose installed
- JWT, bcrypt, CORS configured
- All dependencies installed (138 packages)
- Folder structure created (routes, models, middleware, services)
- Basic server.js with health check endpoint
- Environment variables template created

## 🔧 What You Need to Do Now

### Step 1: Set Up MongoDB Atlas (Required!)

The backend needs a database to work. Here's how to set it up (takes 5 minutes):

#### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google or email (it's FREE)
3. Fill in basic info

#### 1.2 Create a Database Cluster
1. Click "Build a Database"
2. Choose **FREE M0 tier** (512MB storage - plenty for V1!)
3. Choose cloud provider: **AWS** (or Google Cloud/Azure)
4. Choose region: Pick one closest to you (e.g., **us-east-1** for US East Coast)
5. Cluster name: Leave as "Cluster0" or name it "myBrain"
6. Click **"Create Cluster"** (takes 1-3 minutes to provision)

#### 1.3 Create Database User
1. You'll see "Security Quickstart"
2. **Username**: Choose a username (e.g., `mybrain-admin`)
3. **Password**: Click "Autogenerate Secure Password" and **SAVE IT!**
   - Or create your own (8+ characters, no special chars)
4. Click "Create User"

#### 1.4 Allow Your IP Address
1. Under "Where would you like to connect from?"
2. Click "Add My Current IP Address"
3. Or click "Allow Access from Anywhere" (easier for development)
   - This adds `0.0.0.0/0` (all IPs can connect)
4. Click "Finish and Close"

#### 1.5 Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Driver: **Node.js**
4. Version: **5.5 or later**
5. Copy the connection string:

```
mongodb+srv://mybrain-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. **Replace `<password>`** with the password you saved earlier
7. **Add database name** before `?` - change to:

```
mongodb+srv://mybrain-admin:YourPassword@cluster0.xxxxx.mongodb.net/mybrain?retryWrites=true&w=majority
```

#### 1.6 Add to Backend .env File
1. Open `myBrain-api/.env` in your editor
2. Find the line: `# MONGO_URI=mongodb+srv://...`
3. Remove the `#` and replace with your connection string:

```
MONGO_URI=mongodb+srv://mybrain-admin:YourPassword@cluster0.xxxxx.mongodb.net/mybrain?retryWrites=true&w=majority
```

4. Save the file

### Step 2: Test Backend Server

Open a terminal in the myBrain-api folder:

```bash
cd c:\Users\NewAdmin\Documents\myBrain\myBrain-api
npm run dev
```

**You should see:**
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
📡 Environment: development
🌐 CORS enabled for: http://localhost:5173
✨ Ready to receive requests!
```

**If you see an error:**
- Check your MONGO_URI has the correct password
- Check your MongoDB Atlas IP allowlist includes your IP

### Step 3: Test Frontend (In a New Terminal)

Open a **second terminal** in the myBrain-web folder:

```bash
cd c:\Users\NewAdmin\Documents\myBrain\myBrain-web
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### Step 4: Open in Browser

1. Open your browser to **http://localhost:5173**
2. You should see:
   - **"myBrain"** title
   - **"Your Second Brain - Frontend Running! 🚀"**
   - A blue button that counts when clicked
3. Click the button - the count should increase (this tests React works!)

### Step 5: Test Backend API

While frontend is running, open a new browser tab to:

**http://localhost:5000/health**

You should see JSON:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-17T..."
}
```

✅ If "database": "connected" - **YOU'RE DONE WITH SETUP!**

## 🎉 Success Checklist

- [ ] MongoDB Atlas cluster created (free tier)
- [ ] Database user created with password
- [ ] IP address whitelisted (0.0.0.0/0 for easy dev)
- [ ] Connection string added to `myBrain-api/.env`
- [ ] Backend running on http://localhost:5000
- [ ] Backend shows "MongoDB connected successfully"
- [ ] Frontend running on http://localhost:5173
- [ ] Frontend shows myBrain page with working button
- [ ] Health check shows "database": "connected"

## ❌ Troubleshooting

### Backend won't start
**Error: "MONGO_URI not found"**
- Check `myBrain-api/.env` file exists
- Make sure MONGO_URI line doesn't start with `#`

**Error: "MongooseServerSelectionError"**
- Wrong password in connection string
- IP not whitelisted in MongoDB Atlas
- Check MongoDB cluster is running (Atlas dashboard)

### Frontend won't start
**Error: "Cannot find module"**
- Run `npm install` again in myBrain-web folder

**Port 5173 already in use**
- Close any other Vite/React apps
- Or change port in `vite.config.js`

### Button doesn't count
- Check browser console for errors (F12)
- Try refreshing the page

## 📁 Project Files Created

```
myBrain/
├── myBrain-web/
│   ├── src/
│   │   ├── app/App.jsx          ✅ Main app component
│   │   ├── main.jsx             ✅ Entry point
│   │   └── styles/
│   │       ├── theme.css        ✅ Dark/light theme
│   │       └── globals.css      ✅ Global styles
│   ├── index.html               ✅ HTML template
│   ├── package.json             ✅ Dependencies
│   ├── vite.config.js           ✅ Vite config
│   ├── tailwind.config.js       ✅ Tailwind config
│   ├── .env                     ✅ Environment variables
│   └── .env.example             ✅ Template
│
├── myBrain-api/
│   ├── src/
│   │   └── server.js            ✅ Express server
│   ├── package.json             ✅ Dependencies
│   ├── .env                     ✅ Environment variables (YOU ADD MONGO_URI HERE!)
│   └── .env.example             ✅ Template
│
├── README.md                    ✅ Project overview
├── PLAN-SCALABLE.md             ✅ Full 4-week plan
└── SETUP-GUIDE.md               ✅ This file
```

## 🚀 Next Steps (After Setup Works)

Once both servers are running successfully:

1. I'll build the **authentication system** (Day 3-4)
   - User signup/login
   - JWT tokens
   - Password hashing

2. Then the **dynamic areas system** (Day 5-7)
   - Admin can add areas without code
   - Feature flags
   - Sidebar area switcher

3. Then **Notes feature** (Week 2)
   - Create/edit/search notes
   - Tags, pin, archive
   - Auto-save

## 💡 Tips

### Keep Both Terminals Open
- Terminal 1: Backend (myBrain-api) - `npm run dev`
- Terminal 2: Frontend (myBrain-web) - `npm run dev`
- Both need to run at the same time

### Hot Reload
- Backend: Automatically restarts when you edit files (using `--watch`)
- Frontend: Automatically refreshes browser when you edit files (Vite HMR)

### Stop Servers
- Press `Ctrl+C` in the terminal to stop a server
- You can start again with `npm run dev`

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Google the error (usually someone had the same issue)
3. Ask me! I can debug and fix it

---

**Once setup is complete, we're ready to start building features!** 🎉
