---
paths:
  - "myBrain-api/src/middleware/auth.js"
  - "myBrain-api/src/routes/auth.js"
  - "myBrain-api/src/routes/profile.js"
  - "myBrain-api/src/routes/admin.js"
  - "**/*password*"
  - "**/*token*"
  - "**/*secret*"
---

## Quick Reference
- Never trust user input - always validate, sanitize, and authorize
- Passwords: bcrypt with 12 rounds, never plain text
- JWTs: HttpOnly cookies only, never localStorage
- Always verify ownership: 404 if not found, 403 if wrong user
- Admin routes: always use `requireAdmin` middleware
- Validate ObjectIds before database queries
- Never log passwords/tokens, never return password in responses

---

# Security Rules

## Core Principle

**Never trust user input. Always validate, sanitize, and authorize.**

## Authentication

### Password Handling

**NEVER store plain text passwords:**

```javascript
// Good - use bcrypt
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(inputPassword, hashedPassword);

// Bad - NEVER do this
user.password = password;  // Plain text!
```

### JWT Tokens

**Store in HttpOnly cookies, not localStorage:**

```javascript
// Good - HttpOnly cookie (can't be accessed by JavaScript)
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Bad - localStorage (vulnerable to XSS)
res.json({ token });  // Client stores in localStorage
```

### Token Validation

**Always verify tokens:**

```javascript
import jwt from 'jsonwebtoken';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
} catch (err) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

## Authorization

### Always Check Ownership

**Every route accessing user data must verify ownership:**

```javascript
// Good - verify user owns the resource
const note = await Note.findById(req.params.id);

if (!note) {
  return res.status(404).json({ error: 'Not found' });
}

if (note.userId.toString() !== req.user._id.toString()) {
  return res.status(403).json({ error: 'Access denied' });
}

// Bad - no ownership check (anyone can access!)
const note = await Note.findById(req.params.id);
res.json(note);
```

### Admin Routes

**Always use requireAdmin middleware:**

```javascript
import { requireAuth, requireAdmin } from '../middleware/auth.js';

// Good - protected admin route
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  // ...
});

// Bad - unprotected admin functionality
router.get('/admin/users', async (req, res) => {
  // Anyone can access!
});
```

## Input Validation

### Validate All Input

```javascript
// Good - validate before using
const { title, content } = req.body;

if (!title || typeof title !== 'string' || title.length > 200) {
  return res.status(400).json({ error: 'Invalid title' });
}

// Bad - trust user input
const { title } = req.body;
note.title = title;  // Could be anything!
```

### Sanitize for XSS

```javascript
import sanitizeHtml from 'sanitize-html';

// Good - sanitize HTML content
const cleanContent = sanitizeHtml(req.body.content, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: { 'a': ['href'] }
});

// Bad - store raw HTML
note.content = req.body.content;  // XSS vulnerability!
```

### Validate ObjectIds

```javascript
import mongoose from 'mongoose';

// Good - validate ID format
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ error: 'Invalid ID format' });
}

// Bad - pass invalid ID to database
const note = await Note.findById(req.params.id);  // Could throw
```

## SQL/NoSQL Injection Prevention

### Use Parameterized Queries

```javascript
// Good - Mongoose handles escaping
const notes = await Note.find({ userId: req.user._id, title: req.query.search });

// Bad - string concatenation (if using raw queries)
const query = `{ title: "${req.query.search}" }`;  // Injection risk!
```

### Sanitize Query Operators

```javascript
// Good - prevent NoSQL injection
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());

// Or manually:
const sanitizedQuery = JSON.parse(
  JSON.stringify(req.query).replace(/\$|\./g, '')
);
```

## Rate Limiting

**Protect sensitive endpoints:**

```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: { error: 'Too many attempts, please try again later' }
});

router.post('/login', authLimiter, async (req, res) => {
  // ...
});
```

## Sensitive Data

### Never Log Sensitive Data

```javascript
// Good - redact sensitive fields
console.log('User login:', { email: user.email, id: user._id });

// Bad - logging passwords/tokens
console.log('Login attempt:', req.body);  // Includes password!
```

### Never Return Passwords

```javascript
// Good - exclude password from response
const user = await User.findById(id).select('-password');
res.json(user);

// Or use toJSON transform in model
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

// Bad - returning user with password
const user = await User.findById(id);
res.json(user);  // Includes hashed password!
```

## CORS

**Configure CORS properly:**

```javascript
// Good - specific origin
app.use(cors({
  origin: process.env.CORS_ORIGIN,  // 'https://yourdomain.com'
  credentials: true
}));

// Bad in production - allow all origins
app.use(cors());  // Anyone can make requests!
```

## File Uploads

**Validate file types and sizes:**

```javascript
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024  // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Environment Variables

**Never commit secrets:**

```javascript
// .env (never committed)
JWT_SECRET=your-secret-key
MONGO_URI=mongodb+srv://...

// .gitignore
.env
.env.local
```

## Security Checklist for New Routes

Before deploying any new route, verify:

- [ ] Uses `requireAuth` if it accesses user data
- [ ] Uses `requireAdmin` if it's admin-only
- [ ] Validates all input parameters
- [ ] Checks resource ownership before access/modification
- [ ] Sanitizes any HTML content
- [ ] Doesn't expose sensitive data in response
- [ ] Has rate limiting (for auth endpoints)
- [ ] Logs the action for audit trail
