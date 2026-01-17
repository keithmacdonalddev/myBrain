# myBrain Deployment Guide

This guide covers deploying myBrain to production using free tier services.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Render        │────▶│  MongoDB Atlas  │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
│   React + Vite  │     │   Express API   │     │   Free Tier     │
│   Free Tier     │     │   Free Tier     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

1. **GitHub Account** - Code hosted on GitHub
2. **MongoDB Atlas Account** - Database (already set up)
3. **Vercel Account** - Frontend hosting
4. **Render Account** - Backend hosting

---

## Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
cd myBrain
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/myBrain.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: mybrain-api
   - **Root Directory**: myBrain-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | NODE_ENV | production |
   | PORT | 10000 |
   | MONGO_URI | (your MongoDB Atlas connection string) |
   | JWT_SECRET | (click "Generate" for a random secret) |
   | CORS_ORIGIN | (leave blank for now, add Vercel URL later) |
   | LOG_SAMPLE_RATE | 0.1 |
   | LOG_RETENTION_DAYS | 90 |

6. Click **Create Web Service**
7. Wait for deployment (may take 5-10 minutes)
8. Note your API URL: `https://mybrain-api-xxxx.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New...** → **Project**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: myBrain-web
   - **Build Command**: `npm run build`
   - **Output Directory**: dist

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | VITE_API_URL | https://mybrain-api-xxxx.onrender.com |

6. Click **Deploy**
7. Wait for deployment
8. Note your frontend URL: `https://mybrain-xxxx.vercel.app`

---

## Step 4: Update CORS on Render

1. Go back to Render dashboard
2. Select your mybrain-api service
3. Go to **Environment** tab
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   https://mybrain-xxxx.vercel.app
   ```
5. Click **Save Changes**
6. The service will automatically redeploy

---

## Step 5: Test Production

1. Open your Vercel URL
2. Create a new account
3. Login and test:
   - Create a note
   - Pin/archive notes
   - Check the dashboard
   - Toggle dark/light mode

---

## Troubleshooting

### API not responding
- Check Render logs for errors
- Verify MONGO_URI is correct
- Make sure JWT_SECRET is set

### CORS errors
- Verify CORS_ORIGIN matches your Vercel URL exactly
- Don't include trailing slash

### Cold starts (Render free tier)
- First request after inactivity may take 30-60 seconds
- This is normal for free tier, the app "wakes up"

### Database connection issues
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for Render)
- Verify connection string format

---

## Custom Domain (Optional)

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS as instructed

### Render (Backend)
1. Go to Service Settings → Custom Domains
2. Add your API subdomain (e.g., api.yourdomain.com)
3. Update DNS as instructed
4. Update CORS_ORIGIN and VITE_API_URL

---

## Upgrading from Free Tier

When you outgrow the free tier:

| Service | Free Limits | Paid Recommendation |
|---------|-------------|---------------------|
| Vercel | 100GB bandwidth | Pro ($20/mo) |
| Render | 750 hours/mo, cold starts | Starter ($7/mo) |
| MongoDB | 512MB storage | M10 ($9/mo) |

---

## Environment Variables Summary

### Backend (Render)
```env
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://...
JWT_SECRET=random-generated-secret
CORS_ORIGIN=https://your-app.vercel.app
LOG_SAMPLE_RATE=0.1
LOG_RETENTION_DAYS=90
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-api.onrender.com
```
