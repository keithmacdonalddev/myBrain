import mongoose from 'mongoose';
import request from 'supertest';
import app from '../testApp.js';

// Database connection is handled by the global setup (src/test/setup.js)
// which is configured in jest.config.js via setupFilesAfterEnv.
// We only need to clear collections between tests for isolation.

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Helper Functions for Integration Tests
 */

/**
 * Creates a new user and returns authentication credentials
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, token: string}>} User object and auth token
 */
export async function createAuthenticatedUser(email, password = 'Password123!') {
  // Register the user
  const registerRes = await request(app)
    .post('/auth/register')
    .send({ email, password });

  if (registerRes.statusCode !== 201) {
    throw new Error(`Failed to register user: ${registerRes.body.error?.message || 'Unknown error'}`);
  }

  // Login to get token
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email, password });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Failed to login user: ${loginRes.body.error?.message || 'Unknown error'}`);
  }

  return {
    user: loginRes.body.user,
    token: loginRes.body.token,
  };
}

/**
 * Creates a note for a user
 *
 * @param {string} token - Auth token
 * @param {Object} noteData - Note data
 * @returns {Promise<Object>} Created note
 */
export async function createNote(token, noteData) {
  const res = await request(app)
    .post('/notes')
    .set('Authorization', `Bearer ${token}`)
    .send(noteData);

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create note: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.note;
}

/**
 * Creates a task for a user
 *
 * @param {string} token - Auth token
 * @param {Object} taskData - Task data (use 'body' field for description, not 'description')
 * @returns {Promise<Object>} Created task
 */
export async function createTask(token, taskData) {
  const res = await request(app)
    .post('/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send(taskData);

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create task: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.task;
}

/**
 * Creates a project for a user
 *
 * @param {string} token - Auth token
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createProject(token, projectData) {
  const res = await request(app)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send(projectData);

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create project: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.project;
}

/**
 * Converts a note to a task
 *
 * @param {string} token - Auth token
 * @param {string} noteId - Note ID
 * @param {boolean} keepNote - Whether to keep the note after conversion
 * @returns {Promise<{task: Object, note: Object|null}>} Created task and note (if kept)
 */
export async function convertNoteToTask(token, noteId, keepNote = true) {
  const res = await request(app)
    .post(`/notes/${noteId}/convert-to-task`)
    .set('Authorization', `Bearer ${token}`)
    .send({ keepNote });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to convert note to task: ${res.body.error?.message || 'Unknown error'}`);
  }

  return {
    task: res.body.task,
    note: res.body.note,
  };
}

/**
 * Links a task to a project
 *
 * @param {string} token - Auth token
 * @param {string} projectId - Project ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated project
 */
export async function linkTaskToProject(token, projectId, taskId) {
  const res = await request(app)
    .post(`/projects/${projectId}/link-task`)
    .set('Authorization', `Bearer ${token}`)
    .send({ taskId });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to link task to project: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.project;
}

/**
 * Marks a task as complete
 *
 * @param {string} token - Auth token
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export async function completeTask(token, taskId) {
  const res = await request(app)
    .post(`/tasks/${taskId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'done' });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to complete task: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.task;
}

/**
 * Archives a project
 *
 * @param {string} token - Auth token
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Updated project
 */
export async function archiveProject(token, projectId) {
  const res = await request(app)
    .post(`/projects/${projectId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'completed' });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to archive project: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.project;
}

/**
 * Gets a note by ID
 *
 * @param {string} token - Auth token
 * @param {string} noteId - Note ID
 * @returns {Promise<Object|null>} Note object or null if not found
 */
export async function getNote(token, noteId) {
  const res = await request(app)
    .get(`/notes/${noteId}`)
    .set('Authorization', `Bearer ${token}`);

  if (res.statusCode === 404) {
    return null;
  }

  if (res.statusCode !== 200) {
    throw new Error(`Failed to get note: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.note;
}

/**
 * Gets a task by ID
 *
 * @param {string} token - Auth token
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTask(token, taskId) {
  const res = await request(app)
    .get(`/tasks/${taskId}`)
    .set('Authorization', `Bearer ${token}`);

  if (res.statusCode === 404) {
    return null;
  }

  if (res.statusCode !== 200) {
    throw new Error(`Failed to get task: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.task;
}

/**
 * Gets a project by ID
 *
 * @param {string} token - Auth token
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Project object or null if not found
 */
export async function getProject(token, projectId) {
  const res = await request(app)
    .get(`/projects/${projectId}`)
    .set('Authorization', `Bearer ${token}`);

  if (res.statusCode === 404) {
    return null;
  }

  if (res.statusCode !== 200) {
    throw new Error(`Failed to get project: ${res.body.error?.message || 'Unknown error'}`);
  }

  return res.body.project;
}

/**
 * Logs out a user
 *
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export async function logout(token) {
  const res = await request(app)
    .post('/auth/logout')
    .set('Cookie', `token=${token}`);

  if (res.statusCode !== 200) {
    throw new Error(`Failed to logout: ${res.body.error?.message || 'Unknown error'}`);
  }
}

/**
 * Logs in a user and returns the token
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, token: string}>} User object and auth token
 */
export async function login(email, password) {
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to login: ${res.body.error?.message || 'Unknown error'}`);
  }

  return {
    user: res.body.user,
    token: res.body.token,
  };
}

// Export app for use in integration tests
export { app };
