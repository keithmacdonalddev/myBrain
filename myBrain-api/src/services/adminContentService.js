import mongoose from 'mongoose';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Image from '../models/Image.js';
import Log from '../models/Log.js';
import User from '../models/User.js';

/**
 * Get content counts for a user
 */
export async function getUserContentCounts(userId) {
  const [notesCount, tasksCount, projectsCount, imagesCount] = await Promise.all([
    Note.countDocuments({ userId }),
    Task.countDocuments({ userId }),
    Project.countDocuments({ userId }),
    Image.countDocuments({ userId })
  ]);

  return {
    notes: notesCount,
    tasks: tasksCount,
    projects: projectsCount,
    images: imagesCount,
    total: notesCount + tasksCount + projectsCount + imagesCount
  };
}

/**
 * Get user's notes
 */
export async function getUserNotes(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const notes = await Note.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('title content status isPinned createdAt updatedAt tags');

  const total = await Note.countDocuments(query);

  return {
    notes: notes.map(n => ({
      _id: n._id,
      title: n.title,
      contentPreview: n.content?.substring(0, 200),
      status: n.status,
      isPinned: n.isPinned,
      tags: n.tags,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    })),
    total
  };
}

/**
 * Get user's tasks
 */
export async function getUserTasks(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const tasks = await Task.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('title description status priority dueDate createdAt updatedAt tags');

  const total = await Task.countDocuments(query);

  return {
    tasks: tasks.map(t => ({
      _id: t._id,
      title: t.title,
      descriptionPreview: t.description?.substring(0, 200),
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      tags: t.tags,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    })),
    total
  };
}

/**
 * Get user's projects
 */
export async function getUserProjects(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const projects = await Project.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('name description status priority startDate endDate createdAt updatedAt');

  const total = await Project.countDocuments(query);

  return {
    projects: projects.map(p => ({
      _id: p._id,
      name: p.name,
      descriptionPreview: p.description?.substring(0, 200),
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })),
    total
  };
}

/**
 * Get user's images
 */
export async function getUserImages(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  const query = { userId };

  const images = await Image.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('filename originalName mimeType size url thumbnailUrl alt createdAt');

  const total = await Image.countDocuments(query);

  return {
    images: images.map(i => ({
      _id: i._id,
      filename: i.filename,
      originalName: i.originalName,
      mimeType: i.mimeType,
      size: i.size,
      url: i.url,
      thumbnailUrl: i.thumbnailUrl,
      alt: i.alt,
      createdAt: i.createdAt
    })),
    total
  };
}

/**
 * Get user's activity timeline from logs
 */
export async function getUserActivityTimeline(userId, options = {}) {
  const { from, to, limit = 50 } = options;

  // Convert userId to ObjectId if it's a string
  const userObjectId = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const query = { userId: userObjectId };

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const logs = await Log.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('eventName route method statusCode timestamp durationMs userAgent');

  // Group activities by day
  const grouped = {};
  logs.forEach(log => {
    const day = log.timestamp.toISOString().split('T')[0];
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push({
      _id: log._id,
      eventName: log.eventName,
      route: log.route,
      method: log.method,
      statusCode: log.statusCode,
      timestamp: log.timestamp,
      durationMs: log.durationMs
    });
  });

  // Convert to array format
  const timeline = Object.entries(grouped).map(([date, activities]) => ({
    date,
    activities,
    count: activities.length
  }));

  return {
    timeline,
    total: logs.length
  };
}

/**
 * Get user activity summary stats
 */
export async function getUserActivityStats(userId, options = {}) {
  const { days = 30 } = options;

  // Convert userId to ObjectId if it's a string
  const userObjectId = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    totalRequests,
    contentCreated,
    contentUpdated,
    logins
  ] = await Promise.all([
    Log.countDocuments({
      userId: userObjectId,
      timestamp: { $gte: since }
    }),
    Log.countDocuments({
      userId: userObjectId,
      method: 'POST',
      statusCode: { $lt: 400 },
      timestamp: { $gte: since }
    }),
    Log.countDocuments({
      userId: userObjectId,
      method: 'PATCH',
      statusCode: { $lt: 400 },
      timestamp: { $gte: since }
    }),
    Log.countDocuments({
      userId: userObjectId,
      eventName: 'auth_login',
      statusCode: 200,
      timestamp: { $gte: since }
    })
  ]);

  return {
    period: `${days} days`,
    totalRequests,
    contentCreated,
    contentUpdated,
    logins
  };
}

/**
 * Get all user content (combined endpoint)
 */
export async function getUserContent(userId, options = {}) {
  const { type = 'all', limit = 20, skip = 0, status } = options;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const counts = await getUserContentCounts(userId);

  let content = {};

  switch (type) {
    case 'notes':
      content = await getUserNotes(userId, { limit, skip, status });
      break;
    case 'tasks':
      content = await getUserTasks(userId, { limit, skip, status });
      break;
    case 'projects':
      content = await getUserProjects(userId, { limit, skip, status });
      break;
    case 'images':
      content = await getUserImages(userId, { limit, skip });
      break;
    case 'all':
    default:
      // Return counts only for 'all' type
      content = { type: 'summary' };
      break;
  }

  return {
    userId,
    counts,
    ...content
  };
}

export default {
  getUserContentCounts,
  getUserNotes,
  getUserTasks,
  getUserProjects,
  getUserImages,
  getUserActivityTimeline,
  getUserActivityStats,
  getUserContent
};
