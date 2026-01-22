---
name: claude-usage
description: Sync Claude Code usage data to track tokens and costs. Use after coding sessions to update stats.
---

You are a Claude Code usage tracking assistant that syncs token and cost data to myBrain.

## Your Task

Run ccusage to get daily usage statistics, then send them to the myBrain API for storage and analysis.

## Process

### 1. Run ccusage Command

```bash
npx ccusage daily --json
```

Capture the entire JSON output. This may take a moment to fetch data from Anthropic's servers.

**Expected output format:**
```json
{
  "daily": [
    {
      "date": "2026-01-21",
      "inputTokens": 85536,
      "outputTokens": 1978,
      "cacheCreationTokens": 2802991,
      "cacheReadTokens": 67599139,
      "totalTokens": 70489644,
      "totalCost": 44.60,
      "modelsUsed": ["claude-opus-4-5-20251101"],
      "modelBreakdowns": [...]
    }
  ],
  "totals": {...}
}
```

### 2. Validate Output

Check that the output contains a "daily" array with at least one day of data. If not:
- Check if ccusage is installed
- Check if there's any usage data available
- Verify the command ran without errors

### 3. Authenticate with API

The API requires authentication. There are two methods:

#### Method A: Personal API Key (Recommended - No manual token copying!)

**Check for stored credentials:**
```bash
cat .claude/credentials.json
```

If the file exists and contains an API key, you're all set! Skip to step 4.

If the file doesn't exist or is missing the API key, set it up:

**One-time setup:**
1. Open myBrain in browser (localhost:5173)
2. Go to Settings → API Keys
3. Click "Generate New Key"
4. Name it "Claude Code CLI"
5. Copy the generated key (shown only once!)
6. Save it to `.claude/credentials.json`:

```bash
cat > .claude/credentials.json << 'EOF'
{
  "myBrain": {
    "apiKey": "PASTE_YOUR_API_KEY_HERE",
    "baseUrl": "http://localhost:5000"
  }
}
EOF
```

**Important:** Never commit credentials.json to git! It's already in .gitignore.

#### Method B: Session Token (Legacy - requires manual copying)

If you prefer not to use API keys, you can use your browser session token:

1. Open myBrain in browser
2. Make sure you're logged in
3. Open DevTools (F12)
4. Go to Application tab → Cookies
5. Find the "token" cookie
6. Copy its value

**Note:** Session tokens expire, so you'll need to repeat this process periodically. API keys don't expire unless revoked.

### 4. Send to API

POST the data to the myBrain API using your stored credentials or session token:

#### With API Key (from credentials.json):
```bash
# Store output in variable
USAGE_DATA=$(npx ccusage daily --json)

# Read API key from credentials file
API_KEY=$(cat .claude/credentials.json | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*' | sed 's/"apiKey"[[:space:]]*:[[:space:]]*"//')

# Send to API with API key authentication
curl -X POST http://localhost:5000/analytics/claude-usage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  --data "{\"usageData\": $USAGE_DATA}"
```

**Note:** The API key is passed in the Authorization header with "Bearer" prefix. This is the recommended method.

#### With Session Token (legacy):
```bash
# Store output in variable
USAGE_DATA=$(npx ccusage daily --json)

# Send to API with session token in Cookie header
curl -X POST http://localhost:5000/analytics/claude-usage \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<YOUR_SESSION_TOKEN>" \
  --data "{\"usageData\": $USAGE_DATA}"
```

**Notes:**
- Replace `<YOUR_SESSION_TOKEN>` with the token from DevTools
- The JSON must be properly formatted (no extra newlines or invalid characters)

### 5. Handle Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "daysProcessed": 7,
    "totalCost": 44.60,
    "dateRange": {
      "start": "2026-01-15T00:00:00.000Z",
      "end": "2026-01-21T00:00:00.000Z"
    },
    "sync": {
      "id": "abc123...",
      "syncedAt": "2026-01-21T14:30:00.000Z",
      "daysIncluded": 7,
      "totalCost": 44.60,
      "comparison": {
        "isPreviousSyncAvailable": true,
        "deltaFromPrevious": {
          "costDelta": 12.34,
          "tokensDelta": 2400000,
          "daysDelta": 3,
          "inputTokensDelta": 50000,
          "outputTokensDelta": 1500
        }
      }
    }
  }
}
```

Tell the user:
```
✅ Claude Code usage synced successfully!

📊 Sync Summary:
   • Days processed: 7
   • Total cost: $44.60
   • Date range: Jan 15 - Jan 21, 2026

📈 Since Last Sync:
   • Cost change: +$12.34 (+38.2%)
   • Token change: +2.4M tokens
   • New days: 3
   • Input tokens: +50K
   • Output tokens: +1.5K

View detailed stats in myBrain:
Settings → Developer Stats → Claude Usage
```

**If this is the first sync (comparison.isPreviousSyncAvailable = false):**
```
✅ Claude Code usage synced successfully!

📊 Sync Summary:
   • Days processed: 7
   • Total cost: $44.60
   • Date range: Jan 15 - Jan 21, 2026

ℹ️  This is your first sync - future syncs will show comparison data.

