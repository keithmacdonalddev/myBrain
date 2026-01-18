import Project from '../models/Project.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Event from '../models/Event.js';
import Tag from '../models/Tag.js';

/**
 * Project Service
 * Business logic for project operations
 */

/**
 * Create a new project
 */
export async function createProject(userId, data) {
  const tags = data.tags || [];

  const project = new Project({
    userId,
    title: data.title,
    description: data.description || '',
    outcome: data.outcome || '',
    status: data.status || 'active',
    priority: data.priority || 'medium',
    deadline: data.deadline || null,
    lifeAreaId: data.lifeAreaId || null,
    tags,
    color: data.color || null,
    pinned: data.pinned || false
  });

  await project.save();

  // Track tag usage
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  return project;
}

/**
 * Get projects for a user with search/filter options
 */
export async function getProjects(userId, options = {}) {
  return Project.searchProjects(userId, options);
}

/**
 * Get a single project by ID with linked items
 */
export async function getProjectById(userId, projectId, populateLinks = false) {
  let project = await Project.findOne({ _id: projectId, userId })
    .populate('lifeAreaId', 'name color icon');

  if (!project) return null;

  if (populateLinks) {
    // Populate linked items
    const [notes, tasks, events] = await Promise.all([
      Note.find({ _id: { $in: project.linkedNoteIds } }),
      Task.find({ _id: { $in: project.linkedTaskIds } }),
      Event.find({ _id: { $in: project.linkedEventIds } })
    ]);

    const projectObj = project.toSafeJSON();
    projectObj.linkedNotes = notes.map(n => n.toSafeJSON());
    projectObj.linkedTasks = tasks.map(t => t.toSafeJSON());
    projectObj.linkedEvents = events.map(e => e.toObject());

    return projectObj;
  }

  return project;
}

/**
 * Update a project
 */
export async function updateProject(userId, projectId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.userId;
  delete updates.createdAt;
  delete updates.progress; // Calculated automatically

  // If status is being changed to completed, set completedAt
  if (updates.status === 'completed') {
    updates.completedAt = new Date();
  } else if (updates.status && updates.status !== 'completed') {
    updates.completedAt = null;
  }

  // Track tag changes
  let oldTags = [];
  if (updates.tags) {
    const existingProject = await Project.findOne({ _id: projectId, userId });
    if (existingProject) {
      oldTags = existingProject.tags || [];
    }
  }

  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('lifeAreaId', 'name color icon');

  // Track new tags and decrement removed tags
  if (updates.tags && project) {
    const newTags = updates.tags || [];
    const addedTags = newTags.filter(t => !oldTags.includes(t));
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    if (addedTags.length > 0) {
      await Tag.trackUsage(userId, addedTags);
    }
    if (removedTags.length > 0) {
      await Tag.decrementUsage(userId, removedTags);
    }
  }

  return project;
}

/**
 * Update project status (quick status change)
 */
export async function updateProjectStatus(userId, projectId, status) {
  const updates = { status };

  if (status === 'completed') {
    updates.completedAt = new Date();
  } else {
    updates.completedAt = null;
  }

  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { $set: updates },
    { new: true }
  ).populate('lifeAreaId', 'name color icon');

  return project;
}

/**
 * Delete a project
 * Unlinks items but doesn't delete them
 */
export async function deleteProject(userId, projectId) {
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) return null;

  // Unlink all items
  await Promise.all([
    Note.updateMany(
      { _id: { $in: project.linkedNoteIds } },
      { projectId: null }
    ),
    Task.updateMany(
      { _id: { $in: project.linkedTaskIds } },
      { projectId: null }
    ),
    Event.updateMany(
      { _id: { $in: project.linkedEventIds } },
      { projectId: null }
    )
  ]);

  // Decrement tag usage
  if (project.tags.length > 0) {
    await Tag.decrementUsage(userId, project.tags);
  }

  await Project.findByIdAndDelete(projectId);

  return project;
}

/**
 * Link a note to a project
 */
export async function linkNote(userId, projectId, noteId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  await project.linkNote(noteId);
  return project;
}

/**
 * Unlink a note from a project
 */
export async function unlinkNote(userId, projectId, noteId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  await project.unlinkNote(noteId);
  return project;
}

/**
 * Link a task to a project
 */
export async function linkTask(userId, projectId, taskId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  await project.linkTask(taskId);
  return project;
}

/**
 * Unlink a task from a project
 */
export async function unlinkTask(userId, projectId, taskId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  await project.unlinkTask(taskId);
  return project;
}

/**
 * Link an event to a project
 */
export async function linkEvent(userId, projectId, eventId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const event = await Event.findOne({ _id: eventId, userId });
  if (!event) return null;

  await project.linkEvent(eventId);
  return project;
}

/**
 * Unlink an event from a project
 */
export async function unlinkEvent(userId, projectId, eventId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  await project.unlinkEvent(eventId);
  return project;
}

/**
 * Recalculate project progress
 * Called when linked tasks change status
 */
export async function recalculateProgress(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;

  await project.updateProgress();
  return project;
}

/**
 * Get projects with upcoming deadlines
 */
export async function getUpcomingProjects(userId, days = 7) {
  return Project.getUpcoming(userId, days);
}

/**
 * Get overdue projects
 */
export async function getOverdueProjects(userId) {
  return Project.getOverdue(userId);
}

/**
 * Get all unique tags used in projects by a user
 */
export async function getUserProjectTags(userId) {
  return Project.getUserTags(userId);
}

/**
 * Update project progress when a task status changes
 */
export async function onTaskStatusChange(taskId) {
  // Find project that has this task linked
  const project = await Project.findOne({ linkedTaskIds: taskId });
  if (project) {
    await project.updateProgress();
  }
}

export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  linkNote,
  unlinkNote,
  linkTask,
  unlinkTask,
  linkEvent,
  unlinkEvent,
  recalculateProgress,
  getUpcomingProjects,
  getOverdueProjects,
  getUserProjectTags,
  onTaskStatusChange
};
