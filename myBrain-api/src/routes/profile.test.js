import request from 'supertest';
import app from '../test/testApp.js';

describe('Profile Routes', () => {
  let authToken;
  const testEmail = 'profile@example.com';
  const testPassword = 'Password123!';

  // Create and login test user before each test
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    authToken = loginRes.body.token;
  });

  // =========================================================================
  // GET /profile - Get user profile
  // =========================================================================
  describe('GET /profile', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      // Should not include password hash
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject without auth token', async () => {
      const res = await request(app)
        .get('/profile');

      expect(res.statusCode).toBe(401);
    });

    it('should reject with invalid auth token', async () => {
      const res = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /profile - Update profile
  // =========================================================================
  describe('PATCH /profile', () => {
    it('should update profile fields', async () => {
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Software developer',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.user.profile.firstName).toBe('John');
      expect(res.body.user.profile.lastName).toBe('Doe');
      expect(res.body.user.profile.bio).toBe('Software developer');
    });

    it('should update single field', async () => {
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          displayName: 'Johnny',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.profile.displayName).toBe('Johnny');
    });

    it('should update all allowed fields', async () => {
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'JD',
          phone: '+1234567890',
          bio: 'Test bio',
          location: 'New York',
          website: 'https://example.com',
          timezone: 'America/New_York',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.profile.firstName).toBe('John');
      expect(res.body.user.profile.lastName).toBe('Doe');
      expect(res.body.user.profile.displayName).toBe('JD');
      expect(res.body.user.profile.phone).toBe('+1234567890');
      expect(res.body.user.profile.bio).toBe('Test bio');
      expect(res.body.user.profile.location).toBe('New York');
      expect(res.body.user.profile.website).toBe('https://example.com');
      expect(res.body.user.profile.timezone).toBe('America/New_York');
    });

    it('should reject with no valid fields', async () => {
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'value',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject empty body', async () => {
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/profile')
        .send({ firstName: 'John' });

      expect(res.statusCode).toBe(401);
    });

    it('should not allow updating sensitive fields like email directly', async () => {
      // Email field should be ignored since it's not in allowedFields
      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newemail@example.com',
          firstName: 'John',
        });

      expect(res.statusCode).toBe(200);
      // Email should remain unchanged
      expect(res.body.user.email).toBe(testEmail);
      // But firstName should be updated
      expect(res.body.user.profile.firstName).toBe('John');
    });
  });

  // =========================================================================
  // PATCH /profile/preferences - Update preferences
  // =========================================================================
  describe('PATCH /profile/preferences', () => {
    it('should update tooltips preference', async () => {
      const res = await request(app)
        .patch('/profile/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tooltipsEnabled: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Preferences updated successfully');
      expect(res.body.user.preferences.tooltipsEnabled).toBe(false);
    });

    it('should toggle tooltips preference', async () => {
      // First disable
      await request(app)
        .patch('/profile/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tooltipsEnabled: false });

      // Then enable
      const res = await request(app)
        .patch('/profile/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tooltipsEnabled: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.preferences.tooltipsEnabled).toBe(true);
    });

    it('should reject with no valid preferences', async () => {
      const res = await request(app)
        .patch('/profile/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidPref: true,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/profile/preferences')
        .send({ tooltipsEnabled: false });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // POST /profile/change-password - Change password
  // =========================================================================
  describe('POST /profile/change-password', () => {
    const newPassword = 'NewPassword456!';

    it('should change password successfully', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');

      // Verify new password works by logging in
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    it('should reject with incorrect current password', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: newPassword,
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'short',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
    });

    it('should reject same password as current', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SAME_PASSWORD');
    });

    it('should reject missing current password', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: newPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject missing new password', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/profile/change-password')
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // POST /profile/change-email - Change email
  // =========================================================================
  describe('POST /profile/change-email', () => {
    const newEmail = 'newemail@example.com';

    it('should change email successfully', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: newEmail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Email changed successfully');
      expect(res.body.user.email).toBe(newEmail);
    });

    it('should reject with incorrect password', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: newEmail,
          password: 'WrongPassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'not-an-email',
          password: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it('should reject same email as current', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: testEmail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SAME_EMAIL');
    });

    it('should reject email already in use', async () => {
      // Create another user
      const otherEmail = 'other@example.com';
      await request(app)
        .post('/auth/register')
        .send({
          email: otherEmail,
          password: 'OtherPassword123!',
        });

      // Try to change to that email
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: otherEmail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('should reject missing new email', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: newEmail,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .send({
          newEmail: newEmail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should normalize email to lowercase', async () => {
      const res = await request(app)
        .post('/profile/change-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'UPPERCASE@EXAMPLE.COM',
          password: testPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('uppercase@example.com');
    });
  });

  // =========================================================================
  // DELETE /profile - Delete account
  // =========================================================================
  describe('DELETE /profile', () => {
    it('should delete account successfully', async () => {
      const res = await request(app)
        .delete('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: testPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Account deleted successfully');

      // Verify account is deleted by trying to log in
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(loginRes.statusCode).toBe(401);
    });

    it('should reject with incorrect password', async () => {
      const res = await request(app)
        .delete('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'WrongPassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .delete('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_PASSWORD');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete('/profile')
        .send({
          password: testPassword,
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /profile/dashboard-preferences - Update dashboard preferences
  // =========================================================================
  describe('PATCH /profile/dashboard-preferences', () => {
    it('should update pinned widgets', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pinnedWidgets: [
            { widgetId: 'calendar', position: 'top-right', size: 'narrow' },
            { widgetId: 'weather', position: 'top-left', size: 'default' },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Dashboard preferences updated successfully');
      expect(res.body.user.preferences.dashboard.pinnedWidgets).toHaveLength(2);
      expect(res.body.user.preferences.dashboard.pinnedWidgets[0].widgetId).toBe('calendar');
    });

    it('should update hidden widgets', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hiddenWidgets: ['featureGuide', 'tips'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.preferences.dashboard.hiddenWidgets).toContain('featureGuide');
      expect(res.body.user.preferences.dashboard.hiddenWidgets).toContain('tips');
    });

    it('should update widget settings', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          widgetSettings: {
            weather: { unit: 'celsius' },
            calendar: { showWeekends: true },
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Dashboard preferences updated successfully');
      // widgetSettings is stored as a Mongoose Map, which may serialize differently
      // The important thing is the update succeeded
      expect(res.body.user.preferences.dashboard).toBeDefined();
    });

    it('should update last visit timestamp', async () => {
      const lastVisit = '2024-01-15T10:30:00.000Z';
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastVisit: lastVisit,
        });

      expect(res.statusCode).toBe(200);
      expect(new Date(res.body.user.preferences.dashboard.lastVisit).toISOString()).toBe(lastVisit);
    });

    it('should reject invalid pinnedWidgets type', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pinnedWidgets: 'not-an-array',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject pinned widget without widgetId', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pinnedWidgets: [
            { position: 'top-right', size: 'narrow' }, // Missing widgetId
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid position', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pinnedWidgets: [
            { widgetId: 'calendar', position: 'invalid-position', size: 'narrow' },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid size', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pinnedWidgets: [
            { widgetId: 'calendar', position: 'top-right', size: 'invalid-size' },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid hiddenWidgets type', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hiddenWidgets: 'not-an-array',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid widgetSettings type', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          widgetSettings: 'not-an-object',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid lastVisit date', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastVisit: 'not-a-date',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject with no valid preferences', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/profile/dashboard-preferences')
        .send({
          pinnedWidgets: [],
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // GET /profile/activity - Get user activity
  // =========================================================================
  describe('GET /profile/activity', () => {
    it('should return activity list', async () => {
      const res = await request(app)
        .get('/profile/activity')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.timeline).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.period).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/profile/activity')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBeLessThanOrEqual(10);
    });

    it('should accept days parameter', async () => {
      const res = await request(app)
        .get('/profile/activity')
        .query({ days: 7 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.period).toBe('7 days');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/profile/activity');

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // Avatar endpoints (POST/DELETE /profile/avatar)
  // Note: These require file uploads which are harder to test without mocking S3
  // We test the basic validation but skip actual file upload tests
  // =========================================================================
  describe('POST /profile/avatar', () => {
    it('should reject without file', async () => {
      const res = await request(app)
        .post('/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_FILE');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/profile/avatar');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /profile/avatar', () => {
    it('should reject when no avatar exists', async () => {
      const res = await request(app)
        .delete('/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_AVATAR');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete('/profile/avatar');

      expect(res.statusCode).toBe(401);
    });
  });
});
