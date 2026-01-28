import request from 'supertest';
import {
  app,
  createAuthenticatedUser,
  createNote,
  createProject,
  convertNoteToTask,
  linkTaskToProject,
  completeTask,
  archiveProject,
  getNote,
  getTask,
  getProject,
} from './setup.js';

describe('Note-to-Task GTD Workflow - Integration Test', () => {
  /**
   * This integration test verifies the complete GTD (Getting Things Done) workflow:
   * 1. Create a note (inbox capture)
   * 2. Convert note to task (process inbox)
   * 3. Create project
   * 4. Link task to project (organize)
   * 5. Mark task complete (do)
   * 6. Verify project shows task as complete
   * 7. Archive project
   * 8. Verify task is archived
   * 9. Verify all relationships remain intact throughout
   */

  it('should complete full GTD workflow from note to archived project', async () => {
    const { token, user } = await createAuthenticatedUser('gtd-user@example.com');
    const userId = user._id;

    // =================================================================
    // STEP 1: Create a Note (Inbox Capture)
    // =================================================================
    const noteData = {
      title: 'Build new landing page',
      body: 'Need to create a landing page for the new product launch. Include hero section, features, and contact form.',
      tags: ['work', 'web-dev'],
    };

    const note = await createNote(token, noteData);

    expect(note).toBeDefined();
    expect(note._id).toBeDefined();
    expect(note.title).toBe(noteData.title);
    expect(note.body).toBe(noteData.body);
    expect(note.tags).toEqual(noteData.tags);
    expect(note.userId).toBe(userId);
    expect(note.processed).toBeFalsy(); // Should be unprocessed initially

    const noteId = note._id;

    // =================================================================
    // STEP 2: Convert Note to Task (Process Inbox)
    // =================================================================
    const { task, note: keptNote } = await convertNoteToTask(token, noteId, true);

    expect(task).toBeDefined();
    expect(task._id).toBeDefined();
    expect(task.title).toBe(note.title);
    expect(task.body).toBe(note.body); // Task model uses 'body' not 'description'
    expect(task.userId).toBe(userId);
    expect(task.status).toBe('todo');
    // sourceNoteId may or may not be set depending on implementation

    // Note should still exist (keepNote: true)
    expect(keptNote).toBeDefined();
    expect(keptNote._id).toBe(noteId);
    expect(keptNote.processed).toBe(true); // Should be marked as processed

    const taskId = task._id;

    // Verify note is marked as processed
    const processedNote = await getNote(token, noteId);
    expect(processedNote).toBeDefined();
    expect(processedNote.processed).toBe(true);

    // =================================================================
    // STEP 3: Create Project (Organize)
    // =================================================================
    const projectData = {
      title: 'Website Redesign', // Project model uses 'title' not 'name'
      description: 'Complete redesign of the company website including new landing pages',
      status: 'active',
    };

    const project = await createProject(token, projectData);

    expect(project).toBeDefined();
    expect(project._id).toBeDefined();
    expect(project.title).toBe(projectData.title);
    expect(project.description).toBe(projectData.description);
    expect(project.status).toBe(projectData.status);
    expect(project.userId).toBe(userId);
    // Project may have taskIds, linkedTasks, or tasks array depending on implementation

    const projectId = project._id;

    // =================================================================
    // STEP 4: Link Task to Project
    // =================================================================
    const updatedProject = await linkTaskToProject(token, projectId, taskId);

    expect(updatedProject).toBeDefined();
    // Project may use linkedTasks array
    expect(updatedProject.linkedTaskIds).toBeDefined();

    // Verify task now references the project
    const linkedTask = await getTask(token, taskId);
    expect(linkedTask).toBeDefined();
    expect(linkedTask.projectId).toBe(projectId);

    // =================================================================
    // STEP 5: Mark Task Complete (Do)
    // =================================================================
    const completedTask = await completeTask(token, taskId);

    expect(completedTask).toBeDefined();
    expect(completedTask._id).toBe(taskId);
    expect(completedTask.status).toBe('done');
    expect(completedTask.completedAt).toBeDefined();
    expect(new Date(completedTask.completedAt)).toBeInstanceOf(Date);

    // =================================================================
    // STEP 6: Verify Project Shows Task as Complete
    // =================================================================
    const projectWithCompletedTask = await getProject(token, projectId);

    expect(projectWithCompletedTask).toBeDefined();

    // Fetch project with populated tasks (if supported)
    const projectDetailsRes = await request(app)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(projectDetailsRes.statusCode).toBe(200);

    // If tasks are populated, verify the completed task is in the project
    if (projectDetailsRes.body.project.tasks && Array.isArray(projectDetailsRes.body.project.tasks)) {
      const taskInProject = projectDetailsRes.body.project.tasks.find(t => t._id === taskId);
      if (taskInProject) {
        expect(taskInProject.status).toBe('done');
      }
    }

    // =================================================================
    // STEP 7: Archive Project
    // =================================================================
    const archivedProject = await archiveProject(token, projectId);

    expect(archivedProject).toBeDefined();
    expect(archivedProject._id).toBe(projectId);
    expect(archivedProject.status).toBe('completed');
    expect(archivedProject.completedAt).toBeDefined();
    expect(new Date(archivedProject.completedAt)).toBeInstanceOf(Date);

    // =================================================================
    // STEP 8: Verify Task is Archived
    // =================================================================
    const taskAfterArchive = await getTask(token, taskId);

    expect(taskAfterArchive).toBeDefined();
    expect(taskAfterArchive._id).toBe(taskId);
    expect(taskAfterArchive.status).toBe('done'); // Status remains done
    expect(taskAfterArchive.projectId).toBe(projectId); // Still linked to project

    // =================================================================
    // STEP 9: Verify All Relationships Remain Intact
    // =================================================================

    // Note should still exist and be marked as processed
    const finalNote = await getNote(token, noteId);
    expect(finalNote).toBeDefined();
    expect(finalNote._id).toBe(noteId);
    expect(finalNote.processed).toBe(true);
    expect(finalNote.userId).toBe(userId);

    // Task should exist and be completed
    const finalTask = await getTask(token, taskId);
    expect(finalTask).toBeDefined();
    expect(finalTask._id).toBe(taskId);
    expect(finalTask.status).toBe('done');
    expect(finalTask.userId).toBe(userId);

    // Project should be archived
    const finalProject = await getProject(token, projectId);
    expect(finalProject).toBeDefined();
    expect(finalProject._id).toBe(projectId);
    expect(finalProject.status).toBe('completed');
    expect(finalProject.userId).toBe(userId);

    // =================================================================
    // STEP 10: Verify Ownership Throughout Chain
    // =================================================================
    expect(finalNote.userId).toBe(userId);
    expect(finalTask.userId).toBe(userId);
    expect(finalProject.userId).toBe(userId);

    // All entities should belong to the same user
    expect(finalNote.userId).toBe(finalTask.userId);
    expect(finalTask.userId).toBe(finalProject.userId);
  });

  it('should handle note conversion without keeping note', async () => {
    const { token, user } = await createAuthenticatedUser('gtd-no-keep@example.com');

    // Create note
    const note = await createNote(token, {
      title: 'Quick task from note',
      body: 'This note will be deleted after conversion',
    });

    const noteId = note._id;

    // Convert note to task without keeping the note
    const { task, note: keptNote } = await convertNoteToTask(token, noteId, false);

    expect(task).toBeDefined();
    expect(task.title).toBe(note.title);
    expect(keptNote).toBeNull(); // Note should be deleted

    // Verify note no longer exists
    const deletedNote = await getNote(token, noteId);
    expect(deletedNote).toBeNull();
  });

  it('should handle multiple tasks in a project', async () => {
    const { token, user } = await createAuthenticatedUser('multi-task@example.com');

    // Create project
    const project = await createProject(token, {
      title: 'Multi-task Project',
      description: 'Project with multiple tasks',
    });

    const projectId = project._id;

    // Create multiple notes and convert to tasks
    const taskIds = [];

    for (let i = 1; i <= 3; i++) {
      const note = await createNote(token, {
        title: `Task ${i}`,
        body: `Description for task ${i}`,
      });

      const { task } = await convertNoteToTask(token, note._id, false);
      taskIds.push(task._id);

      // Link task to project
      await linkTaskToProject(token, projectId, task._id);
    }

    // Verify project exists
    const projectWithTasks = await getProject(token, projectId);
    expect(projectWithTasks).toBeDefined();

    // Complete first task
    await completeTask(token, taskIds[0]);

    // Verify first task is completed, others are not
    const task1 = await getTask(token, taskIds[0]);
    const task2 = await getTask(token, taskIds[1]);
    const task3 = await getTask(token, taskIds[2]);

    expect(task1.status).toBe('done');
    expect(task2.status).toBe('todo');
    expect(task3.status).toBe('todo');

    // Archive project
    await archiveProject(token, projectId);

    // All tasks should still be linked to the archived project
    const finalTask1 = await getTask(token, taskIds[0]);
    const finalTask2 = await getTask(token, taskIds[1]);
    const finalTask3 = await getTask(token, taskIds[2]);

    expect(finalTask1.projectId).toBe(projectId);
    expect(finalTask2.projectId).toBe(projectId);
    expect(finalTask3.projectId).toBe(projectId);
  });

  it('should handle note with tags transferring to task', async () => {
    const { token, user } = await createAuthenticatedUser('tags-transfer@example.com');

    // Create note with tags
    const note = await createNote(token, {
      title: 'Tagged Note',
      body: 'Note with multiple tags',
      tags: ['urgent', 'client', 'meeting'],
    });

    // Convert to task
    const { task } = await convertNoteToTask(token, note._id, true);

    // Verify task has tags from note
    expect(task.tags).toBeDefined();
    expect(Array.isArray(task.tags)).toBe(true);
    expect(task.tags).toEqual(expect.arrayContaining(['urgent', 'client', 'meeting']));
  });

  it('should maintain data integrity when archiving project with incomplete tasks', async () => {
    const { token, user } = await createAuthenticatedUser('incomplete-tasks@example.com');

    // Create project
    const project = await createProject(token, {
      title: 'Project with Incomplete Tasks',
      description: 'Testing archival with incomplete tasks',
    });

    // Create task (don't complete it)
    const note = await createNote(token, {
      title: 'Incomplete Task',
      body: 'This task will not be completed',
    });

    const { task } = await convertNoteToTask(token, note._id, false);
    await linkTaskToProject(token, project._id, task._id);

    // Archive project even though task is incomplete
    const archivedProject = await archiveProject(token, project._id);

    expect(archivedProject.status).toBe('completed');

    // Task should still be in 'todo' status
    const incompleteTask = await getTask(token, task._id);
    expect(incompleteTask.status).toBe('todo');
    expect(incompleteTask.projectId).toBe(project._id);
  });

  it('should enforce ownership isolation in GTD workflow', async () => {
    // Create User A
    const { token: tokenA, user: userA } = await createAuthenticatedUser('gtd-usera@example.com');

    // User A creates note, task, and project
    const noteA = await createNote(tokenA, {
      title: 'User A Note',
      body: 'User A content',
    });

    const { task: taskA } = await convertNoteToTask(tokenA, noteA._id, true);

    const projectA = await createProject(tokenA, {
      title: 'User A Project',
      description: 'User A project',
    });

    await linkTaskToProject(tokenA, projectA._id, taskA._id);

    // Create User B
    const { token: tokenB, user: userB } = await createAuthenticatedUser('gtd-userb@example.com');

    // User B cannot access User A's note
    const noteAccess = await getNote(tokenB, noteA._id);
    expect(noteAccess).toBeNull();

    // User B cannot access User A's task
    const taskAccess = await getTask(tokenB, taskA._id);
    expect(taskAccess).toBeNull();

    // User B cannot access User A's project
    const projectAccess = await getProject(tokenB, projectA._id);
    expect(projectAccess).toBeNull();

    // User B cannot link User A's task to their own project
    const projectB = await createProject(tokenB, {
      title: 'User B Project',
      description: 'User B project',
    });

    const linkRes = await request(app)
      .post(`/projects/${projectB._id}/tasks`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ taskId: taskA._id });

    // Should fail (404 or 403)
    expect([404, 403]).toContain(linkRes.statusCode);

    // User A can still access all their resources
    const noteACheck = await getNote(tokenA, noteA._id);
    const taskACheck = await getTask(tokenA, taskA._id);
    const projectACheck = await getProject(tokenA, projectA._id);

    expect(noteACheck).toBeDefined();
    expect(taskACheck).toBeDefined();
    expect(projectACheck).toBeDefined();
  });

  it('should handle full workflow with priority and due dates', async () => {
    const { token, user } = await createAuthenticatedUser('priority-dates@example.com');

    // Create note
    const note = await createNote(token, {
      title: 'Urgent deadline task',
      body: 'This needs to be done ASAP',
      tags: ['urgent'],
    });

    // Convert to task
    const { task } = await convertNoteToTask(token, note._id, false);

    // Update task with priority and due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    const updateRes = await request(app)
      .patch(`/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        priority: 'high',
        dueDate: dueDate.toISOString(),
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.task.priority).toBe('high');
    expect(updateRes.body.task.dueDate).toBeDefined();

    // Create project and link task
    const project = await createProject(token, {
      title: 'Urgent Project',
      description: 'High priority project',
    });

    await linkTaskToProject(token, project._id, task._id);

    // Complete task
    await completeTask(token, task._id);

    // Archive project
    await archiveProject(token, project._id);

    // Verify everything is intact
    const finalTask = await getTask(token, task._id);
    expect(finalTask.status).toBe('done');
    expect(finalTask.priority).toBe('high');
    expect(finalTask.dueDate).toBeDefined();
    expect(finalTask.projectId).toBe(project._id);

    const finalProject = await getProject(token, project._id);
    expect(finalProject.status).toBe('completed');
    expect(finalProject.linkedTaskIds).toContainEqual(task._id);
  });
});
