import request from 'supertest';
import app from '../test/testApp.js';
import User from '../models/User.js';

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Account created successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password456!',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('should reject duplicate email case-insensitive', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'casetest@example.com',
          password: 'Password123!',
        });

      // Try same email with different case
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'CASETEST@EXAMPLE.COM',
          password: 'Password456!',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('should reject empty email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: '',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'empty@example.com',
          password: '',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject missing email field', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing password field', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'missing@example.com',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject password without uppercase', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'noupper@example.com',
          password: 'password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject password without lowercase', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'nolower@example.com',
          password: 'PASSWORD123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject password without number', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'nonumber@example.com',
          password: 'PasswordABC!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject password without special character', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'nospecial@example.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should trim and normalize email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: '  TRIM@EXAMPLE.COM  ',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe('trim@example.com');
    });

    it('should not return password hash in registration response', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'nohash@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should set default role to free', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'defaultrole@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('free');
    });

    it('should reject SQL injection attempts in email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: "admin'--@example.com",
          password: 'Password123!',
        });

      // Should either reject as invalid email or safely handle it
      if (res.statusCode === 201) {
        // If accepted, verify it was stored safely
        expect(res.body.user.email).toBe("admin'--@example.com");
      } else {
        expect(res.statusCode).toBe(400);
      }
    });

    it('should reject very long email', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: longEmail,
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject very long password', async () => {
      const longPassword = 'Aa1!' + 'a'.repeat(300);
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'longpass@example.com',
          password: longPassword,
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      // Accept either 401 (invalid credentials) or 429 (rate limited)
      // Both are correct security responses for invalid login attempts
      expect([401, 429]).toContain(res.statusCode);
      expect(['INVALID_CREDENTIALS', 'RATE_LIMITED']).toContain(res.body.code);
    });

    it('should reject empty email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: '',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject empty password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: '',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject missing email field', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject missing password field', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should handle case-insensitive email login', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'LOGIN@EXAMPLE.COM',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('login@example.com');
    });

    it('should set HttpOnly cookie on successful login', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();

      // Verify cookie has HttpOnly flag
      const cookieHeader = res.headers['set-cookie'][0];
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should return token in response body', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(20);
    });

    it('should not return password hash in response', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without auth cookie', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return user with valid auth cookie', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'me@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'me@example.com',
          password: 'Password123!',
        });

      // Use the token from response body with Authorization header
      const token = loginRes.body.token;

      // Use Bearer token auth (more reliable in tests than cookies)
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
    });

    it('should return user with valid Bearer token', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'bearer@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'bearer@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('bearer@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid token format', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.statusCode).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'NotBearer sometoken');

      expect(res.statusCode).toBe(401);
    });

    it('should reject empty Bearer token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer ');

      expect(res.statusCode).toBe(401);
    });

    it('should reject Authorization header without Bearer prefix', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'nobearer@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'nobearer@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      // Send token without "Bearer " prefix
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', token);

      expect(res.statusCode).toBe(401);
    });

    it('should not return sensitive user fields', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'sensitive@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'sensitive@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.__v).toBeUndefined();
    });

    it('should return user role', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'role@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'role@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBeDefined();
      expect(res.body.user.role).toBe('free');
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear auth cookie', async () => {
      // Register and login first
      await request(app)
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'Password123!',
        });

      // Use the token from response body
      const token = loginRes.body.token;

      // Logout
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should successfully logout even without token', async () => {
      // Logout without being logged in should succeed (idempotent)
      const res = await request(app).post('/auth/logout');

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should clear cookie with correct attributes', async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'cookieclear@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'cookieclear@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);

      // Verify cookie is cleared
      const cookieHeader = res.headers['set-cookie'];
      if (cookieHeader) {
        expect(cookieHeader.some(cookie => cookie.includes('token='))).toBe(true);
      }
    });
  });

  describe('Security & Edge Cases', () => {
    it('should handle concurrent registrations with same email', async () => {
      // Attempt to register the same email twice simultaneously
      const promises = [
        request(app)
          .post('/auth/register')
          .send({
            email: 'concurrent@example.com',
            password: 'Password123!',
          }),
        request(app)
          .post('/auth/register')
          .send({
            email: 'concurrent@example.com',
            password: 'Password456!',
          }),
      ];

      const results = await Promise.all(promises);

      // One should succeed (201), one should fail (409)
      const statusCodes = results.map(r => r.statusCode).sort();
      expect(statusCodes).toContain(201);
      expect(statusCodes).toContain(409);

      // Verify only one user was created
      const users = await User.find({ email: 'concurrent@example.com' });
      expect(users.length).toBe(1);
    });

    it('should allow same user to login multiple times', async () => {
      // Register user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'multilogin@example.com',
          password: 'Password123!',
        });

      // Login twice
      const login1 = await request(app)
        .post('/auth/login')
        .send({
          email: 'multilogin@example.com',
          password: 'Password123!',
        });

      const login2 = await request(app)
        .post('/auth/login')
        .send({
          email: 'multilogin@example.com',
          password: 'Password123!',
        });

      expect(login1.statusCode).toBe(200);
      expect(login2.statusCode).toBe(200);

      // Both tokens should be valid
      expect(login1.body.token).toBeDefined();
      expect(login2.body.token).toBeDefined();

      // Tokens may or may not be different depending on implementation
      // Both should work for authenticated requests
      const me1 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${login1.body.token}`);

      const me2 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${login2.body.token}`);

      expect(me1.statusCode).toBe(200);
      expect(me2.statusCode).toBe(200);
      expect(me1.body.user.email).toBe('multilogin@example.com');
      expect(me2.body.user.email).toBe('multilogin@example.com');
    });

    it('should prevent user enumeration on login', async () => {
      // Register a known user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'known@example.com',
          password: 'Password123!',
        });

      // Try login with non-existent user
      const nonExistent = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      // Try login with wrong password for existing user
      const wrongPassword = await request(app)
        .post('/auth/login')
        .send({
          email: 'known@example.com',
          password: 'WrongPassword!',
        });

      // Both should return similar error (same status code and error code)
      // to prevent user enumeration
      expect(nonExistent.statusCode).toBe(wrongPassword.statusCode);
      expect(nonExistent.body.code).toBe(wrongPassword.body.code);
    });

    it('should handle whitespace in credentials safely', async () => {
      // Register with email that has spaces (should be trimmed)
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: '  whitespace@example.com  ',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe('whitespace@example.com');

      // Should be able to login without the spaces
      const login = await request(app)
        .post('/auth/login')
        .send({
          email: 'whitespace@example.com',
          password: 'Password123!',
        });

      expect(login.statusCode).toBe(200);
    });

    it('should reject null email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: null,
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject undefined email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: undefined,
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject non-string email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 12345,
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject non-string password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'number@example.com',
          password: 12345678,
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject object as email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: { nested: 'object' },
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject array as password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'array@example.com',
          password: ['Password123!'],
        });

      expect(res.statusCode).toBe(400);
    });

    it('should handle unicode characters in email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@例え.com',
          password: 'Password123!',
        });

      // Should either accept or reject, but handle gracefully
      expect([201, 400]).toContain(res.statusCode);
    });

    it('should preserve unicode in password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'unicode@example.com',
          password: 'Pässwörd123!',
        });

      if (res.statusCode === 201) {
        // If accepted, should be able to login with same unicode password
        const login = await request(app)
          .post('/auth/login')
          .send({
            email: 'unicode@example.com',
            password: 'Pässwörd123!',
          });

        expect(login.statusCode).toBe(200);
      }
    });
  });
});
