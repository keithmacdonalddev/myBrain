# Environment Variables

---

## Frontend (myBrain-web/.env)

```env
VITE_API_URL=http://localhost:5000
```

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

**Note:** Vite requires `VITE_` prefix for client-side env vars.

---

## Backend (myBrain-api/.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_SAMPLE_RATE=0.1
LOG_RETENTION_DAYS=90

# AWS S3 (file storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

| Variable | Purpose | Required |
|----------|---------|----------|
| `NODE_ENV` | Environment mode | Yes |
| `PORT` | Server port | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CORS_ORIGIN` | Allowed frontend origin | Yes |
| `LOG_SAMPLE_RATE` | Logging sample rate | No (default 0.1) |
| `LOG_RETENTION_DAYS` | Log retention period | No (default 90) |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes (for file uploads) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes (for file uploads) |
| `AWS_REGION` | AWS region | Yes (for file uploads) |
| `AWS_S3_BUCKET` | S3 bucket name | Yes (for file uploads) |

---

## Production Values

**Never commit these to git.** Production environment variables are set in:
- **Vercel** (frontend): Project Settings → Environment Variables
- **Render** (backend): Service Settings → Environment

| Variable | Production Value |
|----------|------------------|
| `VITE_API_URL` | `https://mybrain-api.onrender.com` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://my-brain-gules.vercel.app` |

---

## Adding New Environment Variables

1. **Add to .env.example** (template file, safe to commit)
2. **Add to local .env** (never committed)
3. **Add to production** (Vercel/Render dashboard)
4. **Update this file** with the new variable

### Frontend Usage
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

### Backend Usage
```javascript
const secret = process.env.JWT_SECRET;
```

---

## Troubleshooting

### "Cannot read environment variable"

**Frontend:**
- Must have `VITE_` prefix
- Restart dev server after changes
- Check file is named `.env` not `.env.local`

**Backend:**
- Check `dotenv` is loaded early in server.js
- Restart server after changes
- Check no typos in variable name

### "API calls failing in production"

- Check `CORS_ORIGIN` matches frontend URL exactly
- Check `VITE_API_URL` points to production backend
- Verify environment variables are set in hosting dashboard
