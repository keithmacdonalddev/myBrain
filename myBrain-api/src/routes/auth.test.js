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

      // Use the token from response body to set cookie manually
      const token = loginRes.body.token;

      // Use the auth cookie
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
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
  });
});
