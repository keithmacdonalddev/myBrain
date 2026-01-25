import request from 'supertest';
import {
  app,
  createAuthenticatedUser,
  createNote,
  createTask,
  getNote,
  getTask,
  logout,
  login,
} from './setup.js';

describe('User Registration Flow - Integration Test', () => {
  /**
   * This integration test verifies the complete user registration and data persistence workflow:
   * 1. User registers
   * 2. User logs in
   * 3. User creates content (note and task)
   * 4. User logs out
   * 5. User logs back in
   * 6. Verify all content is still accessible
   * 7. Verify ownership is correct throughout
   */

  it('should complete full user registration and data persistence workflow', async () => {
    const email = 'integration-test@example.com';
    const password = 'SecurePassword123!';

    // =================================================================
    // STEP 1: Register User
    // =================================================================
    const registerRes = await request(app)
      .post('/auth/register')
      .send({ email, password });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.message).toBe('Account created successfully');
    expect(registerRes.body.user).toBeDefined();
    expect(registerRes.body.user.email).toBe(email);
    expect(registerRes.body.user.role).toBeDefined(); // Could be 'user' or 'free' depending on implementation
    expect(registerRes.body.user.passwordHash).toBeUndefined();

    const userId = registerRes.body.user._id;

    // =================================================================
    // STEP 2: Login
    // =================================================================
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email, password });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.message).toBe('Login successful');
    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.user.email).toBe(email);
    expect(loginRes.body.token).toBeDefined();
    expect(typeof loginRes.body.token).toBe('string');
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const authToken = loginRes.body.token;

    // =================================================================
    // STEP 3: Verify /auth/me returns correct user
    // =================================================================
    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user._id).toBe(userId);
    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.passwordHash).toBeUndefined();

    // =================================================================
    // STEP 4: Create a Note
    // =================================================================
    const noteData = {
      title: 'My First Note',
      body: 'This is a test note created during registration flow.',
      tags: ['test', 'integration'],
    };

    const note = await createNote(authToken, noteData);

    expect(note).toBeDefined();
    expect(note._id).toBeDefined();
    expect(note.title).toBe(noteData.title);
    expect(note.body).toBe(noteData.body);
    expect(note.tags).toEqual(noteData.tags);
    expect(note.userId).toBe(userId);

    const noteId = note._id;

    // =================================================================
    // STEP 5: Create a Task
    // =================================================================
    const taskData = {
      title: 'My First Task',
      body: 'This is a test task created during registration flow.', // Task model uses 'body' not 'description'
      priority: 'high',
      status: 'todo',
    };

    const task = await createTask(authToken, taskData);

    expect(task).toBeDefined();
    expect(task._id).toBeDefined();
    expect(task.title).toBe(taskData.title);
    expect(task.body).toBe(taskData.body);
    expect(task.priority).toBe(taskData.priority);
    expect(task.status).toBe(taskData.status);
    expect(task.userId).toBe(userId);

    const taskId = task._id;

    // =================================================================
    // STEP 6: Verify note exists via GET
    // =================================================================
    const fetchedNote = await getNote(authToken, noteId);

    expect(fetchedNote).toBeDefined();
    expect(fetchedNote._id).toBe(noteId);
    expect(fetchedNote.title).toBe(noteData.title);
    expect(fetchedNote.userId).toBe(userId);

    // =================================================================
    // STEP 7: Verify task exists via GET
    // =================================================================
    const fetchedTask = await getTask(authToken, taskId);

    expect(fetchedTask).toBeDefined();
    expect(fetchedTask._id).toBe(taskId);
    expect(fetchedTask.title).toBe(taskData.title);
    expect(fetchedTask.userId).toBe(userId);

    // =================================================================
    // STEP 8: Logout
    // =================================================================
    await logout(authToken);

    // Verify /auth/me no longer works without token
    const meAfterLogoutRes = await request(app).get('/auth/me');

    expect(meAfterLogoutRes.statusCode).toBe(401);
    expect(meAfterLogoutRes.body.code).toBe('NO_TOKEN');

    // =================================================================
    // STEP 9: Login Again
    // =================================================================
    const { token: newAuthToken, user: loggedInUser } = await login(email, password);

    expect(newAuthToken).toBeDefined();
    expect(loggedInUser).toBeDefined();
    expect(loggedInUser._id).toBe(userId);
    expect(loggedInUser.email).toBe(email);

    // =================================================================
    // STEP 10: Verify note still exists after re-login
    // =================================================================
    const noteAfterRelogin = await getNote(newAuthToken, noteId);

    expect(noteAfterRelogin).toBeDefined();
    expect(noteAfterRelogin._id).toBe(noteId);
    expect(noteAfterRelogin.title).toBe(noteData.title);
    expect(noteAfterRelogin.body).toBe(noteData.body);
    expect(noteAfterRelogin.tags).toEqual(noteData.tags);
    expect(noteAfterRelogin.userId).toBe(userId);

    // =================================================================
    // STEP 11: Verify task still exists after re-login
    // =================================================================
    const taskAfterRelogin = await getTask(newAuthToken, taskId);

    expect(taskAfterRelogin).toBeDefined();
    expect(taskAfterRelogin._id).toBe(taskId);
    expect(taskAfterRelogin.title).toBe(taskData.title);
    expect(taskAfterRelogin.body).toBe(taskData.body);
    expect(taskAfterRelogin.priority).toBe(taskData.priority);
    expect(taskAfterRelogin.status).toBe(taskData.status);
    expect(taskAfterRelogin.userId).toBe(userId);

    // =================================================================
    // STEP 12: Verify ownership is correct
    // =================================================================
    // All entities should belong to the same user
    expect(noteAfterRelogin.userId).toBe(userId);
    expect(taskAfterRelogin.userId).toBe(userId);

    // =================================================================
    // STEP 13: List all notes - should include our note
    // =================================================================
    const listNotesRes = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${newAuthToken}`);

    expect(listNotesRes.statusCode).toBe(200);
    expect(listNotesRes.body.notes).toBeDefined();
    expect(Array.isArray(listNotesRes.body.notes)).toBe(true);
    expect(listNotesRes.body.notes.length).toBeGreaterThan(0);

    const foundNote = listNotesRes.body.notes.find(n => n._id === noteId);
    expect(foundNote).toBeDefined();
    expect(foundNote.title).toBe(noteData.title);

    // =================================================================
    // STEP 14: List all tasks - should include our task
    // =================================================================
    const listTasksRes = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${newAuthToken}`);

    expect(listTasksRes.statusCode).toBe(200);
    expect(listTasksRes.body.tasks).toBeDefined();
    expect(Array.isArray(listTasksRes.body.tasks)).toBe(true);
    expect(listTasksRes.body.tasks.length).toBeGreaterThan(0);

    const foundTask = listTasksRes.body.tasks.find(t => t._id === taskId);
    expect(foundTask).toBeDefined();
    expect(foundTask.title).toBe(taskData.title);

    // =================================================================
    // FINAL VERIFICATION: Update content after re-login
    // =================================================================
    // Update the note
    const updatedNoteTitle = 'Updated Note Title After Re-login';
    const updateNoteRes = await request(app)
      .patch(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${newAuthToken}`)
      .send({ title: updatedNoteTitle });

    expect(updateNoteRes.statusCode).toBe(200);
    expect(updateNoteRes.body.note.title).toBe(updatedNoteTitle);
    expect(updateNoteRes.body.note.userId).toBe(userId);

    // Update the task
    const updatedTaskTitle = 'Updated Task Title After Re-login';
    const updateTaskRes = await request(app)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${newAuthToken}`)
      .send({ title: updatedTaskTitle });

    expect(updateTaskRes.statusCode).toBe(200);
    expect(updateTaskRes.body.task.title).toBe(updatedTaskTitle);
    expect(updateTaskRes.body.task.userId).toBe(userId);

    // Fetch again to verify updates persisted
    const finalNote = await getNote(newAuthToken, noteId);
    const finalTask = await getTask(newAuthToken, taskId);

    expect(finalNote.title).toBe(updatedNoteTitle);
    expect(finalTask.title).toBe(updatedTaskTitle);
  });

  it('should enforce user isolation - User B cannot access User A content', async () => {
    // Create User A
    const { token: tokenA, user: userA } = await createAuthenticatedUser('usera@example.com');

    // User A creates a note
    const noteA = await createNote(tokenA, {
      title: 'User A Private Note',
      body: 'This belongs to User A',
    });

    // User A creates a task
    const taskA = await createTask(tokenA, {
      title: 'User A Private Task',
      body: 'This belongs to User A',
    });

    // Create User B
    const { token: tokenB, user: userB } = await createAuthenticatedUser('userb@example.com');

    // Verify users are different
    expect(userA._id).not.toBe(userB._id);

    // User B tries to access User A's note - should get 404
    const accessNoteRes = await request(app)
      .get(`/notes/${noteA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(accessNoteRes.statusCode).toBe(404);

    // User B tries to access User A's task - should get 404
    const accessTaskRes = await request(app)
      .get(`/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(accessTaskRes.statusCode).toBe(404);

    // User B tries to update User A's note - should get 404
    const updateNoteRes = await request(app)
      .patch(`/notes/${noteA._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Hacked Title' });

    expect(updateNoteRes.statusCode).toBe(404);

    // User B tries to delete User A's task - should get 404
    const deleteTaskRes = await request(app)
      .delete(`/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(deleteTaskRes.statusCode).toBe(404);

    // User B lists notes - should not see User A's note
    const listNotesRes = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(listNotesRes.statusCode).toBe(200);
    const foundNote = listNotesRes.body.notes.find(n => n._id === noteA._id);
    expect(foundNote).toBeUndefined();

    // User B lists tasks - should not see User A's task
    const listTasksRes = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(listTasksRes.statusCode).toBe(200);
    const foundTask = listTasksRes.body.tasks.find(t => t._id === taskA._id);
    expect(foundTask).toBeUndefined();

    // User A can still access their own content
    const userANote = await getNote(tokenA, noteA._id);
    const userATask = await getTask(tokenA, taskA._id);

    expect(userANote).toBeDefined();
    expect(userANote._id).toBe(noteA._id);
    expect(userATask).toBeDefined();
    expect(userATask._id).toBe(taskA._id);
  });
});
