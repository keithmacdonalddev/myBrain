import LifeArea from '../models/LifeArea.js';

/**
 * Middleware to ensure user has at least a default life area
 * Should be used after requireAuth middleware
 */
export async function ensureLifeAreas(req, res, next) {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user has any life areas
    const count = await LifeArea.countDocuments({ userId: req.user._id });

    if (count === 0) {
      // Create default life area for the user
      await LifeArea.create({
        userId: req.user._id,
        name: 'Uncategorized',
        description: 'Default area for uncategorized items',
        icon: 'Inbox',
        isDefault: true,
        order: 0
      });
    }

    next();
  } catch (error) {
    console.error('Error ensuring life areas:', error);
    // Don't block the request if this fails
    next();
  }
}

export default ensureLifeAreas;