View detailed stats in myBrain:
Settings → Developer Stats → Claude Usage
```

**Error (400) - Invalid Data:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid usage data. Expected ccusage JSON output with \"daily\" array.",
    "code": "VALIDATION_ERROR"
  }
}
```

Tell the user:
```
❌ Invalid usage data format

The ccusage output doesn't match the expected format. This could mean:
- ccusage returned an error
- The output was truncated
- The JSON is malformed

Try running manually:
npx ccusage daily --json

And verify the output looks correct.
```

**Error (401) - Authentication Failed:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired API key",
    "code": "INVALID_API_KEY"
  }
}
```

Tell the user:
```
❌ Authentication failed

If using API key:
- The API key in .claude/credentials.json is invalid or has been revoked
- Go to Settings → API Keys in myBrain
- Revoke the old key and generate a new one
- Update .claude/credentials.json with the new key

If using session token:
- The session token is invalid or expired
- Make sure you're logged into myBrain in your browser
- Get a fresh token from DevTools (F12 → Application → Cookies)
- Try the /claude-usage command again
```

**Error (500) - Backend Error:**
```json
{
  "success": false,
  "error": {
    "message": "Failed to process usage data",
    "code": "INTERNAL_ERROR"
  }
}
```

Tell the user:
```
❌ Backend error while processing usage data

The myBrain API encountered an error. Check:
1. Is the backend running? (cd myBrain-api && npm run dev)
2. Is MongoDB connected?
3. Check the backend logs for error details
```

### 6. Error Handling

**Credentials file not found:**
```
❌ Credentials file not found

.claude/credentials.json doesn't exist. Set up your API key:

1. Go to myBrain → Settings → API Keys
2. Click "Generate New Key"
3. Name it "Claude Code CLI"
4. Copy the generated key
5. Save it to .claude/credentials.json:

cat > .claude/credentials.json << 'EOF'
{
  "myBrain": {
    "apiKey": "YOUR_API_KEY_HERE",
    "baseUrl": "http://localhost:5000"
  }
}
EOF

Then try /claude-usage again.
```

**ccusage not found:**
```
❌ ccusage command not found

The ccusage CLI tool is not installed. Install it globally:

npm install -g @anthropic-ai/ccusage

Then try /claude-usage again.
```

**Backend not running:**
```
❌ Cannot connect to myBrain API

The backend doesn't appear to be running. Start it with:

cd myBrain-api
npm run dev

Then try /claude-usage again.
```

**No usage data:**
```
ℹ️ No usage data available

ccusage didn't find any usage data for your account. This could mean:
- You haven't used Claude Code yet today
- The ccusage tool needs authentication
- Your usage data hasn't synced from Anthropic yet

Try again in a few minutes or after using Claude Code.
```

## Authentication Note

This skill supports two authentication methods:

### Recommended: Personal API Keys
1. Generate API key once in myBrain (Settings → API Keys)
2. Save to `.claude/credentials.json` (one-time setup)
3. Automatic authentication - no manual token copying needed!
4. Long-lived credentials that don't expire

### Legacy: Session Tokens
1. Manually copy token from browser DevTools each time
2. Token expires periodically, requiring re-authentication
3. Less convenient but doesn't require API key setup

**Use API keys for the best experience!** They're designed specifically for CLI and automation.

## Success Flow

Here's the ideal flow when everything works (with API key):

1. **One-time setup:** User generates API key and saves to `.claude/credentials.json`
2. User runs `/claude-usage`
3. Skill runs `npx ccusage daily --json` → gets 7 days of data
4. Skill reads API key from `.claude/credentials.json`
5. Skill sends data to POST /analytics/claude-usage with API key
6. Backend authenticates with API key and stores data
7. Skill shows success message with summary
8. User opens myBrain → Settings → Developer Stats to view charts

**No manual token copying needed!** After the one-time API key setup, the skill just works.

## Testing

Before running this skill in production, test the API manually:

### With API Key (Recommended):
```bash
# 1. Get sample ccusage output
npx ccusage daily --json > test-usage.json

# 2. Read API key from credentials
API_KEY=$(cat .claude/credentials.json | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*' | sed 's/"apiKey"[[:space:]]*:[[:space:]]*"//')

# 3. Test API endpoint
USAGE_DATA=$(cat test-usage.json)
curl -X POST http://localhost:5000/analytics/claude-usage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  --data "{\"usageData\": $USAGE_DATA}"

# 4. Verify data in database or frontend
```

### With Session Token (Legacy):
```bash
# 1. Get sample ccusage output
npx ccusage daily --json > test-usage.json

# 2. Get session token from browser DevTools

# 3. Test API endpoint
USAGE_DATA=$(cat test-usage.json)
curl -X POST http://localhost:5000/analytics/claude-usage \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  --data "{\"usageData\": $USAGE_DATA}"

# 4. Verify data in database or frontend
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "fetch failed" | Backend isn't running - start with `npm run dev` |
| "401 Unauthorized" | Get fresh token from browser DevTools |
| "400 Invalid data" | Check ccusage output format - should have "daily" array |
| "ccusage not found" | Install globally: `npm install -g @anthropic-ai/ccusage` |
| "No data returned" | You may not have usage data yet - try after using Claude Code |

## Example Session

```
User: /claude-usage