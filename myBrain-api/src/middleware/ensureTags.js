import Tag from '../models/Tag.js';

/**
 * Default tags to create for new users
 * Organized by purpose with distinct colors
 */
const DEFAULT_TAGS = [
  // Priority & Status (Red/Orange spectrum)
  { name: 'urgent', color: '#ef4444' },
  { name: 'important', color: '#f97316' },
  { name: 'blocked', color: '#dc2626' },
  { name: 'in-progress', color: '#eab308' },
  { name: 'review', color: '#f59e0b' },
  { name: 'done', color: '#22c55e' },

  // Time-related (Blue spectrum)
  { name: 'today', color: '#3b82f6' },
  { name: 'this-week', color: '#6366f1' },
  { name: 'someday', color: '#8b5cf6' },
  { name: 'recurring', color: '#a855f7' },
  { name: 'deadline', color: '#ec4899' },

  // Work & Productivity (Teal/Cyan spectrum)
  { name: 'meeting', color: '#14b8a6' },
  { name: 'follow-up', color: '#06b6d4' },
  { name: 'client', color: '#0891b2' },
  { name: 'project', color: '#0d9488' },
  { name: 'email', color: '#2dd4bf' },

  // Content & Ideas (Green spectrum)
  { name: 'idea', color: '#84cc16' },
  { name: 'research', color: '#22c55e' },
  { name: 'reference', color: '#10b981' },
  { name: 'draft', color: '#34d399' },
  { name: 'template', color: '#4ade80' },

  // Personal & Goals (Purple/Pink spectrum)
  { name: 'goal', color: '#d946ef' },
  { name: 'reminder', color: '#c026d3' },
  { name: 'habit', color: '#a21caf' },
  { name: 'learning', color: '#9333ea' },
  { name: 'personal', color: '#7c3aed' },

  // Organization (Gray/Neutral spectrum)
  { name: 'archive', color: '#6b7280' },
  { name: 'later', color: '#9ca3af' },
  { name: 'maybe', color: '#a3a3a3' },
  { name: 'waiting', color: '#78716c' },
  { name: 'delegated', color: '#71717a' },
];

/**
 * Middleware to ensure user has default tags
 * Should be used after requireAuth middleware
 */
export async function ensureTags(req, res, next) {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user has any tags
    const count = await Tag.countDocuments({ userId: req.user._id });

    if (count === 0) {
      // Create default tags for the user
      const tags = DEFAULT_TAGS.map(tag => ({
        userId: req.user._id,
        name: tag.name.toLowerCase(),
        color: tag.color,
        usageCount: 0,
        isActive: true,
        lastUsed: new Date()
      }));

      await Tag.insertMany(tags);
    }

    next();
  } catch (error) {
    console.error('Error ensuring tags:', error);
    // Don't block the request if this fails
    next();
  }
}

export default ensureTags;
